from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, db
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter(prefix="/api/progress")

class CompleteQuizRequest(BaseModel):
    roadmap_item_id: int
    score: int
    total_questions: int
    user_id: str = "default_user"

class UnlockedIdsResponse(BaseModel):
    unlocked_ids: List[int]

class RoadmapProgressResponse(BaseModel):
    completed_levels: List[int]
    current_level: int
    completed_item_ids: List[int]

class TurtleStateResponse(BaseModel):
    total_unlocks: int
    turtle_phase: int
    should_show_discovery: bool
    turtle_visible: bool
    unlocks_until_next_discovery: int

class UpdateTurtleVisibilityRequest(BaseModel):
    turtle_visible: bool
    user_id: str = "default_user"

def get_or_create_user_profile(user_id: str, db_conn: Session) -> models.UserProfile:
    """Get or create user profile for tracking turtle state."""
    profile = db_conn.query(models.UserProfile).filter(
        models.UserProfile.user_id == user_id
    ).first()
    
    if not profile:
        profile = models.UserProfile(user_id=user_id)
        db_conn.add(profile)
        db_conn.commit()
        db_conn.refresh(profile)
    
    return profile

def calculate_turtle_phase(total_unlocks: int) -> int:
    """Calculate turtle progression phase based on unlock count."""
    if total_unlocks < 3:
        return 0  # Hidden
    elif total_unlocks < 9:
        return 1  # Phase 1: Shy peeking
    elif total_unlocks < 21:
        return 2  # Phase 2: More visible
    else:
        return 3  # Phase 3: Full reveal

@router.post("/complete")
async def complete_quiz(
    request: CompleteQuizRequest,
    db_conn: Session = Depends(db.get_db)
):
    """
    Mark a quiz as completed. Only saves if score is 100% (perfect score).
    
    Body parameters:
    - roadmap_item_id: The ID of the roadmap item
    - score: Number of correct answers
    - total_questions: Total number of questions
    - user_id: User identifier (defaults to "default_user")
    
    Returns:
    - Success message or error if not 100% correct
    """
    # Check if roadmap item exists
    roadmap_item = db_conn.query(models.RoadmapItem).filter(
        models.RoadmapItem.id == request.roadmap_item_id
    ).first()
    
    if not roadmap_item:
        raise HTTPException(status_code=404, detail="Roadmap item not found")
    
    # Only save if perfect score (100%)
    if request.score != request.total_questions:
        return {
            "success": False,
            "message": "You need 100% to unlock progress. Try again!",
            "score": request.score,
            "required": request.total_questions
        }
    
    # Check if already completed
    existing = db_conn.query(models.QuizProgress).filter(
        models.QuizProgress.user_id == request.user_id,
        models.QuizProgress.roadmap_item_id == request.roadmap_item_id
    ).first()

    is_new_unlock = existing is None

    if existing:
        # Update existing record
        existing.score = request.score
        existing.total_questions = request.total_questions
        existing.completed_at = datetime.utcnow()
    else:
        # Create new record
        progress = models.QuizProgress(
            user_id=request.user_id,
            roadmap_item_id=request.roadmap_item_id,
            score=request.score,
            total_questions=request.total_questions,
            completed_at=datetime.utcnow()
        )
        db_conn.add(progress)
        
        # Update user profile unlock count
        profile = get_or_create_user_profile(request.user_id, db_conn)
        profile.total_unlocks += 1
        profile.turtle_phase = calculate_turtle_phase(profile.total_unlocks)
        profile.updated_at = datetime.utcnow()

    db_conn.commit()

    return {
        "success": True,
        "message": "Quiz completed successfully!",
        "roadmap_item_id": request.roadmap_item_id,
        "is_new_unlock": is_new_unlock
    }

@router.get("/unlocked", response_model=UnlockedIdsResponse)
async def get_unlocked_ids(
    user_id: str = "default_user",
    db_conn: Session = Depends(db.get_db)
):
    """
    Get list of unlocked (completed with 100% score) roadmap item IDs.
    
    Query parameters:
    - user_id: User identifier (defaults to "default_user")
    
    Returns:
    - List of roadmap_item_ids that have been completed
    """
    completed = db_conn.query(models.QuizProgress).filter(
        models.QuizProgress.user_id == user_id,
        models.QuizProgress.score == models.QuizProgress.total_questions  # Perfect score
    ).all()
    
    unlocked_ids = [progress.roadmap_item_id for progress in completed]
    
    return {"unlocked_ids": unlocked_ids}

@router.get("/roadmap/{roadmap_id}", response_model=RoadmapProgressResponse)
async def get_roadmap_progress(
    roadmap_id: int,
    user_id: str = "default_user",
    db_conn: Session = Depends(db.get_db)
):
    """
    Get completion status per level for a specific roadmap.
    
    Path parameters:
    - roadmap_id: The ID of the roadmap
    
    Query parameters:
    - user_id: User identifier (defaults to "default_user")
    
    Returns:
    - completed_levels: List of levels that are fully completed
    - current_level: The next level to unlock (first incomplete level)
    - completed_item_ids: All completed item IDs for this roadmap
    """
    # Check if roadmap exists
    roadmap = db_conn.query(models.Roadmap).filter(
        models.Roadmap.id == roadmap_id
    ).first()
    
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")
    
    # Get all items for this roadmap
    roadmap_items = db_conn.query(models.RoadmapItem).filter(
        models.RoadmapItem.roadmap_id == roadmap_id
    ).all()
    
    # Get completed items for this user
    completed_progress = db_conn.query(models.QuizProgress).filter(
        models.QuizProgress.user_id == user_id,
        models.QuizProgress.score == models.QuizProgress.total_questions
    ).all()
    
    completed_item_ids = {progress.roadmap_item_id for progress in completed_progress}
    
    # Filter to only items in this roadmap
    roadmap_item_ids = {item.id for item in roadmap_items}
    completed_in_roadmap = [
        item_id for item_id in completed_item_ids 
        if item_id in roadmap_item_ids
    ]
    
    # Group items by level
    levels = {}
    for item in roadmap_items:
        if item.level not in levels:
            levels[item.level] = []
        levels[item.level].append(item.id)
    
    # Determine which levels are completed
    completed_levels = []
    current_level = 1
    
    for level in sorted(levels.keys()):
        items_in_level = levels[level]
        if all(item_id in completed_item_ids for item_id in items_in_level):
            completed_levels.append(level)
            current_level = level + 1
        else:
            # First incomplete level
            current_level = level
            break
    
    return {
        "completed_levels": completed_levels,
        "current_level": current_level,
        "completed_item_ids": completed_in_roadmap
    }

@router.get("/turtle-state", response_model=TurtleStateResponse)
async def get_turtle_state(
    user_id: str = "default_user",
    db_conn: Session = Depends(db.get_db)
):
    """
    Get turtle guide state for the user.
    
    Query parameters:
    - user_id: User identifier (defaults to "default_user")
    
    Returns:
    - total_unlocks: Total number of topics unlocked
    - turtle_phase: Current progression phase (0-3)
    - should_show_discovery: Whether discovery modal should be shown
    - turtle_visible: User preference for showing turtle
    - unlocks_until_next_discovery: Count until next discovery trigger
    """
    profile = get_or_create_user_profile(user_id, db_conn)
    
    # Check if discovery should be triggered
    # Trigger every 3 unlocks AND not shown at this count before
    should_show_discovery = (
        profile.total_unlocks >= 3 and 
        profile.total_unlocks % 3 == 0 and
        profile.last_discovery_at < profile.total_unlocks
    )
    
    # Calculate unlocks until next discovery
    if profile.total_unlocks < 3:
        unlocks_until_next = 3 - profile.total_unlocks
    else:
        unlocks_until_next = 3 - (profile.total_unlocks % 3)
        if unlocks_until_next == 3:
            unlocks_until_next = 0
    
    return {
        "total_unlocks": profile.total_unlocks,
        "turtle_phase": profile.turtle_phase,
        "should_show_discovery": should_show_discovery,
        "turtle_visible": profile.turtle_visible,
        "unlocks_until_next_discovery": unlocks_until_next
    }

@router.post("/turtle-visibility")
async def update_turtle_visibility(
    request: UpdateTurtleVisibilityRequest,
    db_conn: Session = Depends(db.get_db)
):
    """
    Update user preference for turtle guide visibility.
    
    Body parameters:
    - turtle_visible: Boolean to show/hide turtle
    - user_id: User identifier (defaults to "default_user")
    
    Returns:
    - Success message with updated state
    """
    profile = get_or_create_user_profile(request.user_id, db_conn)
    profile.turtle_visible = request.turtle_visible
    profile.updated_at = datetime.utcnow()
    db_conn.commit()
    
    return {
        "success": True,
        "message": f"Turtle guide {'shown' if request.turtle_visible else 'hidden'}",
        "turtle_visible": profile.turtle_visible
    }

@router.post("/mark-discovery-shown")
async def mark_discovery_shown(
    user_id: str = "default_user",
    db_conn: Session = Depends(db.get_db)
):
    """
    Mark that discovery modal was shown at current unlock count.
    This prevents showing it again until the next milestone.
    
    Query parameters:
    - user_id: User identifier (defaults to "default_user")
    
    Returns:
    - Success message
    """
    profile = get_or_create_user_profile(user_id, db_conn)
    profile.last_discovery_at = profile.total_unlocks
    profile.updated_at = datetime.utcnow()
    db_conn.commit()
    
    return {
        "success": True,
        "message": "Discovery shown marked",
        "last_discovery_at": profile.last_discovery_at
    }
