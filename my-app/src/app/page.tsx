'use client'
import { Button } from "@/components/ui/button";
import { Search, Map, Compass, Loader2, Anchor, Telescope, Flag, Sparkles } from "lucide-react"
import Link from 'next/link'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_ENDPOINTS } from "@/lib/api";

export default function Home() {
  const [topic, setTopic] = useState('');
  const [experience, setExperience] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(API_ENDPOINTS.roadmaps.generate, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, experience })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate roadmap');
      }
      
      const data = await response.json();
      console.log('Generated roadmap:', data);
      
      // Redirect to roadmap page
      router.push('/roadmap');
    } catch (error) {
      console.error('Error generating roadmap:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate roadmap. Please try again.');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setLoading(false);
  };

  return (
    <>
      {/* Full-Page Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 flex items-center justify-center">
          {/* Background decorations */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
            <Anchor className="absolute top-20 left-20 w-32 h-32 text-cyan-600 animate-pulse" />
            <Compass className="absolute bottom-20 right-20 w-24 h-24 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
            <Flag className="absolute top-40 right-40 w-20 h-20 text-indigo-600 animate-bounce" />
          </div>

          {/* Loading Content */}
          <div className="relative z-10 text-center max-w-md px-6">
            <div className="mb-8">
              <Compass className="w-24 h-24 text-cyan-600 mx-auto animate-spin" style={{ animationDuration: '2s' }} />
            </div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent mb-4">
              Charting Your Course...
            </h2>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-center justify-center gap-2 animate-pulse">
                <Telescope className="w-5 h-5 text-cyan-600" />
                Discovering learning islands
              </p>
              <p className="flex items-center justify-center gap-2 animate-pulse" style={{ animationDelay: '0.5s' }}>
                <Map className="w-5 h-5 text-blue-600" />
                Plotting navigation routes
              </p>
              <p className="flex items-center justify-center gap-2 animate-pulse" style={{ animationDelay: '1s' }}>
                <Sparkles className="w-5 h-5 text-amber-500" />
                Preparing your expedition
              </p>
            </div>
            <p className="text-sm text-gray-600 mt-8 italic">
              This may take a moment...
            </p>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {error && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-red-200 p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Flag className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-red-600 mb-3">Course Plotting Failed</h3>
            <p className="text-gray-700 mb-6">{error}</p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={() => {
                  handleRetry();
                  handleSubmit(new Event('submit') as unknown as React.FormEvent);
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
              >
                <Compass className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={handleRetry}
                variant="outline"
                className="w-full border-gray-300"
              >
                Go Back
              </Button>
            </div>
            <p className="text-xs text-gray-600 mt-4">
              You can also refresh the page to start over
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 font-sans dark:bg-black relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 opacity-10">
          <Compass className="w-32 h-32 text-blue-600 animate-pulse" />
        </div>
        <div className="absolute bottom-20 right-10 opacity-10">
          <Anchor className="w-24 h-24 text-cyan-600" />
        </div>
      </div>

      {/* Navigation Bar */}
      <nav className="w-full border-b border-cyan-200/50 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-6 h-6 text-cyan-600" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
              Compass
            </h1>
          </div>
          <div className="flex gap-3">
            <Link href={'/roadmap'}>
              <Button variant="ghost" size="sm" className="text-cyan-700 hover:text-cyan-800 hover:bg-cyan-50">
                <Map className="w-4 h-4 mr-2" />
                My Expeditions
              </Button>
            </Link>
            <Link href={'/knowledge-graph'}>
              <Button variant="ghost" size="sm" className="text-blue-700 hover:text-blue-800 hover:bg-blue-50">
                <Telescope className="w-4 h-4 mr-2" />
                Knowledge Map
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative z-10">
        <div className="max-w-2xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-block mb-4">
              <div className="relative">
                <Compass className="w-16 h-16 text-cyan-600 mx-auto animate-bounce" />
                <Sparkles className="w-6 h-6 text-amber-400 absolute -top-1 -right-1 animate-pulse" />
              </div>
            </div>
            <h2 className="text-5xl font-bold bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Chart Your Learning Adventure
            </h2>
            <p className="text-xl text-gray-700">
              🗺️ Embark on a journey to discover new knowledge islands
            </p>
            <p className="text-base text-gray-600 mt-2">
              Navigate through unexplored territories and unlock hidden treasures of wisdom
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border-2 border-cyan-100 p-8 space-y-8">
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Flag className="w-4 h-4 text-cyan-600" />
                What territory do you want to explore?
              </label>
              <InputGroup>
                <InputGroupInput 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Machine Learning, Web Development, Piano..."
                  required
                  className="text-base border-cyan-200 focus:border-cyan-400"
                />
                <InputGroupAddon>
                  <Search className="w-5 h-5 text-cyan-600" />
                </InputGroupAddon>
              </InputGroup>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Telescope className="w-4 h-4 text-blue-600" />
                What&apos;s your current position on this map?
              </label>
              <InputGroup>
                <InputGroupTextarea 
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  placeholder="e.g., Just starting my voyage / Familiar with the basics / Ready for advanced exploration..."
                  required
                  rows={4}
                  className="text-base resize-none border-cyan-200 focus:border-cyan-400"
                />
              </InputGroup>
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                The more details you share, the better we can chart your course
              </p>
            </div>

            <Button 
              type="submit" 
              disabled={loading || !topic.trim() || !experience.trim()} 
              className="w-full py-6 text-base font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Charting Your Course...
                </>
              ) : (
                <>
                  <Compass className="w-5 h-5 mr-2" />
                  Begin Your Expedition
                  <Flag className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Feature Highlights */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-cyan-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-cyan-100 to-cyan-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Compass className="w-7 h-7 text-cyan-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-center">AI Navigator</h3>
              <p className="text-sm text-gray-600 text-center">Smart course charting based on your destination and experience</p>
            </div>
            <div className="p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-blue-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Map className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-center">Island Hopping</h3>
              <p className="text-sm text-gray-600 text-center">Progressive discovery - unlock new islands as you learn</p>
            </div>
            <div className="p-6 bg-white/70 backdrop-blur-sm rounded-2xl border border-indigo-100 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Telescope className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-center">Chart Progress</h3>
              <p className="text-sm text-gray-600 text-center">See your entire journey unfold on the knowledge map</p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
