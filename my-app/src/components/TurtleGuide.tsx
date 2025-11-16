"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X, Sparkles, Compass, Map, Eye, EyeOff } from "lucide-react";
import { API_ENDPOINTS } from "@/lib/api";

interface TurtleState {
  total_unlocks: number;
  turtle_phase: number;
  should_show_discovery: boolean;
  turtle_visible: boolean;
  unlocks_until_next_discovery: number;
}

interface TopicSuggestion {
  topic: string;
  reason: string;
  suggestion_type: string;
  description: string;
}

interface DiscoveryData {
  suggestions: TopicSuggestion[];
  completed_topics: string[];
  turtle_message: string;
}

export default function TurtleGuide() {
  const pathname = usePathname();
  const [turtleState, setTurtleState] = useState<TurtleState | null>(null);
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [discoveryData, setDiscoveryData] = useState<DiscoveryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState(true);

  // Fetch turtle state
  const fetchTurtleState = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.progress.turtleState());
      if (response.ok) {
        const data = await response.json();
        setTurtleState(data);

        // Auto-trigger discovery ONLY on roadmap page
        const isRoadmapPage = pathname === '/roadmap';
        if (data.should_show_discovery && !showDiscovery && isRoadmapPage) {
          await triggerDiscovery();
        }
      }
    } catch (error) {
      console.error('Error fetching turtle state:', error);
      // Backend not available - set default state to prevent crashes
      setTurtleState({
        total_unlocks: 0,
        turtle_phase: 0,
        should_show_discovery: false,
        turtle_visible: true,
        unlocks_until_next_discovery: 3
      });
    }
  };

  // Trigger discovery modal
  const triggerDiscovery = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.roadmaps.discover(), {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        setDiscoveryData(data);
        setShowDiscovery(true);
        setMinimized(false);

        // Mark discovery as shown
        await fetch(API_ENDPOINTS.progress.markDiscoveryShown(), {
          method: 'POST',
        });
      }
    } catch (error) {
      console.error('Error triggering discovery:', error);
    } finally {
      setLoading(false);
    }
  };

  // Accept a suggestion
  const acceptSuggestion = async (topic: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        API_ENDPOINTS.roadmaps.acceptSuggestion(topic),
        { method: 'POST' }
      );
      
      if (response.ok) {
        const newRoadmap = await response.json();
        console.log('New roadmap created:', newRoadmap);
        
        // Refresh the page to show new roadmap
        window.location.href = '/roadmap';
      }
    } catch (error) {
      console.error('Error accepting suggestion:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle turtle visibility
  const toggleVisibility = async () => {
    if (!turtleState) return;
    
    const newVisibility = !turtleState.turtle_visible;
    try {
      await fetch(API_ENDPOINTS.progress.turtleVisibility, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          turtle_visible: newVisibility,
          user_id: 'default_user'
        })
      });
      
      setTurtleState({ ...turtleState, turtle_visible: newVisibility });
    } catch (error) {
      console.error('Error toggling visibility:', error);
    }
  };

  useEffect(() => {
    // Fetch once on mount
    fetchTurtleState();
    
    // Refetch when page becomes visible (user returns from quiz)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchTurtleState();
      }
    };
    
    // Refetch when window gains focus (more reliable than visibilitychange)
    const handleFocus = () => {
      fetchTurtleState();
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Don't show if phase 0 (not unlocked yet)
  if (!turtleState || turtleState.turtle_phase === 0) {
    return null;
  }

  // If hidden, show minimal "Show Guide" button
  if (!turtleState.turtle_visible) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleVisibility}
          className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 hover:from-green-400 hover:to-emerald-500 shadow-lg flex items-center justify-center text-2xl transition-all duration-300 hover:scale-110 opacity-50 hover:opacity-100"
          title="Show Turtle Guide"
        >
          <Eye className="w-5 h-5 text-white" />
        </button>
      </div>
    );
  }

  // Cloud guide image (same for all phases)
  const getGuideImage = () => {
    return "/cloud-phase1.svg";
  };

  const getPhaseMessage = () => {
    switch (turtleState.turtle_phase) {
      case 1:
        return "H-hello there...";
      case 2:
        return "You're doing great!";
      case 3:
        return "Welcome back, explorer!";
      default:
        return "Hello!";
    }
  };

  return (
    <>
      {/* Floating Turtle Button */}
      <div
        className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${
          minimized ? 'scale-100' : 'scale-110'
        }`}
      >
        <div className="relative">
          {/* Notification badge when suggestions are ready */}
          {turtleState.should_show_discovery && (
            <div className="absolute -top-1 -right-1 z-10">
              <span className="relative flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 items-center justify-center text-white text-xs font-bold shadow-lg">
                  !
                </span>
              </span>
            </div>
          )}
          
          {/* Turtle with animation */}
          <button
            onClick={() => setMinimized(!minimized)}
            className={`w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-xl flex items-center justify-center hover:scale-110 transition-all duration-300 p-2 ${
              turtleState.turtle_phase === 1 ? 'animate-pulse' : 'animate-bounce'
            }`}
            title={getPhaseMessage()}
          >
            <img 
              src={getGuideImage()} 
              alt="Learning Guide" 
              className="w-full h-full object-contain"
            />
          </button>

          {/* Speech bubble when not minimized */}
          {!minimized && (
            <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-lg p-3 w-48 border-2 border-green-300 animate-in slide-in-from-bottom">
              <p className="text-sm text-gray-700">{getPhaseMessage()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {turtleState.unlocks_until_next_discovery === 0
                  ? "I have suggestions! 🎉"
                  : `${turtleState.unlocks_until_next_discovery} more to discover something!`}
              </p>
              <div className="flex gap-1 mt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={toggleVisibility}
                  className="p-1 h-6"
                >
                  <EyeOff className="w-3 h-3" />
                </Button>
                {turtleState.should_show_discovery && (
                  <Button
                    size="sm"
                    onClick={triggerDiscovery}
                    disabled={loading}
                    className="flex-1 h-6 text-xs bg-gradient-to-r from-green-500 to-emerald-600"
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    Suggestions
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discovery Modal */}
      <Dialog open={showDiscovery} onOpenChange={setShowDiscovery}>
        <DialogContent className="sm:max-w-2xl border-4 border-green-400 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-5xl animate-bounce shadow-xl">
                🐢
              </div>
              <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Your Learning Guide
              </DialogTitle>
              {discoveryData && (
                <p className="text-center text-gray-700 italic px-4">
                  &ldquo;{discoveryData.turtle_message}&rdquo;
                </p>
              )}
            </div>
          </DialogHeader>

          {discoveryData && (
            <div className="space-y-4 mt-4">
              <div className="bg-white/60 rounded-lg p-3 border border-green-200">
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  You&apos;ve mastered:
                </p>
                <div className="flex flex-wrap gap-2">
                  {discoveryData.completed_topics.map((topic, idx) => (
                    <span
                      key={idx}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full border border-green-300"
                    >
                      ✓ {topic}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Suggested Learning Paths
                </h3>

                <div className="space-y-3">
                  {discoveryData.suggestions.map((suggestion, idx) => (
                    <Card
                      key={idx}
                      className="border-2 border-green-200 hover:border-green-400 transition-all"
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-300">
                                {suggestion.suggestion_type.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                            <h4 className="font-bold text-gray-800">{suggestion.topic}</h4>
                            <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                            <p className="text-xs text-gray-500 mt-2">{suggestion.description}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => acceptSuggestion(suggestion.topic)}
                          disabled={loading}
                          size="sm"
                          className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                        >
                          <Map className="w-4 h-4 mr-2" />
                          Add to My Journey
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => setShowDiscovery(false)}
                variant="outline"
                className="w-full border-2 border-green-300 hover:bg-green-50"
              >
                Maybe Later
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
