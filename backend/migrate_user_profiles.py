"""
Migration script to add user_profiles table for turtle guide state tracking.
Run this script to update the database schema.
"""

from app.db import engine
from app.models import Base, UserProfile
from sqlalchemy import inspect

def migrate():
    """Add user_profiles table if it doesn't exist."""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    if 'user_profiles' not in existing_tables:
        print("Creating user_profiles table...")
        UserProfile.__table__.create(engine)
        print("✓ user_profiles table created successfully!")
    else:
        print("✓ user_profiles table already exists")

if __name__ == "__main__":
    migrate()
