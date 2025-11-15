from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, db
import json
from typing import List
from pydantic import BaseModel

router = APIRouter(prefix="/api/quiz")

class QuestionResponse(BaseModel):
    id: int
    question: str
    options: List[str]
    correct: int

class QuizResponse(BaseModel):
    roadmap_item_id: int
    questions: List[QuestionResponse]

@router.get("/{roadmap_item_id}", response_model=QuizResponse)
async def get_quiz_questions(roadmap_item_id: int, db_conn: Session = Depends(db.get_db)):
    """
    Get all quiz questions for a specific roadmap item.
    
    Path parameters:
    - roadmap_item_id: The ID of the roadmap item
    
    Returns:
    - Quiz questions with options and correct answer index
    """
    # Check if roadmap item exists
    roadmap_item = db_conn.query(models.RoadmapItem).filter(
        models.RoadmapItem.id == roadmap_item_id
    ).first()
    
    if not roadmap_item:
        raise HTTPException(status_code=404, detail="Roadmap item not found")
    
    # Get all questions for this roadmap item
    questions = db_conn.query(models.QuizQuestion).filter(
        models.QuizQuestion.roadmap_item_id == roadmap_item_id
    ).all()
    
    # Format the response
    formatted_questions = []
    for q in questions:
        formatted_questions.append({
            "id": q.id,
            "question": q.question,
            "options": json.loads(q.options),
            "correct": q.correct
        })
    
    return {
        "roadmap_item_id": roadmap_item_id,
        "questions": formatted_questions
    }
