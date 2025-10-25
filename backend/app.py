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
    ADMIN_PASSWORD,
)
from models import (
    Entry,
    VoteCreate,
    Vote,
    ResultsResponse,
    CategoryResult,
    Category,
    ResultsRequest,
    MCQuestion,
    MCOption,
    MCVoteCreate,
    MCResultsResponse,
    MCOptionResult,
    AdminAuthRequest,
    AdminEntry,
    AdminVote,
    AdminMCVote,
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


@app.get("/api/mc-questions", response_model=list[MCQuestion])
async def get_mc_questions():
    """Get all multiple choice questions"""
    questions = await database.get_mc_questions()
    return [
        MCQuestion(
            id=q["id"],
            question=q["question"],
            display_order=q["display_order"],
            options=[
                MCOption(id=opt["id"], option_text=opt["option_text"])
                for opt in q["options"]
            ]
        )
        for q in questions
    ]


@app.post("/api/mc-votes")
async def create_mc_vote(vote: MCVoteCreate):
    """Submit a vote for a multiple choice question"""
    try:
        vote_id = await database.create_mc_vote(
            question_id=vote.question_id,
            option_id=vote.option_id,
            voter_id=vote.voter_id,
        )
        return {"success": True, "vote_id": vote_id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create vote")


@app.post("/api/results")
async def get_results(request: ResultsRequest):
    """Get voting results (password protected)"""
    if request.password != RESULTS_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid password")

    # Get costume category results
    results = await database.get_results()

    category_results = []
    for category_id, entries in results.items():
        category_name = next(
            (cat["name"] for cat in await database.get_categories() if cat["id"] == category_id),
            category_id
        )

        category_results.append({
            "category": category_name,
            "results": [
                {
                    "entry_id": entry["entry_id"],
                    "name": entry["name"],
                    "costume_name": entry["costume_name"],
                    "photo_url": f"/api/uploads/{entry['photo_filename']}",
                    "vote_count": entry["vote_count"],
                }
                for entry in entries
            ]
        })

    # Get multiple choice results
    mc_results = await database.get_mc_results()

    mc_results_list = [
        {
            "question_id": q_id,
            "question": data["question"],
            "options": [
                {
                    "option_id": opt["option_id"],
                    "option_text": opt["option_text"],
                    "vote_count": opt["vote_count"],
                }
                for opt in data["options"]
            ]
        }
        for q_id, data in mc_results.items()
    ]

    return {
        "category_results": category_results,
        "mc_results": mc_results_list
    }


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


# Admin endpoints

@app.post("/api/admin/auth")
async def admin_auth(request: AdminAuthRequest):
    """Authenticate admin with password"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")
    return {"success": True, "message": "Authenticated"}


@app.get("/api/admin/entries", response_model=list[AdminEntry])
async def get_admin_entries(password: str):
    """Get all entries including deleted (admin only)"""
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    entries = await database.get_all_entries_admin()
    return [
        AdminEntry(
            id=entry["id"],
            name=entry["name"],
            costume_name=entry["costume_name"],
            photo_url=f"/api/uploads/{entry['photo_filename']}",
            deleted=bool(entry["deleted"]),
            created_at=entry["created_at"],
        )
        for entry in entries
    ]


@app.get("/api/admin/votes", response_model=list[AdminVote])
async def get_admin_votes(password: str):
    """Get all votes including deleted (admin only)"""
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    votes = await database.get_all_votes_admin()
    return [
        AdminVote(
            id=vote["id"],
            voter_id=vote["voter_id"],
            category=vote["category"],
            entry_id=vote["entry_id"],
            entry_name=vote.get("entry_name"),
            costume_name=vote.get("costume_name"),
            deleted=bool(vote["deleted"]),
            created_at=vote["created_at"],
        )
        for vote in votes
    ]


@app.get("/api/admin/mc-votes", response_model=list[AdminMCVote])
async def get_admin_mc_votes(password: str):
    """Get all MC votes including deleted (admin only)"""
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    votes = await database.get_all_mc_votes_admin()
    return [
        AdminMCVote(
            id=vote["id"],
            voter_id=vote["voter_id"],
            question_id=vote["question_id"],
            question=vote.get("question"),
            option_id=vote["option_id"],
            option_text=vote.get("option_text"),
            deleted=bool(vote["deleted"]),
            created_at=vote["created_at"],
        )
        for vote in votes
    ]


@app.post("/api/admin/entries/{entry_id}/delete")
async def delete_entry(entry_id: str, request: AdminAuthRequest):
    """Soft delete an entry (admin only)"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    await database.soft_delete_entry(entry_id)
    return {"success": True, "message": "Entry deleted"}


@app.post("/api/admin/entries/{entry_id}/restore")
async def restore_entry(entry_id: str, request: AdminAuthRequest):
    """Restore a deleted entry (admin only)"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    await database.restore_entry(entry_id)
    return {"success": True, "message": "Entry restored"}


@app.post("/api/admin/votes/{vote_id}/delete")
async def delete_vote(vote_id: str, request: AdminAuthRequest):
    """Soft delete a vote (admin only)"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    await database.soft_delete_vote(vote_id)
    return {"success": True, "message": "Vote deleted"}


@app.post("/api/admin/votes/{vote_id}/restore")
async def restore_vote(vote_id: str, request: AdminAuthRequest):
    """Restore a deleted vote (admin only)"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    await database.restore_vote(vote_id)
    return {"success": True, "message": "Vote restored"}


@app.post("/api/admin/mc-votes/{vote_id}/delete")
async def delete_mc_vote(vote_id: str, request: AdminAuthRequest):
    """Soft delete an MC vote (admin only)"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    await database.soft_delete_mc_vote(vote_id)
    return {"success": True, "message": "MC vote deleted"}


@app.post("/api/admin/mc-votes/{vote_id}/restore")
async def restore_mc_vote(vote_id: str, request: AdminAuthRequest):
    """Restore a deleted MC vote (admin only)"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    await database.restore_mc_vote(vote_id)
    return {"success": True, "message": "MC vote restored"}


# Admin endpoints for grouped votes

@app.get("/api/admin/votes-grouped")
async def get_admin_votes_grouped(password: str):
    """Get votes grouped by voter (admin only)"""
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    votes = await database.get_votes_grouped_by_voter_admin()
    return votes


@app.get("/api/admin/mc-votes-grouped")
async def get_admin_mc_votes_grouped(password: str):
    """Get MC votes grouped by voter (admin only)"""
    if password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    votes = await database.get_mc_votes_grouped_by_voter_admin()
    return votes


@app.post("/api/admin/votes/voter/{voter_id}/delete")
async def delete_all_votes_by_voter(voter_id: str, request: AdminAuthRequest):
    """Soft delete all votes from a voter (admin only)"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    count = await database.soft_delete_all_votes_by_voter(voter_id)
    return {"success": True, "message": f"Deleted {count} votes"}


@app.post("/api/admin/votes/voter/{voter_id}/restore")
async def restore_all_votes_by_voter(voter_id: str, request: AdminAuthRequest):
    """Restore all votes from a voter (admin only)"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    count = await database.restore_all_votes_by_voter(voter_id)
    return {"success": True, "message": f"Restored {count} votes"}


@app.post("/api/admin/mc-votes/voter/{voter_id}/delete")
async def delete_all_mc_votes_by_voter(voter_id: str, request: AdminAuthRequest):
    """Soft delete all MC votes from a voter (admin only)"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    count = await database.soft_delete_all_mc_votes_by_voter(voter_id)
    return {"success": True, "message": f"Deleted {count} MC votes"}


@app.post("/api/admin/mc-votes/voter/{voter_id}/restore")
async def restore_all_mc_votes_by_voter(voter_id: str, request: AdminAuthRequest):
    """Restore all MC votes from a voter (admin only)"""
    if request.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=403, detail="Invalid admin password")

    count = await database.restore_all_mc_votes_by_voter(voter_id)
    return {"success": True, "message": f"Restored {count} MC votes"}


if __name__ == "__main__":
    import uvicorn

    print("🎃 Starting Halloween Voting System API...")
    print("📝 Access API docs at: http://localhost:8000/docs")
    uvicorn.run(app, host="0.0.0.0", port=8000)
