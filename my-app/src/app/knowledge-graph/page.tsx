'use client';
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { House } from "lucide-react";

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

const KnowledgeGraphPage = () => {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unlockedIds, setUnlockedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        setLoading(true);
        
        // Fetch graph data
        const graphResponse = await fetch('http://localhost:8000/api/knowledge-graph/');
        if (!graphResponse.ok) {
          throw new Error(`HTTP error! status: ${graphResponse.status}`);
        }
        const graphData = await graphResponse.json();
        setGraphData(graphData);

        // Fetch unlocked progress
        const progressResponse = await fetch('http://localhost:8000/api/progress/unlocked?user_id=default_user');
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          setUnlockedIds(new Set(progressData.unlocked_ids));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load knowledge graph');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4">Loading knowledge graph...</div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 text-red-600">Error loading knowledge graph</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Knowledge Graph</h1>
            <p className="text-gray-600 mt-2">
              Visual network of your learning topics and their connections
            </p>
          </div>
          <Link href="/">
            <Button>
              <House className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <KnowledgeGraph graphData={graphData} unlockedIds={unlockedIds} />
        </div>
      </div>
    </div>
  );
};

// Import the graph component dynamically to avoid SSR issues
import dynamic from 'next/dynamic';

const KnowledgeGraph = dynamic(() => import('@/components/KnowledgeGraph'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96">Loading graph...</div>
});

export default KnowledgeGraphPage;
