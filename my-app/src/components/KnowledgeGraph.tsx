/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import ForceGraph2D from 'react-force-graph-2d';
import { useRef, useEffect } from 'react';

interface Node {
  id: string;
  label: string;
  type: string;
  roadmap_id: number | null;
  group: number | null;
}

interface Edge {
  source: string;
  target: string;
  weight: number;
  relationship: string;
}

interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

interface KnowledgeGraphProps {
  graphData: GraphData | null;
  unlockedIds: Set<number>;
}

const KnowledgeGraph = ({ graphData, unlockedIds }: KnowledgeGraphProps) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);

  // Colors for different groups (roadmaps)
  const groupColors = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Orange
    '#8B5CF6', // Purple
    '#06B6D4', // Cyan
    '#F97316', // Orange-red
    '#84CC16', // Lime
  ];

  // Helper function to extract roadmap_item_id from node id
  const getItemIdFromNode = (nodeId: string): number | null => {
    if (nodeId.startsWith('title_')) {
      return parseInt(nodeId.replace('title_', ''));
    }
    return null;
  };

  // Check if a node is unlocked
  const isNodeUnlocked = (node: Node): boolean => {
    if (node.type === 'topic') return true; // Topics always visible
    const itemId = getItemIdFromNode(node.id);
    return itemId ? unlockedIds.has(itemId) : false;
  };

  // Check if a topic is complete (all its title children are unlocked)
  const isTopicComplete = (topicId: string): boolean => {
    if (!graphData) return false;
    
    // Find all title nodes that belong to this topic (connected by "contains" relationship)
    const childTitles = graphData.edges
      .filter(edge => edge.source === topicId && edge.relationship === 'contains')
      .map(edge => graphData.nodes.find(n => n.id === edge.target))
      .filter((n): n is Node => n !== undefined);
    
    if (childTitles.length === 0) return false;
    
    return childTitles.every(child => {
      const itemId = getItemIdFromNode(child.id);
      return itemId ? unlockedIds.has(itemId) : false;
    });
  };

  useEffect(() => {
    // Zoom to fit when data changes
    if (fgRef.current && graphData && graphData.nodes.length > 0) {
      setTimeout(() => {
        fgRef.current.zoomToFit(400, 20);
      }, 500);
    }
  }, [graphData]);

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-500">
        <div className="text-center">
          <div className="text-4xl mb-2">🧠</div>
          <div>No knowledge graph data available</div>
          <div className="text-sm mt-1">Create some roadmaps to see connections</div>
        </div>
      </div>
    );
  }

  // Transform data for react-force-graph-2d with fog of war
  const transformedData = {
    nodes: graphData.nodes.map(node => ({
      id: node.id,
      label: node.label,
      type: node.type,
      group: node.group || 0,
      roadmap_id: node.roadmap_id,
      unlocked: isNodeUnlocked(node),
      topicComplete: node.type === 'topic' ? isTopicComplete(node.id) : false
    })),
    links: graphData.edges
      .filter(edge => {
        // Filter out links where either endpoint is locked
        const sourceNode = graphData.nodes.find(n => n.id === edge.source);
        const targetNode = graphData.nodes.find(n => n.id === edge.target);
        
        if (!sourceNode || !targetNode) return false;
        
        return isNodeUnlocked(sourceNode) && isNodeUnlocked(targetNode);
      })
      .map(edge => ({
        source: edge.source,
        target: edge.target,
        value: edge.weight,
        relationship: edge.relationship
      }))
  };

  return (
    <div>
      {/* Legend */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-800 mb-2">Graph Legend</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 border-2 border-white rounded-full"></div>
            <span>Large circles = Topics</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            <span>Small circles = Titles</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">(Colors distinguish different roadmaps)</span>
          </div>
        </div>
        <div className="mt-2 text-xs text-gray-600">
          <strong>Edge types:</strong> contains (topic→title), prerequisite (required before), complementary (builds on), conceptual (similar concepts), transfer (cross-domain)
        </div>
      </div>

      {/* Graph */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <ForceGraph2D
          ref={fgRef}
          graphData={transformedData}
          width={1200}
          height={700}
          backgroundColor="#f8f9fa"

          // Node styling with fog of war
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeColor={(node: any) => {
            // Locked title nodes - gray/faded
            if (node.type === 'title' && !node.unlocked) {
              return '#9CA3AF'; // Gray for locked
            }
            
            // Topic nodes - show completion status
            if (node.type === 'topic') {
              if (node.topicComplete) {
                return '#10B981'; // Green for completed topics
              }
              // Otherwise use group color but it means incomplete
            }
            
            // Unlocked nodes use normal group color
            const group = node.group || 0;
            return groupColors[group % groupColors.length];
          }}
          nodeVal={(node: any) => node.type === 'topic' ? 8 : 4} // Size based on type
          nodeLabel={(node: any) => {
            const type = node.type === 'topic' ? 'TOPIC' : 'TITLE';
            const status = node.type === 'topic' 
              ? (node.topicComplete ? ' ✓ (Complete)' : ' (In Progress)')
              : (node.unlocked ? ' ✓' : ' 🔒 (Locked)');
            
            return `<div style="background: rgba(255,255,255,0.9); padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
              <strong style="color: #333;">${node.label}${status}</strong><br/>
              <small style="color: #666;">${type}</small>
            </div>`;
          }}
          nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
            // Custom rendering for locked nodes - add opacity
            const label = node.label;
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            // Draw node circle
            const radius = node.type === 'topic' ? 8 : 4;
            ctx.beginPath();
            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
            
            // Apply opacity for locked nodes
            if (node.type === 'title' && !node.unlocked) {
              ctx.globalAlpha = 0.3;
            } else {
              ctx.globalAlpha = 1.0;
            }
            
            ctx.fillStyle = node.color || '#cccccc';
            ctx.fill();
            
            // Draw border for completed topics
            if (node.type === 'topic' && node.topicComplete) {
              ctx.strokeStyle = '#059669'; // Darker green
              ctx.lineWidth = 2;
              ctx.stroke();
            }
            
            ctx.globalAlpha = 1.0; // Reset opacity
          }}

          // Link styling
          linkWidth={(link: any) => Math.max(0.5, link.value / 2)} // Thicker edges for stronger connections
          linkColor={(link: any) => {
            switch (link.relationship) {
              case 'contains': return '#6B7280'; // Gray
              case 'prerequisite': return '#EF4444'; // Red
              case 'complementary': return '#10B981'; // Green
              case 'conceptual': return '#3B82F6'; // Blue
              case 'transfer': return '#F59E0B'; // Orange
              default: return '#6B7280';
            }
          }}
          linkLabel={(link: any) => {
            const colors = {
              contains: 'text-gray-700',
              prerequisite: 'text-red-700',
              complementary: 'text-green-700',
              conceptual: 'text-blue-700',
              transfer: 'text-orange-700'
            };
            return `<div class="${colors[link.relationship as keyof typeof colors] || 'text-gray-700'} text-sm px-2 py-1 bg-white rounded border">
              ${link.relationship}
            </div>`;
          }}

          // Interactions
          onNodeClick={(node: any) => {
            // Center on clicked node
            fgRef.current.centerAt(node.x, node.y, 1000);
            fgRef.current.zoom(2, 2000);
          }}

          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}

          // Force simulation settings
          d3VelocityDecay={0.3}
          d3AlphaMin={0.05}

          // Hover effects
          onNodeHover={(node: any, prevNode: any) => {
            // Highlight connected nodes on hover (optional enhancement)
          }}

          enableNodeDrag={true}
        />
      </div>

      {/* Statistics */}
      <div className="mt-4 text-sm text-gray-600">
        <div className="flex gap-6">
          <span><strong>Topics:</strong> {graphData.nodes.filter(n => n.type === 'topic').length}</span>
          <span><strong>Titles:</strong> {graphData.nodes.filter(n => n.type === 'title').length}</span>
          <span><strong>Connections:</strong> {graphData.edges.length}</span>
          <span><strong>Roadmaps:</strong> {new Set(graphData.nodes.map(n => n.roadmap_id)).size}</span>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeGraph;
