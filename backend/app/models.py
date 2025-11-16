from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime
from sqlalchemy.orm import declarative_base
from datetime import datetime

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

class KnowledgeGraphNode(Base):
    __tablename__ = "knowledge_graph_nodes"
    
    id = Column(String, primary_key=True)  # e.g., "topic_1" or "title_5"
    label = Column(String)
    node_type = Column(String)  # "topic" or "title"
    roadmap_id = Column(Integer, index=True)
    group = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)

class KnowledgeGraphEdge(Base):
    __tablename__ = "knowledge_graph_edges"
    
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String, index=True)
    target = Column(String, index=True)
    weight = Column(Float, default=1.0)
    relationship = Column(String, default="related")
    created_at = Column(DateTime, default=datetime.utcnow)

class QuizProgress(Base):
    __tablename__ = "quiz_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, default="default_user")
    roadmap_item_id = Column(Integer, index=True)
    completed_at = Column(DateTime, default=datetime.utcnow)
    score = Column(Integer)
    total_questions = Column(Integer)

class UserProfile(Base):
    __tablename__ = "user_profiles"
    
    user_id = Column(String, primary_key=True, index=True)
    total_unlocks = Column(Integer, default=0)
    turtle_phase = Column(Integer, default=0)  # 0=hidden, 1-3=progression phases
    turtle_visible = Column(Boolean, default=True)  # user preference to show/hide
    last_discovery_at = Column(Integer, default=0)  # unlock count when last discovery was shown
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
