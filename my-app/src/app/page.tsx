'use client'
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react"
import { ArrowRight } from 'lucide-react';
import Link from 'next/link'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupTextarea,
} from "@/components/ui/input-group"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function Home() {
  const [topic, setTopic] = useState('');
  const [experience, setExperience] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:8000/api/roadmaps/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, experience })
      });
      
      const data = await response.json();
      console.log('Generated roadmap:', data);
      
      // Redirect to roadmap page
      router.push('/roadmap');
    } catch (error) {
      console.error('Error generating roadmap:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <form onSubmit={handleSubmit}>
      <div className="grid w-full max-w-sm gap-6">
      <p>what do you want to learn</p>
      <InputGroup>
        <InputGroupInput 
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic I want to learn..." />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>
      <p>Tell me the part you want to learn the most, and previous experience about this topic</p>
      <InputGroup>
        <InputGroupTextarea 
          value={experience}
          onChange={(e) => setExperience(e.target.value)}
          placeholder="Ask, Search or Chat..." />
      </InputGroup>
      </div>
      <Button size="sm" type="submit" disabled={loading} variant="outline" className="mt-2">
          <ArrowRight /> {loading ? 'Generating...' : 'Generate Roadmap'}
      </Button>
      <Link href={'/roadmap'}>
      <Button>
        Roadmaps
      </Button>
      </Link>
      </form>
    </div>
  );
}
