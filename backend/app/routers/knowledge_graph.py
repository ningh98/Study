from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from google import genai
import json
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app import models, db
from dotenv import load_dotenv
import os
from datetime import datetime

load_dotenv()

# Initialize Gemini client
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

router = APIRouter(prefix="/api/knowledge-graph")

# Minimum weight threshold for relationships
MIN_RELATIONSHIP_WEIGHT = 1.5  # Only include moderate to strong connections

class Node(BaseModel):
    id: str
    label: str
    type: str  # "topic" or "title"
    roadmap_id: int = None
    group: int = None  # For coloring different roadmaps

class Edge(BaseModel):
    source: str
    target: str
    weight: float = 1.0
    relationship: str = "related"

class KnowledgeGraphResponse(BaseModel):
    nodes: List[Node]
    edges: List[Edge]

@router.get("/", response_model=KnowledgeGraphResponse)
async def get_knowledge_graph(
    force_refresh: bool = Query(False, description="Force complete regeneration of the graph"),
    db_conn: Session = Depends(db.get_db)
):
    """
    Get knowledge graph data showing relationships between topics and titles.
    Uses persistent incremental updates - graph is built up over time.
    Returns nodes (topics/titles) and edges (connections) for visualization.
    """

    try:
        if force_refresh:
            # Complete regeneration requested
            print("🔄 Force refresh - regenerating entire graph...")
            # Delete all existing graph data
            db_conn.query(models.KnowledgeGraphEdge).delete()
            db_conn.query(models.KnowledgeGraphNode).delete()
            db_conn.commit()
            
            # Rebuild from scratch
            await rebuild_entire_graph(db_conn)
        
        # Load graph from database
        db_nodes = db_conn.query(models.KnowledgeGraphNode).all()
        db_edges = db_conn.query(models.KnowledgeGraphEdge).all()
        
        # Convert to response format
        nodes = [
            Node(
                id=node.id,
                label=node.label,
                type=node.node_type,
                roadmap_id=node.roadmap_id,
                group=node.group
            )
            for node in db_nodes
        ]
        
        edges = [
            Edge(
                source=edge.source,
                target=edge.target,
                weight=edge.weight,
                relationship=edge.relationship
            )
            for edge in db_edges
        ]
        
        print(f"✓ Loaded graph: {len(nodes)} nodes, {len(edges)} edges")
        return {"nodes": nodes, "edges": edges}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get knowledge graph: {str(e)}")

async def rebuild_entire_graph(db_conn: Session):
    """Rebuild the entire knowledge graph from scratch."""
    print("⚙️ Building entire graph from scratch...")
    
    # Get all roadmaps
    roadmaps = db_conn.query(models.Roadmap).all()
    
    if not roadmaps:
        return
    
    # Assign group numbers
    roadmap_groups = {roadmap.id: idx for idx, roadmap in enumerate(roadmaps)}
    
    # Create all nodes
    all_nodes = []
    for roadmap in roadmaps:
        # Topic node
        topic_node = models.KnowledgeGraphNode(
            id=f"topic_{roadmap.id}",
            label=roadmap.topic,
            node_type="topic",
            roadmap_id=roadmap.id,
            group=roadmap_groups[roadmap.id]
        )
        db_conn.add(topic_node)
        all_nodes.append(Node(
            id=topic_node.id,
            label=topic_node.label,
            type=topic_node.node_type,
            roadmap_id=topic_node.roadmap_id,
            group=topic_node.group
        ))
        
        # Title nodes
        items = db_conn.query(models.RoadmapItem).filter(
            models.RoadmapItem.roadmap_id == roadmap.id
        ).all()
        
        for item in items:
            title_node = models.KnowledgeGraphNode(
                id=f"title_{item.id}",
                label=item.title,
                node_type="title",
                roadmap_id=roadmap.id,
                group=roadmap_groups[roadmap.id]
            )
            db_conn.add(title_node)
            all_nodes.append(Node(
                id=title_node.id,
                label=title_node.label,
                type=title_node.node_type,
                roadmap_id=title_node.roadmap_id,
                group=title_node.group
            ))
            
            # Intra-roadmap edge (topic -> title)
            edge = models.KnowledgeGraphEdge(
                source=f"topic_{roadmap.id}",
                target=f"title_{item.id}",
                weight=3.0,
                relationship="contains"
            )
            db_conn.add(edge)
    
    db_conn.commit()
    
    # Analyze inter-roadmap relationships
    title_nodes = [n for n in all_nodes if n.type == "title"]
    if len(title_nodes) > 1:
        inter_edges = await analyze_relationships(title_nodes, [], db_conn)
        print(f"✓ Generated {len(inter_edges)} cross-roadmap connections")
    
    print(f"✓ Complete graph built: {len(all_nodes)} nodes")

async def add_roadmap_to_graph(roadmap_id: int, db_conn: Session):
    """
    Incrementally add a new roadmap to the existing graph.
    Only analyzes relationships between new nodes and existing nodes.
    """
    print(f"➕ Adding roadmap {roadmap_id} to graph incrementally...")
    
    # Get the roadmap
    roadmap = db_conn.query(models.Roadmap).filter(
        models.Roadmap.id == roadmap_id
    ).first()
    
    if not roadmap:
        return
    
    # Calculate group number (max existing group + 1)
    max_group = db_conn.query(models.KnowledgeGraphNode).count()
    group = max_group  # Simple incrementing group
    
    # Get existing title nodes for relationship analysis
    existing_nodes = db_conn.query(models.KnowledgeGraphNode).filter(
        models.KnowledgeGraphNode.node_type == "title"
    ).all()
    
    existing_title_nodes = [
        Node(
            id=node.id,
            label=node.label,
            type=node.node_type,
            roadmap_id=node.roadmap_id,
            group=node.group
        )
        for node in existing_nodes
    ]
    
    # Create topic node
    topic_node = models.KnowledgeGraphNode(
        id=f"topic_{roadmap.id}",
        label=roadmap.topic,
        node_type="topic",
        roadmap_id=roadmap.id,
        group=group
    )
    db_conn.add(topic_node)
    
    # Get items for this roadmap
    items = db_conn.query(models.RoadmapItem).filter(
        models.RoadmapItem.roadmap_id == roadmap.id
    ).all()
    
    # Create title nodes and intra-roadmap edges
    new_title_nodes = []
    for item in items:
        title_node = models.KnowledgeGraphNode(
            id=f"title_{item.id}",
            label=item.title,
            node_type="title",
            roadmap_id=roadmap.id,
            group=group
        )
        db_conn.add(title_node)
        
        new_title_nodes.append(Node(
            id=title_node.id,
            label=title_node.label,
            type=title_node.node_type,
            roadmap_id=title_node.roadmap_id,
            group=title_node.group
        ))
        
        # Intra-roadmap edge (topic -> title)
        edge = models.KnowledgeGraphEdge(
            source=f"topic_{roadmap.id}",
            target=f"title_{item.id}",
            weight=3.0,
            relationship="contains"
        )
        db_conn.add(edge)
    
    db_conn.commit()
    
    # Analyze relationships between NEW nodes and EXISTING nodes only
    if new_title_nodes and existing_title_nodes:
        print(f"🔍 Analyzing {len(new_title_nodes)} new nodes against {len(existing_title_nodes)} existing nodes...")
        inter_edges = await analyze_new_relationships(
            new_title_nodes, 
            existing_title_nodes, 
            db_conn
        )
        print(f"✓ Added {len(inter_edges)} new connections")
    
    print(f"✓ Roadmap {roadmap_id} added to graph")

async def remove_roadmap_from_graph(roadmap_id: int, db_conn: Session):
    """
    Incrementally remove a roadmap from the graph.
    Removes all nodes and edges associated with this roadmap.
    """
    print(f"➖ Removing roadmap {roadmap_id} from graph...")
    
    # Get all nodes for this roadmap
    nodes_to_remove = db_conn.query(models.KnowledgeGraphNode).filter(
        models.KnowledgeGraphNode.roadmap_id == roadmap_id
    ).all()
    
    node_ids = [node.id for node in nodes_to_remove]
    
    if not node_ids:
        return
    
    # Remove edges connected to these nodes
    db_conn.query(models.KnowledgeGraphEdge).filter(
        (models.KnowledgeGraphEdge.source.in_(node_ids)) |
        (models.KnowledgeGraphEdge.target.in_(node_ids))
    ).delete(synchronize_session=False)
    
    # Remove the nodes
    db_conn.query(models.KnowledgeGraphNode).filter(
        models.KnowledgeGraphNode.roadmap_id == roadmap_id
    ).delete(synchronize_session=False)
    
    db_conn.commit()
    print(f"✓ Removed {len(node_ids)} nodes and their connections")

async def analyze_new_relationships(
    new_nodes: List[Node], 
    existing_nodes: List[Node], 
    db_conn: Session
) -> List[Edge]:
    """
    Analyze relationships only between NEW nodes and EXISTING nodes.
    This is the key to incremental updates - we don't re-analyze everything.
    """
    
    if not new_nodes or not existing_nodes:
        return []

    try:
        # Prepare content for AI analysis
        new_content = []
        for node in new_nodes:
            new_content.append({
                "id": node.id,
                "label": node.label,
                "roadmap_id": node.roadmap_id
            })
        
        existing_content = []
        for node in existing_nodes:
            existing_content.append({
                "id": node.id,
                "label": node.label,
                "roadmap_id": node.roadmap_id
            })

        # Create prompt for incremental relationship analysis
        relationships_prompt = f"""
        You are analyzing NEW learning topics that were just added to an existing knowledge graph.
        Your job is to find meaningful relationships between the NEW topics and the EXISTING topics.

        NEW TOPICS (just added):
        {json.dumps(new_content, indent=2)}

        EXISTING TOPICS (already in the graph):
        {json.dumps(existing_content, indent=2)}

        Instructions:
        1. Only create connections between NEW topics and EXISTING topics
        2. Do NOT create connections between two NEW topics (those already exist)
        3. Do NOT create connections between two EXISTING topics (those already exist)
        4. Look for prerequisite relationships (where one topic is foundational for another)
        5. Look for complementary relationships (topics that build upon each other)
        6. Look for conceptual connections (sharing similar concepts or techniques)
        7. Consider cross-domain knowledge transfer
        8. BE HIGHLY SELECTIVE - Only create truly meaningful relationships
        9. Minimum weight should be {MIN_RELATIONSHIP_WEIGHT} or higher

        Return ONLY valid JSON with this exact structure:
        {{
          "relationships": [
            {{
              "source_id": "title_X",
              "target_id": "title_Y",
              "relationship_type": "prerequisite|complementary|conceptual|transfer",
              "weight": 1.5 to 3.0,
              "explanation": "Brief explanation"
            }}
          ]
        }}

        Important: One endpoint must be from NEW topics, one from EXISTING topics.
        """

        # Call Gemini API
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=relationships_prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "relationships": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "source_id": {"type": "string"},
                                    "target_id": {"type": "string"},
                                    "relationship_type": {"type": "string"},
                                    "weight": {"type": "number"},
                                    "explanation": {"type": "string"}
                                },
                                "required": ["source_id", "target_id", "relationship_type", "weight", "explanation"]
                            }
                        }
                    },
                    "required": ["relationships"]
                }
            }
        )

        relationships_data = response.parsed

        # Convert to Edge objects and save to database
        edges = []
        for rel in relationships_data["relationships"]:
            weight = float(rel["weight"])
            # Only include relationships that meet minimum weight threshold
            if weight >= MIN_RELATIONSHIP_WEIGHT:
                edge = models.KnowledgeGraphEdge(
                    source=rel["source_id"],
                    target=rel["target_id"],
                    weight=weight,
                    relationship=rel["relationship_type"]
                )
                db_conn.add(edge)
                edges.append(edge)
            else:
                print(f"Filtered weak: {rel['source_id']} -> {rel['target_id']} (weight: {weight})")

        db_conn.commit()
        return edges

    except Exception as e:
        print(f"Error analyzing new relationships: {str(e)}")
        return []

async def analyze_relationships(all_nodes: List[Node], existing_edges: List, db_conn: Session) -> List[Edge]:
    """
    Legacy function for complete graph analysis (used in force_refresh).
    Analyzes ALL possible relationships between title nodes.
    """

    title_nodes = [n for n in all_nodes if n.type == "title"]
    
    if len(title_nodes) < 2:
        return []

    try:
        # Prepare content for AI analysis
        content_list = []
        for node in title_nodes:
            content_list.append({
                "id": node.id,
                "label": node.label,
                "roadmap_id": node.roadmap_id
            })

        relationships_prompt = f"""
        Analyze the following learning topics and identify meaningful relationships between them.

        Topics to analyze:
        {json.dumps(content_list, indent=2)}

        Instructions:
        1. Look for prerequisite, complementary, conceptual, and transfer relationships
        2. Only create connections between titles from DIFFERENT roadmaps
        3. BE HIGHLY SELECTIVE - only truly meaningful relationships
        4. Minimum weight should be {MIN_RELATIONSHIP_WEIGHT} or higher

        Return ONLY valid JSON:
        {{
          "relationships": [
            {{
              "source_id": "title_X",
              "target_id": "title_Y",
              "relationship_type": "prerequisite|complementary|conceptual|transfer",
              "weight": 1.5 to 3.0,
              "explanation": "Brief explanation"
            }}
          ]
        }}
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=relationships_prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": {
                    "type": "object",
                    "properties": {
                        "relationships": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "source_id": {"type": "string"},
                                    "target_id": {"type": "string"},
                                    "relationship_type": {"type": "string"},
                                    "weight": {"type": "number"},
                                    "explanation": {"type": "string"}
                                },
                                "required": ["source_id", "target_id", "relationship_type", "weight", "explanation"]
                            }
                        }
                    },
                    "required": ["relationships"]
                }
            }
        )

        relationships_data = response.parsed

        edges = []
        for rel in relationships_data["relationships"]:
            weight = float(rel["weight"])
            if weight >= MIN_RELATIONSHIP_WEIGHT:
                edge = models.KnowledgeGraphEdge(
                    source=rel["source_id"],
                    target=rel["target_id"],
                    weight=weight,
                    relationship=rel["relationship_type"]
                )
                db_conn.add(edge)
                edges.append(edge)

        db_conn.commit()
        return edges

    except Exception as e:
        print(f"Error analyzing relationships: {str(e)}")
        return []
