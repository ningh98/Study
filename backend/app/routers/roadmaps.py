from dotenv import load_dotenv
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from google  import genai
import json
from datetime import datetime
from pydantic import BaseModel, Field
from app import models, schema, db
from typing import List,Optional

load_dotenv()

class QuestionAI(BaseModel):
    question: str
    options: list[str]
    correct: int

class RoadmapItemAI(BaseModel):
    title: str
    summary: str
    level: int
    study_material: list[str]
    questions: list[QuestionAI]

class RoadmapDataAI(BaseModel):
    items: list[RoadmapItemAI]

router = APIRouter(prefix="/api/roadmaps")

GEMINI_API_KEY=os.getenv("GEMINI_API_KEY")
# Use the updated SDK
client = genai.Client(api_key=GEMINI_API_KEY)


@router.post("/generate", response_model=schema.RoadmapResponse)
async def generate_roadmap(request: schema.RoadmapCreate, db_conn: Session = Depends(db.get_db)):
    print(f"GEMINI_API_KEY loaded: {GEMINI_API_KEY[:-10]}...")  # Debug
    
    prompt = f"""
    Generate a personalized learning roadmap for someone who wants to learn: {request.topic}
    
    Their experience: {request.experience}
    
    Create a roadmap with 3 difficulty levels (Beginner, Intermediate, Advanced).
    If the concept is based on the prerequisites, the last level will be the topic, previous level will be those prerequisites.
    Keep the number of items to 3 for now.
    
    For EACH roadmap item, also generate 4 quiz questions to test understanding of that topic.
    Each question should have 4 options with one correct answer.
    
    Return as JSON with this structure:
    {{
      "items": [
        {{
          "title": "Topic Name",
          "summary": "Brief description", 
          "level": 1,
          "study_material": ["link1", "link2"],
          "questions": [
            {{
              "question": "Question text?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "correct": 0
            }}
          ]
        }}
      ]
    }}
    """
    
    # Use updated API
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config={
            "response_mime_type": "application/json",
            "response_schema": RoadmapDataAI.model_json_schema(),
        }
    )
    roadmap_data = response.parsed
    
    # Save to database (same as before)
    db_roadmap = models.Roadmap(
        topic=request.topic,
        experience=request.experience,
        created_at=datetime.now().isoformat()
    )
    db_conn.add(db_roadmap)
    db_conn.commit()
    db_conn.refresh(db_roadmap)
    
    # Invalidate knowledge graph cache since we're adding new data
    db_conn.query(models.KnowledgeGraphCache).delete()
    
    for item_data in roadmap_data["items"]:
        # Create roadmap item
        db_item = models.RoadmapItem(
            roadmap_id=db_roadmap.id,
            title=item_data["title"],
            summary=item_data["summary"],
            level=item_data["level"],
            study_material=json.dumps(item_data["study_material"])
        )
        db_conn.add(db_item)
        db_conn.flush()  # Get the item ID without committing
        
        # Create quiz questions for this item
        for question_data in item_data["questions"]:
            db_question = models.QuizQuestion(
                roadmap_item_id=db_item.id,
                question=question_data["question"],
                options=json.dumps(question_data["options"]),
                correct=question_data["correct"]
            )
            db_conn.add(db_question)
    
    db_conn.commit()
    
    return {
        "id": db_roadmap.id,
        "topic": db_roadmap.topic,
        "experience": db_roadmap.experience,
        "items": roadmap_data["items"]
    }

@router.get("/", response_model=List[schema.RoadmapResponse])
async def get_roadmaps(db_conn: Session = Depends(db.get_db)):
    
    roadmaps = db_conn.query(models.Roadmap).all()
    result = []
    
    for roadmap in roadmaps:
        items = db_conn.query(models.RoadmapItem).filter(
            models.RoadmapItem.roadmap_id == roadmap.id
        ).all()
        
        result.append({
            "id": roadmap.id,
            "topic": roadmap.topic,
            "experience": roadmap.experience,
            "items": [
                {
                    "id": item.id,
                    "title": item.title,
                    "summary": item.summary,
                    "level": item.level,
                    "study_material": json.loads(item.study_material)
                }
                for item in items
            ]
        })
    
    return result


@router.delete("/{roadmap_id}")
async def delete_roadmap(roadmap_id: int, db_conn: Session = Depends(db.get_db)):
    """Delete a roadmap and all its associated items and questions."""
    
    # Check if roadmap exists
    roadmap = db_conn.query(models.Roadmap).filter(models.Roadmap.id == roadmap_id).first()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    try:
        # Get all roadmap items for this roadmap
        roadmap_items = db_conn.query(models.RoadmapItem).filter(
            models.RoadmapItem.roadmap_id == roadmap_id
        ).all()
        
        # Get roadmap item IDs to delete associated quiz questions
        item_ids = [item.id for item in roadmap_items]
        
        # Delete quiz questions associated with these items
        if item_ids:
            db_conn.query(models.QuizQuestion).filter(
                models.QuizQuestion.roadmap_item_id.in_(item_ids)
            ).delete(synchronize_session=False)
        
        # Delete roadmap items
        db_conn.query(models.RoadmapItem).filter(
            models.RoadmapItem.roadmap_id == roadmap_id
        ).delete(synchronize_session=False)
        
        # Delete the roadmap itself
        db_conn.delete(roadmap)
        
        # Invalidate knowledge graph cache since we're removing data
        db_conn.query(models.KnowledgeGraphCache).delete()
        
        # Commit all changes
        db_conn.commit()
        
        return {"message": f"Roadmap {roadmap_id} successfully deleted"}
    
    except Exception as e:
        db_conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete roadmap: {str(e)}")
