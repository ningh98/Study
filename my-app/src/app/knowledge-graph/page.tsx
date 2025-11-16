'use client';
import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Compass, Telescope, Map as MapIcon, Anchor, Sparkles } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

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
  const [highlightNodeId, setHighlightNodeId] = useState<string | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);

  useEffect(() => {
    // Load new unlocks from localStorage
    const newUnlocks = JSON.parse(localStorage.getItem('new_unlocks') || '[]');
    setHighlightNodeId(newUnlocks.length > 0 ? 'new' : null);

    // Clear query params if present
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('highlight')) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    const fetchGraphData = async () => {
      try {
        setLoading(true);

        // Fetch graph data
        const graphResponse = await fetch(API_ENDPOINTS.knowledgeGraph);
        if (!graphResponse.ok) {
          throw new Error(`HTTP error! status: ${graphResponse.status}`);
        }
        const graphData = await graphResponse.json();
        setGraphData(graphData);

        // Fetch unlocked progress
        const progressResponse = await fetch(API_ENDPOINTS.progress.unlocked());
        if (progressResponse.ok) {
          const progressData = await progressResponse.json();
          setUnlockedIds(new Set(progressData.unlocked_ids));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load knowledge map');
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
          <Anchor className="absolute top-20 left-20 w-32 h-32 text-cyan-600" />
          <Compass className="absolute bottom-20 right-20 w-24 h-24 text-blue-600 animate-pulse" />
        </div>

        <div className="text-center relative z-10">
          <Telescope className="w-16 h-16 text-cyan-600 mx-auto mb-4 animate-pulse" />
          <div className="text-xl font-semibold text-gray-800 mb-2">Charting Your Knowledge Map...</div>
          <div className="text-gray-600">Discovering connections between islands</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center p-6">
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl p-8 shadow-xl border-2 border-red-200">
          <MapIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <div className="text-xl font-semibold text-red-600 mb-2">Map Not Available</div>
          <div className="text-gray-700 mb-6">{error}</div>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
          >
            <Compass className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <Anchor className="absolute top-10 right-20 w-32 h-32 text-cyan-600" />
        <Sparkles className="absolute bottom-20 left-20 w-24 h-24 text-blue-600" />
      </div>

      {/* Navigation Bar */}
      <nav className="w-full border-b border-cyan-200/50 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Compass className="w-6 h-6 text-cyan-600" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Compass
            </h1>
          </Link>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-cyan-700 hover:bg-cyan-50">
                <Compass className="w-4 h-4 mr-2" />
                New Expedition
              </Button>
            </Link>
            <Link href="/roadmap">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-blue-700 hover:bg-blue-50">
                <MapIcon className="w-4 h-4 mr-2" />
                My Expeditions
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 relative z-10">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Telescope className="w-8 h-8 text-cyan-600" />
            <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Knowledge Map
            </h2>
          </div>
          <p className="text-gray-700 text-lg flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-gray-600" />
            Chart your learning voyage - see all discovered islands and their connections
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border-2 border-cyan-200/50 p-6 relative overflow-hidden">
          {/* Map texture overlay */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,.03)_10px,rgba(0,0,0,.03)_20px)]" />
          </div>

          <div className="relative z-10">
            <KnowledgeGraph
              graphData={graphData}
              unlockedIds={unlockedIds}
              highlightNodeId={highlightNodeId}
              onHighlightDismiss={() => setHighlightedNodeIds([])}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-cyan-200/50">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-600" />
            Map Legend
          </h3>
          
          {/* Island Status */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Island Status</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 border-2 border-white shadow"></div>
                <span className="text-gray-700">⚓ Conquered (Completed)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 border-2 border-white shadow"></div>
                <span className="text-gray-700">🗺️ Discovered (Unlocked)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-gray-400 border-2 border-white shadow opacity-40"></div>
                <span className="text-gray-700">☁️ Uncharted (Locked)</span>
              </div>
            </div>
          </div>

          {/* Island Types */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Island Types</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white shadow"></div>
                <span className="text-gray-700">Large circles = Main Topics</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-cyan-500 border-2 border-white shadow"></div>
                <span className="text-gray-700">Small circles = Sub-topics</span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-2 italic">Colors distinguish different expeditions</p>
          </div>

          {/* Connection Types (Routes) */}
          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Navigation Routes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-500"></div>
                <span className="text-gray-700"><strong>Contains:</strong> Topic includes sub-topic</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-red-500"></div>
                <span className="text-gray-700"><strong>Prerequisite:</strong> Required before</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-green-500"></div>
                <span className="text-gray-700"><strong>Complementary:</strong> Builds upon</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-500"></div>
                <span className="text-gray-700"><strong>Conceptual:</strong> Similar concepts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-orange-500"></div>
                <span className="text-gray-700"><strong>Transfer:</strong> Cross-domain link</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Import the graph component dynamically to avoid SSR issues
import dynamic from 'next/dynamic';

const KnowledgeGraph = dynamic(() => import('@/components/KnowledgeGraph'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <Compass className="w-12 h-12 text-cyan-600 mb-3 animate-spin" />
      <p className="text-gray-700">Rendering map...</p>
    </div>
  )
});

export default KnowledgeGraphPage;
