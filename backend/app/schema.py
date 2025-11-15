from pydantic import BaseModel
from typing import List

class RoadmapCreate(BaseModel):
    topic: str
    experience: str

class RoadmapResponse(BaseModel):
    id: int
    topic: str
    experience: str
    items: List[dict]

class QuizQuestion(BaseModel):
    question: str
    options: List[str]
    correct: int
