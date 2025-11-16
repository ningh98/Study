'use client';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { API_ENDPOINTS } from "@/lib/api";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useEffect, useState } from 'react';
import { Compass, Lock, CheckCircle, Cloud, Flag, Anchor, Map, Trash2, Sparkles, Waves } from "lucide-react";

interface RoadmapItem {
  id: number;
  title: string;
  summary: string;
  level: number;
  study_material: string[];
}

interface Roadmap {
  id: number;
  topic: string;
  experience: string;
  items: RoadmapItem[];
}

const RoadmapPage = () => {

  const [roadmaps, setRoadmaps] = useState<Roadmap[]>();
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Fetch roadmaps
    fetch(API_ENDPOINTS.roadmaps.base)
      .then(res => res.json())
      .then(data => {
        // Sort roadmaps by ID in descending order (newest first)
        const sortedData = data.sort((a: Roadmap, b: Roadmap) => b.id - a.id);
        setRoadmaps(sortedData);
        setLoading(false);
      });

    // Fetch progress/unlocked items
    fetch(API_ENDPOINTS.progress.unlocked())
      .then(res => res.json())
      .then(data => {
        setCompletedIds(new Set(data.unlocked_ids));
      })
      .catch(err => {
        console.error('Error fetching progress:', err);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Compass className="w-16 h-16 text-cyan-600 mx-auto mb-4 animate-spin" />
          <p className="text-lg text-gray-700">Charting your expeditions...</p>
        </div>
      </div>
    );
  }

  // Check if a level is unlocked for a roadmap
  const isLevelUnlocked = (roadmap: Roadmap, level: number): boolean => {
    if (level === 1) return true; // Level 1 always unlocked
    
    // Check if all items from previous level are complete
    const prevLevelItems = roadmap.items.filter(item => item.level === level - 1);
    
    // FIX: If there are no items in the previous level, the level should NOT be unlocked
    // This prevents Array.every() from returning true for empty arrays
    if (prevLevelItems.length === 0) return false;
    
    return prevLevelItems.every(item => completedIds.has(item.id));
  };

  // Check if item is completed
  const isItemCompleted = (itemId: number): boolean => {
    return completedIds.has(itemId);
  };

  const handleDeleteRoadmap = async (roadmapId: number, topic: string) => {
    if (!confirm(`Are you sure you want to abandon the "${topic}" expedition?`)) {
      return;
    }
    
    try {
      const response = await fetch(API_ENDPOINTS.roadmaps.delete(roadmapId.toString()), {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // Remove from state to update UI
        setRoadmaps(roadmaps?.filter(r => r.id !== roadmapId));
      } else {
        alert('Failed to delete expedition');
      }
    } catch (error) {
      console.error('Error deleting expedition:', error);
      alert('Error deleting expedition');
    }
  };

  // Get level name based on number
  const getLevelName = (level: number): string => {
    const names = ['Beginner Bay', 'Intermediate Isles', 'Advanced Archipelago', 'Expert Ocean'];
    return names[level - 1] || `Region ${level}`;
  };

  // Calculate completion percentage
  const getCompletionPercentage = (roadmap: Roadmap): number => {
    const completed = roadmap.items.filter(item => completedIds.has(item.id)).length;
    return Math.round((completed / roadmap.items.length) * 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <Waves className="absolute top-10 left-20 w-64 h-64 text-cyan-600" />
        <Anchor className="absolute bottom-20 right-10 w-48 h-48 text-blue-600" />
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
            <Link href="/knowledge-graph">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-blue-700 hover:bg-blue-50">
                <Map className="w-4 h-4 mr-2" />
                Knowledge Map
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Your Learning Expeditions
          </h2>
          <p className="text-gray-600">Navigate through your knowledge islands and unlock new territories</p>
        </div>

        {roadmaps && roadmaps.length === 0 ? (
          <div className="text-center py-20">
            <Map className="w-24 h-24 text-cyan-300 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No Expeditions Yet</h3>
            <p className="text-gray-600 mb-6">Start your first learning adventure!</p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                <Compass className="w-4 h-4 mr-2" />
                Begin New Expedition
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {roadmaps?.map(roadmap => {
              const completion = getCompletionPercentage(roadmap);
              
              return (
                <div key={roadmap.id} className="bg-white/70 backdrop-blur-sm rounded-3xl border-2 border-cyan-200/50 shadow-xl p-8 relative overflow-hidden">
                  {/* Map texture overlay */}
                  <div className="absolute inset-0 opacity-5 pointer-events-none">
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,.03)_10px,rgba(0,0,0,.03)_20px)]" />
                  </div>

                  {/* Header */}
                  <div className="relative mb-6 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Flag className="w-6 h-6 text-cyan-600" />
                        <h3 className="text-2xl font-bold text-gray-900">{roadmap.topic}</h3>
                        {completion === 100 && (
                          <Sparkles className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Map className="w-4 h-4" />
                          {roadmap.items.length} Islands
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4" />
                          {completion}% Explored
                        </span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleDeleteRoadmap(roadmap.id, roadmap.topic)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Abandon
                    </Button>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-8">
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-500 rounded-full"
                        style={{ width: `${completion}%` }}
                      />
                    </div>
                  </div>

                  {/* Islands */}
                  <div className="relative">
                    {/* Sailing route line */}
                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-300 via-blue-300 to-indigo-300 opacity-40" 
                         style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 10px, currentColor 10px, currentColor 20px)' }} />
                    
                    <div className="space-y-4 relative">
                      {roadmap.items.map((item, index) => {
                        const isCompleted = isItemCompleted(item.id);
                        const isUnlocked = isLevelUnlocked(roadmap, item.level);
                        const isLocked = !isUnlocked;

                        return (
                          <div key={item.id} className="relative pl-16">
                            {/* Island marker */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg transition-all ${
                                isCompleted 
                                  ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                                  : isLocked 
                                  ? 'bg-gradient-to-br from-gray-300 to-gray-400'
                                  : 'bg-gradient-to-br from-cyan-400 to-blue-500'
                              }`}>
                                {isCompleted ? (
                                  <CheckCircle className="w-6 h-6 text-white" />
                                ) : isLocked ? (
                                  <Cloud className="w-6 h-6 text-white" />
                                ) : (
                                  <Compass className="w-6 h-6 text-white" />
                                )}
                              </div>
                            </div>

                            <Dialog>
                              <DialogTrigger asChild disabled={isLocked}>
                                <Card className={`cursor-pointer transition-all hover:shadow-lg ${
                                  isCompleted
                                    ? 'border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50'
                                    : isLocked
                                    ? 'opacity-60 cursor-not-allowed bg-gray-50 pointer-events-none'
                                    : 'border-2 border-cyan-200 hover:border-cyan-400 bg-white'
                                }`}>
                                  <CardHeader>
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <CardTitle className="flex items-center gap-2 text-lg">
                                          {item.title}
                                          {isLocked && <Lock className="w-4 h-4 text-gray-400" />}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 mt-2">
                                          <Badge variant="secondary" className="text-xs">
                                            {getLevelName(item.level)}
                                          </Badge>
                                          {isCompleted && (
                                            <Badge className="bg-green-500 text-xs">
                                              ⚓ Conquered
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </CardHeader>
                                </Card>
                              </DialogTrigger>

                              <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                  <DialogTitle className="flex items-center gap-2">
                                    <Flag className="w-5 h-5 text-cyan-600" />
                                    {item.title}
                                  </DialogTitle>
                                  <DialogDescription>
                                    {item.summary}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <div className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                      <Map className="w-4 h-4" />
                                      Study Materials
                                    </div>
                                    <div className="grid gap-2">
                                      {item.study_material.map((mat, idx) => (
                                        <div key={idx} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                                          {mat}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  <Separator />
                                  {isCompleted && (
                                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                                      <CheckCircle className="w-5 h-5" />
                                      <span className="font-semibold">Island Conquered!</span>
                                    </div>
                                  )}
                                </div>
                                <DialogFooter className="sm:justify-start">
                                  <DialogClose asChild>
                                    <Button type="button" variant="secondary">
                                      Close
                                    </Button>
                                  </DialogClose>
                                  <Link href={`/quiz/${item.id}`} className="ml-auto">
                                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                                      {isCompleted ? 'Retake Challenge' : 'Take Island Challenge'}
                                    </Button>
                                  </Link>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default RoadmapPage;
