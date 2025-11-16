from typing import Union
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import roadmaps, quiz, knowledge_graph, progress

app = FastAPI(title="Roadmap Generator API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(roadmaps.router)
app.include_router(quiz.router)
app.include_router(knowledge_graph.router)
app.include_router(progress.router)

@app.get("/")
def read_root():
    return {"Message": "Roadmap Generator API"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: Union[str, None] = None):
    return {"item_id": item_id, "q": q}
