/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Compass, Flag, Anchor, Sparkles, Map } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { type Question } from "@/lib/data";

interface QuizData {
  roadmap_item_id: number;
  questions: Question[];
}

interface CompletionData {
  success: boolean;
  is_new_unlock: boolean;
  roadmap_item_id: number;
  item_title?: string;
  next_suggestion?: {
    id: number;
    title: string;
    reason: string;
  };
}

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [completionData, setCompletionData] = useState<CompletionData | null>(null);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:8000/api/quiz/${id}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Quiz not found');
        }
        return res.json();
      })
      .then(data => {
        setQuizData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  // Save progress when quiz is completed
  useEffect(() => {
    if (isComplete && quizData) {
      const questions = quizData?.questions || [];
      const isPerfectScore = score === questions.length;

      if (isPerfectScore) {
        // Save completion to backend
        fetch('http://localhost:8000/api/progress/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            roadmap_item_id: parseInt(id),
            score: score,
            total_questions: questions.length,
            user_id: 'default_user'
          })
        })
          .then(res => res.json())
          .then(data => {
            console.log('Progress saved:', data);
            setCompletionData(data);

            if (data.is_new_unlock) {
              // Store new unlock in localStorage for session highlights
              const existingNewUnlocks = JSON.parse(localStorage.getItem('new_unlocks') || '[]');
              if (!existingNewUnlocks.includes(`title_${parseInt(id)}`)) {
                existingNewUnlocks.push(`title_${parseInt(id)}`);
                localStorage.setItem('new_unlocks', JSON.stringify(existingNewUnlocks));
              }

              // Fetch item title for modal
              fetch('http://localhost:8000/api/roadmaps/')
                .then(res => res.json())
                .then((roadmaps: any[]) => {
                  const item = roadmaps.flatMap((r: any) => r.items).find((item: any) => item.id === parseInt(id));
                  if (item) {
                    setCompletionData(prev => ({ ...prev!, item_title: item.title }));
                  }
                  setShowUnlockModal(true);
                })
                .catch(err => {
                  console.error('Error fetching item title:', err);
                  setShowUnlockModal(true); // Show anyway without title
                });
            }
          })
          .catch(err => {
            console.error('Error saving progress:', err);
          });
      }
    }
  }, [isComplete, score, id, quizData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-cyan-200">
          <CardContent className="pt-6 text-center">
            <Compass className="w-12 h-12 text-cyan-600 mx-auto mb-3 animate-spin" />
            <p className="text-gray-700">Preparing island challenge...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !quizData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Flag className="w-5 h-5" />
              Challenge Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-700">{error || 'The island challenge is not available.'}</p>
            <Link href="/roadmap">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                <Map className="w-4 h-4 mr-2" />
                Return to Expeditions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const questions = quizData?.questions || [];

  const handleAnswerSelect = (index: number) => {
    setSelectedAnswer(index);
    if (index === questions[currentQuestion].correct) {
      setScore(score + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setIsComplete(true);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setScore(0);
    setIsComplete(false);
  };

  const getButtonClass = (index: number): string => {
    if (selectedAnswer === null) return "hover:bg-cyan-50 hover:border-cyan-300 border-2";
    if (index === questions[currentQuestion].correct) return "bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-500";
    if (selectedAnswer === index) return "bg-gradient-to-r from-red-100 to-rose-100 border-2 border-red-500";
    return "opacity-50 border-2";
  };

  const isPerfectScore = score === questions.length;

  if (isComplete) {
    return (
      <>
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
            <Anchor className="absolute top-20 right-20 w-32 h-32 text-cyan-600" />
            <Compass className="absolute bottom-20 left-20 w-24 h-24 text-blue-600" />
          </div>

          <Card className={`w-full max-w-md border-2 ${
            isPerfectScore 
              ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50' 
              : 'border-cyan-200 bg-white'
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 justify-center text-2xl">
                {isPerfectScore ? (
                  <>
                    <Sparkles className="w-6 h-6 text-amber-500" />
                    Island Conquered!
                    <Sparkles className="w-6 h-6 text-amber-500" />
                  </>
                ) : (
                  <>
                    <Flag className="w-6 h-6 text-cyan-600" />
                    Challenge Complete
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-6">
                <p className="text-3xl font-bold mb-2 bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  {score}/{questions.length}
                </p>
                <p className="text-sm text-gray-600">
                  {isPerfectScore 
                    ? '⚓ Perfect! You claimed this island!' 
                    : '🗺️ You need a perfect score to conquer the island'}
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <Link href="/roadmap" className="w-full">
                  <Button variant="outline" className="w-full border-cyan-300 hover:bg-cyan-50">
                    <Map className="w-4 h-4 mr-2" />
                    Return to Expeditions
                  </Button>
                </Link>
                <Button 
                  onClick={restartQuiz} 
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                  <Compass className="w-4 h-4 mr-2" />
                  Retry Challenge
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Unlock Modal - Island Conquered! */}
        <Dialog open={showUnlockModal} onOpenChange={setShowUnlockModal} modal>
          <DialogContent className="sm:max-w-md border-4 border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 overflow-hidden">
            <DialogHeader>
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center animate-bounce shadow-xl">
                    <Flag className="w-12 h-12 text-white" />
                  </div>
                  <Sparkles className="w-8 h-8 text-amber-500 absolute -top-2 -right-2 animate-pulse" />
                </div>
                <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  🏝️ Island Conquered!
                </DialogTitle>
                <p className="text-xl font-semibold text-center text-gray-800">
                  {completionData?.item_title || 'New Territory'}
                </p>
                <p className="text-sm text-gray-600 text-center">
                  ⚓ You&apos;ve claimed this knowledge island. New territories await!
                </p>
              </div>
            </DialogHeader>
            <div className="flex flex-col gap-3 mt-6 relative z-10">
              <Button
                onClick={() => {
                  setShowUnlockModal(false);
                  router.push('/roadmap');
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg"
              >
                <Map className="w-4 h-4 mr-2" />
                Back to Expeditions
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowUnlockModal(false);
                  router.push(`/knowledge-graph?highlight=title_${id}`);
                }}
                className="w-full border-2 border-cyan-300 hover:bg-cyan-50"
              >
                <Compass className="w-4 h-4 mr-2" />
                View on Knowledge Map
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-cyan-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-cyan-600" />
              No Challenges Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-gray-700">This island doesn&apos;t have challenges yet.</p>
            <Link href="/roadmap">
              <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700">
                <Map className="w-4 h-4 mr-2" />
                Return to Expeditions
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-5">
        <Compass className="absolute top-10 left-10 w-32 h-32 text-cyan-600 animate-pulse" />
        <Flag className="absolute top-20 right-20 w-24 h-24 text-blue-600" />
        <Anchor className="absolute bottom-10 right-10 w-28 h-28 text-indigo-600" />
      </div>

      {/* Quiz Card */}
      <Card className="w-full max-w-2xl border-2 border-cyan-200 bg-white/90 backdrop-blur-sm shadow-2xl relative z-10">
        <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between text-xl">
            <span className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Island Challenge
            </span>
            <span className="text-sm font-normal">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-gray-800 mb-6 text-lg font-medium">
            {questions[currentQuestion].question}
          </p>

          <div className="space-y-3">
            {questions[currentQuestion].options.map((option, index) => (
              <button
                key={index}
                onClick={() => selectedAnswer === null && handleAnswerSelect(index)}
                disabled={selectedAnswer !== null}
                className={`w-full p-4 text-left border rounded-xl transition-all duration-300 ${getButtonClass(index)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{option}</span>
                  {selectedAnswer !== null && index === questions[currentQuestion].correct && (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                  {selectedAnswer === index && index !== questions[currentQuestion].correct && (
                    <XCircle className="w-6 h-6 text-red-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Navigation Button */}
      <div className="mt-6 min-h-12 flex justify-center relative z-10">
        {selectedAnswer !== null && (
          <Button 
            onClick={handleNextQuestion}
            size="lg"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-lg px-8"
          >
            {currentQuestion < questions.length - 1 ? (
              <>
                Next Question
                <Compass className="w-4 h-4 ml-2" />
              </>
            ) : (
              <>
                <Flag className="w-4 h-4 mr-2" />
                Finish Challenge
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
