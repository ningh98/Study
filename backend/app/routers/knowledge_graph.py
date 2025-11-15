from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from google import genai
import json
import hashlib
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app import models, db
from dotenv import load_dotenv
import os

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

def compute_data_hash(roadmaps: List[models.Roadmap], roadmap_items: List[models.RoadmapItem]) -> str:
    """Compute a hash of the current roadmap data to detect changes."""
    data_string = ""
    
    # Include roadmap data
    for roadmap in sorted(roadmaps, key=lambda x: x.id):
        data_string += f"r{roadmap.id}|{roadmap.topic}|{roadmap.experience}|"
    
    # Include roadmap items data
    for item in sorted(roadmap_items, key=lambda x: x.id):
        data_string += f"i{item.id}|{item.roadmap_id}|{item.title}|{item.summary}|"
    
    return hashlib.sha256(data_string.encode()).hexdigest()

@router.get("/", response_model=KnowledgeGraphResponse)
async def get_knowledge_graph(
    force_refresh: bool = Query(False, description="Force regeneration ignoring cache"),
    db_conn: Session = Depends(db.get_db)
):
    """
    Generate knowledge graph data showing relationships between topics and titles.
    Uses intelligent caching to avoid unnecessary LLM calls.
    Returns nodes (topics/titles) and edges (connections) for visualization.
    """

    try:
        # Get all roadmaps with their items
        roadmaps = db_conn.query(models.Roadmap).all()
        roadmap_items = db_conn.query(models.RoadmapItem).all()

        if not roadmaps:
            return {"nodes": [], "edges": []}
        
        # Compute hash of current data
        current_hash = compute_data_hash(roadmaps, roadmap_items)
        
        # Check if we have a valid cache (unless force refresh is requested)
        if not force_refresh:
            cached = db_conn.query(models.KnowledgeGraphCache).filter(
                models.KnowledgeGraphCache.data_hash == current_hash
            ).first()
            
            if cached:
                # Return cached data
                graph_data = json.loads(cached.graph_data)
                print(f"✓ Returning cached knowledge graph (hash: {current_hash[:8]}...)")
                return graph_data
        
        print(f"⚙ Generating new knowledge graph (hash: {current_hash[:8]}...)")

        # Prepare content for AI analysis
        content_map = {}

        # Collect all topics and titles
        for roadmap in roadmaps:
            content_map[f"topic_{roadmap.id}"] = {
                "type": "topic",
                "content": roadmap.topic,
                "description": f"{roadmap.topic}: {roadmap.experience}",
                "roadmap_id": roadmap.id
            }

        for item in roadmap_items:
            content_map[f"title_{item.id}"] = {
                "type": "title",
                "content": item.title,
                "description": f"{item.title}: {item.summary}",
                "roadmap_id": item.roadmap_id
            }

        # Create intra-roadmap connections (topics to their titles)
        nodes = []
        edges = []

        # Assign group numbers for coloring (each roadmap gets a different color)
        roadmap_groups = {}
        group_counter = 0
        for roadmap in roadmaps:
            roadmap_groups[roadmap.id] = group_counter
            group_counter += 1

        # Create nodes
        for key, data in content_map.items():
            node = Node(
                id=key,
                label=data["content"],
                type=data["type"],
                roadmap_id=data["roadmap_id"],
                group=roadmap_groups.get(data["roadmap_id"], 0)
            )
            nodes.append(node)

        # Create intra-roadmap edges (topic -> titles in same roadmap)
        for item in roadmap_items:
            edges.append(Edge(
                source=f"topic_{item.roadmap_id}",
                target=f"title_{item.id}",
                weight=3.0,
                relationship="contains"
            ))

        # Analyze inter-roadmap relationships using AI
        if len([n for n in nodes if n.type == "title"]) > 1:
            title_nodes = [n for n in nodes if n.type == "title"]
            inter_edges = await analyze_relationships(title_nodes)

            # Filter out duplicate edges and add to main edges list
            existing_edges = {(e.source, e.target) for e in edges}
            for edge in inter_edges:
                if (edge.source, edge.target) not in existing_edges:
                    edges.append(edge)

        result = {"nodes": nodes, "edges": edges}
        
        # Cache the result
        try:
            # Delete old cache entries (keep only the latest)
            db_conn.query(models.KnowledgeGraphCache).delete()
            
            # Convert Pydantic models to dict for JSON serialization
            serializable_result = {
                "nodes": [node.model_dump() for node in nodes],
                "edges": [edge.model_dump() for edge in edges]
            }
            
            # Create new cache entry
            cache_entry = models.KnowledgeGraphCache(
                data_hash=current_hash,
                graph_data=json.dumps(serializable_result)
            )
            db_conn.add(cache_entry)
            db_conn.commit()
            print(f"✓ Cached new knowledge graph")
        except Exception as cache_error:
            print(f"Warning: Failed to cache knowledge graph: {str(cache_error)}")
            db_conn.rollback()
        
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate knowledge graph: {str(e)}")

async def analyze_relationships(title_nodes: List[Node]) -> List[Edge]:
    """Use AI to analyze relationships between different titles from different roadmaps."""

    if len(title_nodes) < 2:
        return []

    try:
        # Prepare content for AI analysis
        content_list = []
        for node in title_nodes:
            if node.type == "title":
                content_list.append({
                    "id": node.id,
                    "label": node.label,
                    "roadmap_id": node.roadmap_id
                })

        # Create prompt for relationship analysis
        relationships_prompt = f"""
        Analyze the following learning topics (titles) and identify meaningful relationships between them.
        Each topic is from a different learning roadmap (roadmap_id indicates which roadmap).

        Topics to analyze:
        {json.dumps(content_list, indent=2)}

        Instructions:
        1. Look for prerequisite relationships (where one topic is foundational for another)
        2. Look for complementary relationships (topics that build upon each other)
        3. Look for conceptual connections (sharing similar concepts or techniques)
        4. Consider cross-domain knowledge transfer (e.g., math concepts in programming)
        5. BE HIGHLY SELECTIVE - Only create connections that are truly meaningful
        6. Avoid weak or superficial connections - better to have fewer high-quality relationships
        7. Minimum weight should be 1.5 or higher for any relationship

        Return ONLY valid JSON with this exact structure:
        {{
          "relationships": [
            {{
              "source_id": "title_X",
              "target_id": "title_Y",
              "relationship_type": "prerequisite|complementary|conceptual|transfer",
              "weight": 1.0 to 3.0,
              "explanation": "Brief explanation of the relationship"
            }}
          ]
        }}

        - Only include relationships between titles from DIFFERENT roadmaps
        - weight 1.0 = weak connection, 2.0 = moderate, 3.0 = strong
        - Be selective - don't create meaningless connections
        - Focus on educational/practical relationships
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

        # Convert to Edge objects, filtering out weak connections
        edges = []
        for rel in relationships_data["relationships"]:
            weight = float(rel["weight"])
            # Only include relationships that meet minimum weight threshold
            if weight >= MIN_RELATIONSHIP_WEIGHT:
                edges.append(Edge(
                    source=rel["source_id"],
                    target=rel["target_id"],
                    weight=weight,
                    relationship=rel["relationship_type"]
                ))
            else:
                print(f"Filtered out weak connection: {rel['source_id']} -> {rel['target_id']} (weight: {weight})")

        print(f"✓ Generated {len(edges)} high-quality relationships")
        return edges

    except Exception as e:
        print(f"Error analyzing relationships: {str(e)}")
        return []
