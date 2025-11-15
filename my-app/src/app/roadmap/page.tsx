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
import { House } from "lucide-react";

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

  useEffect(() => {
    fetch('http://localhost:8000/api/roadmaps/')
      .then(res => res.json())
      .then(data => {
        setRoadmaps(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading roadmaps...</div>;

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
              
              {roadmap.items.map(item =>(
                <Dialog key={item.title}>
                <DialogTrigger asChild>
                    <Card className="overflow-hidden w-80 cursor-pointer">
                        <CardHeader className="flex flex-row items-start justify-between gap-2">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                            {item.title}
                            <Badge variant="secondary">Level {item.level}</Badge>
                            </CardTitle>
                        </div>
                        {/* <Badge
                            variant={
                            item.status === "done"
                                ? "default"
                                : item.status === "in_progress"
                                ? "secondary"
                                : "outline"
                            }
                        >
                            {item.status.replace("_", " ")}
                        </Badge> */}
                        </CardHeader>

                        <Separator />
                            {/* <CardContent className="py-1">
                            <div className="mb-2 text-sm text-muted-foreground">
                                Progress
                            </div>
                            <Progress value={it.progress ?? (it.status === "done" ? 100 : 0)} />
                            </CardContent> */}

                    </Card>
                </DialogTrigger>
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
              ))}
              
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RoadmapPage
