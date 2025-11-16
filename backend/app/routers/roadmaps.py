from dotenv import load_dotenv
import os
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from google  import genai
import json
from datetime import datetime
from pydantic import BaseModel, Field
from app import models, schema, db
from typing import List, Optional
from app.routers import knowledge_graph

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
    
    # Incrementally add this roadmap to the knowledge graph
    await knowledge_graph.add_roadmap_to_graph(db_roadmap.id, db_conn)
    
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
        
        # Get roadmap item IDs to delete associated quiz questions and progress
        item_ids = [item.id for item in roadmap_items]
        
        # Delete quiz questions associated with these items
        if item_ids:
            db_conn.query(models.QuizQuestion).filter(
                models.QuizQuestion.roadmap_item_id.in_(item_ids)
            ).delete(synchronize_session=False)
            
            # Delete quiz progress for these items
            db_conn.query(models.QuizProgress).filter(
                models.QuizProgress.roadmap_item_id.in_(item_ids)
            ).delete(synchronize_session=False)
        
        # Delete roadmap items
        db_conn.query(models.RoadmapItem).filter(
            models.RoadmapItem.roadmap_id == roadmap_id
        ).delete(synchronize_session=False)
        
        # Delete the roadmap itself
        db_conn.delete(roadmap)
        
        # Commit all changes
        db_conn.commit()
        
        # Incrementally remove this roadmap from the knowledge graph
        await knowledge_graph.remove_roadmap_from_graph(roadmap_id, db_conn)
        
        return {"message": f"Roadmap {roadmap_id} successfully deleted"}
    
    except Exception as e:
        db_conn.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete roadmap: {str(e)}")


class TopicSuggestion(BaseModel):
    topic: str
    reason: str
    suggestion_type: str  # "related", "deep_dive", "adjacent"
    description: str

class DiscoveryResponse(BaseModel):
    suggestions: List[TopicSuggestion]
    completed_topics: List[str]
    turtle_message: str


@router.post("/discover")
async def discover_topics(
    user_id: str = "default_user",
    db_conn: Session = Depends(db.get_db)
):
    """
    AI-powered topic discovery based on completed topics.
    Analyzes user's learning journey and suggests new topics to explore.
    
    Query parameters:
    - user_id: User identifier (defaults to "default_user")
    
    Returns:
    - 3 curated topic suggestions (related, advanced, adjacent)
    - Personalized turtle guide message
    """
    # Get user's completed topics
    completed_progress = db_conn.query(models.QuizProgress).filter(
        models.QuizProgress.user_id == user_id,
        models.QuizProgress.score == models.QuizProgress.total_questions
    ).all()
    
    if not completed_progress:
        raise HTTPException(status_code=400, detail="No completed topics yet")
    
    # Get completed item details
    item_ids = [p.roadmap_item_id for p in completed_progress]
    completed_items = db_conn.query(models.RoadmapItem).filter(
        models.RoadmapItem.id.in_(item_ids)
    ).all()
    
    # Get roadmap topics
    roadmap_ids = list(set([item.roadmap_id for item in completed_items]))
    roadmaps = db_conn.query(models.Roadmap).filter(
        models.Roadmap.id.in_(roadmap_ids)
    ).all()
    
    # Build completed topics list
    completed_topics_data = []
    for item in completed_items:
        roadmap = next((r for r in roadmaps if r.id == item.roadmap_id), None)
        if roadmap:
            completed_topics_data.append({
                "title": item.title,
                "roadmap_topic": roadmap.topic,
                "level": item.level,
                "summary": item.summary
            })
    
    # Get existing graph connections for context
    graph_nodes = db_conn.query(models.KnowledgeGraphNode).filter(
        models.KnowledgeGraphNode.node_type == "title"
    ).all()
    
    graph_edges = db_conn.query(models.KnowledgeGraphEdge).all()
    
    # Create AI prompt for discovery
    discovery_prompt = f"""
    You are a wise, shy turtle guide helping a learner discover new topics on their learning journey.
    
    The learner has completed these topics:
    {json.dumps(completed_topics_data, indent=2)}
    
    Based on their learning journey, suggest 3 NEW topics they should explore:
    
    1. RELATED TOPIC: A topic that naturally builds on what they've learned
    2. DEEP DIVE: An advanced subtopic that expands one of their completed areas
    3. ADJACENT SKILL: A complementary topic from a related but different domain
    
    Consider:
    - Natural learning progressions
    - Practical applications
    - Cross-domain knowledge transfer
    - What would be most valuable next
    
    Also write a brief, encouraging message from the turtle's perspective (shy but helpful personality).
    
    Return JSON with this structure:
    {{
      "suggestions": [
        {{
          "topic": "Topic to learn",
          "reason": "Why this is a good next step",
          "suggestion_type": "related|deep_dive|adjacent",
          "description": "What they'll learn and why it matters"
        }}
      ],
      "turtle_message": "H-hello explorer... I noticed you've been learning about..."
    }}
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=discovery_prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "suggestions": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "topic": {"type": "string"},
                                    "reason": {"type": "string"},
                                    "suggestion_type": {"type": "string"},
                                    "description": {"type": "string"}
                                },
                                "required": ["topic", "reason", "suggestion_type", "description"]
                            }
                        },
                        "turtle_message": {"type": "string"}
                    },
                    "required": ["suggestions", "turtle_message"]
                }
            }
        )
        
        discovery_data = response.parsed
        
        return {
            "suggestions": discovery_data["suggestions"],
            "completed_topics": [item["title"] for item in completed_topics_data],
            "turtle_message": discovery_data["turtle_message"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}")


@router.post("/accept-suggestion")
async def accept_suggestion(
    topic: str = Query(..., description="The suggested topic to generate roadmap for"),
    experience: str = Query(default="Beginner", description="Experience level"),
    user_id: str = Query(default="default_user", description="User identifier"),
    db_conn: Session = Depends(db.get_db)
):
    """
    Accept a suggested topic and generate a full roadmap for it.
    
    Query parameters:
    - topic: The topic to create a roadmap for
    - experience: User's experience level (default: "Beginner")
    - user_id: User identifier (defaults to "default_user")
    
    Returns:
    - Generated roadmap with items and questions
    """
    # Use existing generate_roadmap logic
    request = schema.RoadmapCreate(topic=topic, experience=experience)
    return await generate_roadmap(request, db_conn)
