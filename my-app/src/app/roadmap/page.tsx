'use client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

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
import { roadmapItems } from "@/lib/data";
import { House, Lock, CheckCircle } from "lucide-react";

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
    fetch('http://localhost:8000/api/roadmaps/')
      .then(res => res.json())
      .then(data => {
        setRoadmaps(data);
        setLoading(false);
      });

    // Fetch progress/unlocked items
    fetch('http://localhost:8000/api/progress/unlocked?user_id=default_user')
      .then(res => res.json())
      .then(data => {
        setCompletedIds(new Set(data.unlocked_ids));
      })
      .catch(err => {
        console.error('Error fetching progress:', err);
      });
  }, []);

  if (loading) return <div>Loading roadmaps...</div>;

  // Check if a level is unlocked for a roadmap
  const isLevelUnlocked = (roadmap: Roadmap, level: number): boolean => {
    if (level === 1) return true; // Level 1 always unlocked
    
    // Check if all items from previous level are complete
    const prevLevelItems = roadmap.items.filter(item => item.level === level - 1);
    return prevLevelItems.every(item => completedIds.has(item.id));
  };

  // Check if item is completed
  const isItemCompleted = (itemId: number): boolean => {
    return completedIds.has(itemId);
  };

  const handleDeleteRoadmap = async (roadmapId: number) => {
  if (!confirm(`Are you sure you want to delete this roadmap?`)) {
    return;
  }
  
  try {
    const response = await fetch(`http://localhost:8000/api/roadmaps/${roadmapId}`, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      // Remove from state to update UI
      setRoadmaps(roadmaps?.filter(r => r.id !== roadmapId));
    } else {
      alert('Failed to delete roadmap');
    }
  } catch (error) {
    console.error('Error deleting roadmap:', error);
    alert('Error deleting roadmap');
  }
};

  // return (
  //   <div>
  //     {roadmaps?.map(roadmap => (
  //       <div key={roadmap.id}>
  //         <h2>{roadmap.topic}</h2>
  //         {roadmap.items.map(item => (
  //           <Card key={item.title}>
  //             <CardTitle>{item.title}</CardTitle>
  //             <p>{item.summary}</p>
  //             <Badge>Level {item.level}</Badge>
  //           </Card>
  //         ))}
  //       </div>
  //     ))}
  //   </div>
  // );

  return (
    <div className="relative">
      {/* vertical line */}
      <div className="absolute left-4 top-0 h-full w-px bg-muted" />
      <div className="space-y-4">
        <Link href={`/`}>
        <Button>
          <House /> 
        </Button>
        </Link>
        
        {roadmaps?.map(roadmap => {
          return (
            <div key={roadmap.id} className="relative pl-10">
              <div className="flex w-80 justify-between">
              <h2>{roadmap.topic}</h2>
              <Button 
                onClick={() => handleDeleteRoadmap(roadmap.id)}
                variant='destructive'>delete</Button>
              </div>
              
              {roadmap.items.map(item => {
                const isCompleted = isItemCompleted(item.id);
                const isUnlocked = isLevelUnlocked(roadmap, item.level);
                const isLocked = !isUnlocked;

                return (
                <Dialog key={item.id}>
                {isLocked ? (
                  // Render card without trigger for locked items
                  <Card className={`overflow-hidden w-80 relative transition-all opacity-50 cursor-not-allowed bg-gray-100 pointer-events-none`}>
                      <CardHeader className="flex flex-row items-start justify-between gap-2">
                      <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                          {item.title}
                          <Badge variant="secondary">Level {item.level}</Badge>
                          </CardTitle>
                      </div>
                      <div className="flex items-center gap-1">
                        <Lock className="w-5 h-5 text-gray-500" />
                      </div>
                      </CardHeader>

                      <Separator />

                  </Card>
                ) : (
                  // Render interactive card for unlocked items
                  <DialogTrigger asChild>
                      <Card className={`overflow-hidden w-80 relative transition-all ${
                        isCompleted
                          ? 'border-green-500 border-2 bg-green-50 cursor-pointer'
                          : 'cursor-pointer hover:shadow-md'
                      }`}>
                          <CardHeader className="flex flex-row items-start justify-between gap-2">
                          <div className="flex-1">
                              <CardTitle className="flex items-center gap-2">
                              {item.title}
                              <Badge variant="secondary">Level {item.level}</Badge>
                              </CardTitle>
                          </div>
                          <div className="flex items-center gap-1">
                            {isCompleted && <CheckCircle className="w-5 h-5 text-green-500" />}
                          </div>
                          </CardHeader>

                          <Separator />

                      </Card>
                  </DialogTrigger>
                )}
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{item.title}</DialogTitle>
                    <DialogDescription>
                      {item.summary}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                        <div className="text-sm text-muted-foreground mb-2">Study Material</div>
                        <div className="grid gap-2">
                        {item.study_material.map((mat, idx) => <div key={idx}>{mat}</div>)}
                        </div>
                    </div>
                    <Separator />
                    <div>
                    <div className="mb-2 text-sm text-muted-foreground">
                        Progress
                    </div>
                    {/* <Progress value={item.progress ?? (item.status === "done" ? 100 : 0)} /> */}
                    </div>
                    
                  </div>
                  <DialogFooter className="sm:justify-start">
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">
                        Close
                      </Button>
                    </DialogClose>
                    <Link href={`/quiz/${item.id}`} className="ml-auto">
                      <Button>Quiz</Button>
                    </Link>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              );
              })}
              
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RoadmapPage
