// API Configuration
// This file provides a centralized way to manage API endpoints and configuration

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// API endpoints
export const API_ENDPOINTS = {
  // Knowledge Graph
  knowledgeGraph: `${API_BASE_URL}/api/knowledge-graph/`,
  
  // Progress
  progress: {
    unlocked: (userId: string = 'default_user') => 
      `${API_BASE_URL}/api/progress/unlocked?user_id=${userId}`,
    complete: `${API_BASE_URL}/api/progress/complete`,
    turtleState: (userId: string = 'default_user') => 
      `${API_BASE_URL}/api/progress/turtle-state?user_id=${userId}`,
    markDiscoveryShown: (userId: string = 'default_user') => 
      `${API_BASE_URL}/api/progress/mark-discovery-shown?user_id=${userId}`,
    turtleVisibility: `${API_BASE_URL}/api/progress/turtle-visibility`,
  },
  
  // Roadmaps
  roadmaps: {
    base: `${API_BASE_URL}/api/roadmaps/`,
    generate: `${API_BASE_URL}/api/roadmaps/generate`,
    discover: (userId: string = 'default_user') => 
      `${API_BASE_URL}/api/roadmaps/discover?user_id=${userId}`,
    acceptSuggestion: (topic: string, experience: string = 'Beginner', userId: string = 'default_user') =>
      `${API_BASE_URL}/api/roadmaps/accept-suggestion?topic=${encodeURIComponent(topic)}&experience=${experience}&user_id=${userId}`,
    delete: (roadmapId: string) => 
      `${API_BASE_URL}/api/roadmaps/${roadmapId}`,
  },
  
  // Quiz
  quiz: {
    get: (id: string) => `${API_BASE_URL}/api/quiz/${id}`,
  },
} as const;

// Helper function for making API requests with error handling
export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
}

export default API_ENDPOINTS;
