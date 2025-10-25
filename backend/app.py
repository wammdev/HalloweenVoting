"""
FastAPI application for Halloween Voting System
"""
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import os
import uuid
from PIL import Image
from io import BytesIO

from config import (
    UPLOAD_DIR,
    MAX_FILE_SIZE,
    ALLOWED_EXTENSIONS,
    ALLOWED_ORIGINS,
    RESULTS_PASSWORD,
)
from models import (
    Entry,
    VoteCreate,
    Vote,
    ResultsResponse,
    CategoryResult,
    Category,
    ResultsRequest,
)
import database

app = FastAPI(title="Halloween Voting API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific GitHub Pages URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create upload directory
Path(UPLOAD_DIR).mkdir(exist_ok=True)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await database.init_db()
    print("✅ Database initialized")
    print(f"📁 Upload directory: {Path(UPLOAD_DIR).absolute()}")
    print(f"🔒 Results password: {RESULTS_PASSWORD}")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Halloween Voting System API",
        "endpoints": {
            "entries": "/api/entries",
            "votes": "/api/votes",
            "results": "/api/results",
            "categories": "/api/categories",
        },
    }


@app.get("/api/categories", response_model=list[Category])
async def get_categories():
    """Get all voting categories"""
    categories = await database.get_categories()
    return [
        Category(id=cat["id"], name=cat["name"], order=cat["display_order"])
        for cat in categories
    ]


@app.post("/api/entries", response_model=Entry)
async def create_entry(
    name: str = Form(...),
    costume_name: str = Form(...),
    photo: UploadFile = File(...),
):
    """Create a new costume entry with photo upload"""

    # Validate file extension
    file_ext = Path(photo.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    # Read file
    contents = await photo.read()

    # Validate file size
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size: {MAX_FILE_SIZE / 1024 / 1024}MB",
        )

    # Validate it's actually an image
    try:
        img = Image.open(BytesIO(contents))
        img.verify()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = Path(UPLOAD_DIR) / unique_filename

    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)

    # Create database entry
    entry_id = await database.create_entry(name, costume_name, unique_filename)

    # Get the created entry
    entries = await database.get_all_entries()
    entry = next((e for e in entries if e["id"] == entry_id), None)

    if not entry:
        raise HTTPException(status_code=500, detail="Failed to create entry")

    return Entry(
        id=entry["id"],
        name=entry["name"],
        costume_name=entry["costume_name"],
        photo_url=f"/api/uploads/{entry['photo_filename']}",
        created_at=entry["created_at"],
    )


@app.get("/api/entries", response_model=list[Entry])
async def get_entries():
    """Get all costume entries"""
    entries = await database.get_all_entries()
    return [
        Entry(
            id=entry["id"],
            name=entry["name"],
            costume_name=entry["costume_name"],
            photo_url=f"/api/uploads/{entry['photo_filename']}",
            created_at=entry["created_at"],
        )
        for entry in entries
    ]


@app.post("/api/votes")
async def create_vote(vote: VoteCreate):
    """Submit a vote for an entry in a category"""
    try:
        vote_id = await database.create_vote(
            category=vote.category,
            entry_id=vote.entry_id,
            voter_id=vote.voter_id,
        )
        return {"success": True, "vote_id": vote_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create vote")


@app.post("/api/results", response_model=list[ResultsResponse])
async def get_results(request: ResultsRequest):
    """Get voting results (password protected)"""
    if request.password != RESULTS_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid password")

    results = await database.get_results()

    response = []
    for category_id, entries in results.items():
        category_name = next(
            (cat["name"] for cat in await database.get_categories() if cat["id"] == category_id),
            category_id
        )

        category_results = [
            CategoryResult(
                entry_id=entry["entry_id"],
                name=entry["name"],
                costume_name=entry["costume_name"],
                photo_url=f"/api/uploads/{entry['photo_filename']}",
                vote_count=entry["vote_count"],
            )
            for entry in entries
        ]

        response.append(
            ResultsResponse(category=category_name, results=category_results)
        )

    return response


@app.get("/api/uploads/{filename}")
async def get_upload(filename: str):
    """Serve uploaded images"""
    file_path = Path(UPLOAD_DIR) / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    # Security: ensure file is in upload directory
    if not file_path.resolve().is_relative_to(Path(UPLOAD_DIR).resolve()):
        raise HTTPException(status_code=403, detail="Access denied")

    return FileResponse(file_path)


if __name__ == "__main__":
    import uvicorn

    print("🎃 Starting Halloween Voting System API...")
    print("📝 Access API docs at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
