from sqlalchemy import Column, Integer, String, Boolean, Float, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Roadmap(Base):
    __tablename__ = "roadmaps"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True)  # For future multi-user
    topic = Column(String, index=True)
    experience = Column(Text)
    created_at = Column(String)
    
class RoadmapItem(Base):
    __tablename__ = "roadmap_items"
    
    id = Column(Integer, primary_key=True, index=True)
    roadmap_id = Column(Integer, index=True)
    title = Column(String)
    summary = Column(Text)
    level = Column(Integer)
    study_material = Column(String)  # JSON string
    
class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    roadmap_item_id = Column(Integer, index=True)
    question = Column(Text)
    options = Column(String)  # JSON string
    correct = Column(Integer)
