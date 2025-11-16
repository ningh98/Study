# Compass 🧭

**Navigate Your Learning Journey with AI-Powered Guidance**

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-black.svg)](https://nextjs.org/)

---

## 🎯 Problem

Learning new topics is overwhelming. Generic roadmaps don't fit individual needs, it's hard to see connections between topics, and learners often don't know what to study next. Without personalized guidance, motivation drops and completion rates suffer.

## 💡 Solution

**Compass** is an AI-powered learning platform that generates **personalized learning roadmaps** based on your experience level. It features:

- **AI-Generated Roadmaps** – Tailored learning paths with curated study materials
- **Interactive Knowledge Graph** – Visualize connections between topics you're learning
- **Progress Tracking** – Complete quizzes to unlock new topics and track your journey
- **AI Companion** – Discover new learning paths as you progress (evolves with your achievements)
- **Adaptive Discovery** – AI suggests related topics based on what you've completed


## 📊 Impact

- **Reduces Learning Overwhelm** – Clear, personalized paths instead of generic tutorials
- **Increases Completion Rates** – Gamification and milestones keep learners engaged
- **Builds Interconnected Knowledge** – Visual graph shows how concepts relate
- **Democratizes Personalized Education** – Everyone gets AI-powered guidance
- **Future: Social Learning** – Connect with others on similar learning journeys
---

## 📦 Features

### 🗺️ AI-Powered Roadmap Generation
Enter any topic and your experience level. Google Gemini AI generates a personalized 3-level roadmap with study materials and quiz questions.

### 📚 Study Materials & Quizzes
Each roadmap item includes curated learning resources and 4 quiz questions to test your understanding.

### 🔗 Interactive Knowledge Graph
View all your roadmaps as an interconnected graph. See how different topics relate and build upon each other.

### 🤖 AI Companion System
An evolving companion appears as you progress, analyzing your learning journey and suggesting new topics every 3 milestones.

### 📊 Progress Tracking
Track completed topics, perfect scores, and milestones. The knowledge graph grows as you learn.

---

## 🛠️ Setup & Installation

### Prerequisites
- **Python 3.11+** with [uv](https://github.com/astral-sh/uv) package manager
- **Node.js 18+**
- **Google Gemini API Key** ([Get one here](https://aistudio.google.com/app/apikey))

### 1. Clone Repository
```bash
git clone https://github.com/ningh98/Study.git
cd Study
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies with uv
uv sync

# Create .env file
cp app/.env.example app/.env
# Edit app/.env and add your GEMINI_API_KEY

# Initialize database
uv run python seed_database.py
uv run python migrate_user_profiles.py

# Run backend server
uv run python main.py
# Backend runs at http://localhost:8000
```

### 3. Frontend Setup

```bash
cd my-app

# Install dependencies
npm install

# Create environment file (optional)
cp .env.local.example .env.local

# Run frontend
npm run dev
# Frontend runs at http://localhost:3000
```

### 4. Access the App
Open your browser and navigate to **http://localhost:3000**



---

## 🔮 What's Next

### Immediate Improvements
- **URL Validation** – Verify study material links are working and accessible
- **Enhanced Prompting** – Better alignment between quiz content and study materials
- **Database Migration** – PostgreSQL/MySQL for production deployment

### Future Enhancements
- **User Authentication** – Multi-user support with personal accounts
- **Social Features** – Find and connect with learners on similar paths
- **Mobile App** – React Native version for iOS/Android
- **Customizable Companions** – Let users choose their guide character
- **Export Roadmaps** – Download as PDF or Markdown
- **Spaced Repetition** – Smart quiz scheduling for better retention
- **Learning Analytics** – Insights into learning patterns and progress

---

## 🏗️ Tech Stack

**Frontend:**
- Next.js 16 (React 19)
- TypeScript
- TailwindCSS
- Radix UI Components
- react-force-graph-2d

**Backend:**
- FastAPI
- Python 3.11+
- SQLAlchemy ORM
- SQLite (development)
- Google Gemini AI API
- uv (package manager)

---

## 🙏 Acknowledgments

- Built with assistance from **Cline AI** coding assistant
- Powered by **Google Gemini AI**
- Icons from **Lucide React**
- **Force-Directed Graph** – Real-time visualization of knowledge relationships using react-force-graph-2d

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📸 Screenshots

*Coming soon – Screenshots and demo will be added here*

---

**Happy Learning!** 🎓✨

---

## 💭 About the Name

**Note:** This repository is currently named "Study" but the application is branded as **Compass**. You may want to rename the repository to better reflect the product name.
