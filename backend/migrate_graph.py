"""
Migration script to update knowledge graph from cache-based to persistent incremental model.

This script:
1. Drops the old KnowledgeGraphCache table
2. Creates new KnowledgeGraphNode and KnowledgeGraphEdge tables
3. Rebuilds the entire graph from existing roadmaps
"""

import asyncio
from app.db import get_db, engine
from app import models
from app.routers.knowledge_graph import rebuild_entire_graph

def main():
    print("=" * 60)
    print("Knowledge Graph Migration")
    print("=" * 60)
    print()
    print("This will:")
    print("  1. Drop the old knowledge_graph_cache table")
    print("  2. Create new knowledge_graph_nodes table")
    print("  3. Create new knowledge_graph_edges table")
    print("  4. Rebuild graph from existing roadmaps")
    print()
    
    response = input("Continue? (yes/no): ")
    if response.lower() != "yes":
        print("Migration cancelled.")
        return
    
    print("\n🔧 Starting migration...\n")
    
    # Drop old table if it exists
    try:
        print("📦 Dropping old knowledge_graph_cache table...")
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("DROP TABLE IF EXISTS knowledge_graph_cache"))
            conn.commit()
        print("✓ Old table dropped\n")
    except Exception as e:
        print(f"⚠️  Warning dropping old table: {e}\n")
    
    # Create new tables
    print("📦 Creating new tables...")
    try:
        models.Base.metadata.create_all(bind=engine)
        print("✓ New tables created\n")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return
    
    # Rebuild entire graph
    print("🔄 Rebuilding knowledge graph from existing roadmaps...")
    try:
        # Get database session
        db = next(get_db())
        
        # Check if there are any roadmaps
        roadmaps_count = db.query(models.Roadmap).count()
        print(f"   Found {roadmaps_count} roadmaps\n")
        
        if roadmaps_count > 0:
            # Rebuild graph asynchronously
            asyncio.run(rebuild_entire_graph(db))
            print("\n✓ Knowledge graph rebuilt successfully!\n")
        else:
            print("   No roadmaps found - graph will be built as roadmaps are added.\n")
        
        db.close()
    except Exception as e:
        print(f"❌ Error rebuilding graph: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print("=" * 60)
    print("✓ Migration completed successfully!")
    print("=" * 60)
    print()
    print("Your knowledge graph now uses incremental updates:")
    print("  • Adding roadmaps: Only analyzes new relationships")
    print("  • Deleting roadmaps: Only removes affected nodes/edges")
    print("  • Existing connections remain stable")
    print("  • Use ?force_refresh=true to rebuild from scratch if needed")
    print()

if __name__ == "__main__":
    main()
