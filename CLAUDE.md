# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Halloween Costume Voting System - A self-hosted web application for party voting. Backend runs on a laptop (exposed via ngrok), frontend deploys to GitHub Pages. Includes costume categories and multiple-choice questions.

## Architecture

### Backend (Python FastAPI)
- **App**: `backend/app.py` - FastAPI application with CORS configured for GitHub Pages
- **Database**: `backend/database.py` - Async SQLite operations with aiosqlite
- **Models**: `backend/models.py` - Pydantic models for request/response validation
- **Config**: `backend/config.py` - Categories, questions, passwords, file upload settings

### Database Schema
- **entries**: Costume submissions (id, name, costume_name, photo_filename)
- **votes**: Costume category votes (voter_id, category, entry_id) - UNIQUE constraint on (voter_id, category)
- **categories**: Voting categories (id, name, display_order)
- **mc_questions**: Multiple choice questions (id, question, display_order)
- **mc_options**: Answer options for questions (id, question_id, option_text)
- **mc_votes**: Multiple choice votes (voter_id, question_id, option_id) - UNIQUE constraint on (voter_id, question_id)

Vote deduplication: UNIQUE constraints with ON CONFLICT REPLACE - one vote per person per category/question.

### Frontend (Vanilla JS)
- **Pages**: `index.html` (landing), `submit.html` (entry submission), `vote.html` (voting), `results.html` (password-protected results)
- **Config**: `frontend/js/config.js` - API URL configuration (auto-switches between localhost and ngrok)
- **Scripts**: Each page has corresponding JS file in `frontend/js/`
- **Images**: Uses `imageLoader.js` to load images with ngrok headers (`ngrok-skip-browser-warning: true`)
- **Voter ID**: Generated fingerprint stored in localStorage, prevents duplicate voting

## Common Commands

### Backend Development
```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Run server (starts on localhost:8000)
python app.py
# OR
python3 app.py

# View API docs
# http://localhost:8000/docs
```

### Frontend Development
```bash
# Test locally with Python HTTP server
cd frontend
python -m http.server 8080

# Open http://localhost:8080 in browser
```

### Expose Backend with ngrok
```bash
# Start ngrok (separate terminal)
ngrok http 8000
# OR if installed in ~/.local/bin
~/.local/bin/ngrok http 8000

# Copy HTTPS URL and update frontend/js/config.js PRODUCTION_API_URL
```

### Clear Data and Restart
```bash
# Stop backend, delete database and uploads, restart everything
./refresh.sh

# This script:
# 1. Kills backend process
# 2. Deletes halloween.db and uploads/*
# 3. Starts backend in background
# 4. Optionally starts ngrok
# 5. Updates config.js with new ngrok URL
# 6. Commits and pushes to GitHub
```

### Deploy to GitHub Pages
```bash
git add .
git commit -m "Update message"
git push origin main

# Enable in repo Settings → Pages → Source: main branch
# Site URL: https://username.github.io/HalloweenVoting/frontend/
```

## Key Implementation Details

### Category and Question Configuration
Edit `backend/config.py` to modify:
- **CATEGORIES**: Costume voting categories (id, name, order)
- **MULTIPLE_CHOICE_QUESTIONS**: General questions with predefined options (id, question, order, options[])
- **RESULTS_PASSWORD**: Results page access (default: "spooky2025")
- **MAX_FILE_SIZE**: Image upload limit (default: 5MB)
- **ALLOWED_EXTENSIONS**: Accepted image formats

Categories and MC questions are separate voting tracks. Categories require costume entries; MC questions have predefined options.

### File Uploads
- Images saved to `backend/uploads/` with UUID filenames
- Validated using PIL (pillow) - ensures file is actually an image
- Served via `/api/uploads/{filename}` endpoint
- Security: Path traversal protection in `app.py:275`

### Vote Deduplication Strategy
1. **Client-side**: voter_id generated once, stored in localStorage
2. **Server-side**: UNIQUE constraint on (voter_id, category) and (voter_id, question_id)
3. **Behavior**: Changing vote replaces previous vote (ON CONFLICT REPLACE)
4. **LocalStorage**: Votes cached locally for UI state management

### API Endpoints
- `GET /api/categories` - List all costume categories
- `GET /api/entries` - List all costume submissions
- `POST /api/entries` - Submit costume (multipart/form-data)
- `POST /api/votes` - Vote for costume in category
- `GET /api/mc-questions` - List multiple choice questions with options
- `POST /api/mc-votes` - Vote for MC question option
- `POST /api/results` - Get results (requires password in body)
- `GET /api/uploads/{filename}` - Serve uploaded images

### Frontend-Backend Communication
- **ngrok Headers**: All frontend requests include `ngrok-skip-browser-warning: true` header
- **Image Loading**: Custom `loadImageWithHeaders()` function in `imageLoader.js` fetches images as blobs with headers
- **CORS**: Backend allows all origins (configure for production in `app.py:42`)

### Results Page
- Password protected via `POST /api/results` with password in request body
- Returns both costume category results and MC question results in single response
- Winners determined by highest vote count (ties possible)
- Shows all entries with vote counts, sorted by count descending

## Database Initialization

Database auto-initializes on first run:
1. Creates tables if they don't exist
2. Inserts categories from `CATEGORIES` config
3. Inserts MC questions and options from `MULTIPLE_CHOICE_QUESTIONS` config
4. Uses `INSERT OR IGNORE` - safe to restart without duplicating data

## Utility Scripts

### refresh.sh
Main workflow automation:
- Stops running backend (finds PID via `pgrep -f "python.*app.py"`)
- Deletes `backend/halloween.db` and `backend/uploads/*` (except .gitkeep)
- Starts backend in background (logs to `/tmp/halloween_backend.log`)
- Checks if ngrok already running, reuses URL if possible
- If starting new ngrok: updates `config.js`, commits, and pushes to GitHub
- If ngrok was already running: skips GitHub push (URL unchanged)

### start_ngrok.sh
Simple ngrok starter with log output to stdout.

## Development Workflow

1. **Before Party**: Run `./refresh.sh` to clear test data
2. **Backend**: Auto-starts on localhost:8000 (refresh.sh handles this)
3. **ngrok**: Auto-starts and updates config.js (refresh.sh handles this)
4. **Frontend**: Changes auto-deploy via GitHub Pages when pushed
5. **Testing**: Use local Python HTTP server for offline testing

## Configuration Notes

- **Results Password**: Change in `backend/config.py` or via env var `RESULTS_PASSWORD`
- **API URL**: Automatically switches in `config.js` based on hostname (localhost vs GitHub Pages)
- **Categories**: Add/modify in `config.py`, database updates automatically on restart
- **MC Questions**: Add in `config.py` MULTIPLE_CHOICE_QUESTIONS array with unique IDs

## Important Conventions

- **UUIDs**: All IDs (entries, votes, categories, questions, options) use UUIDs or string identifiers
- **Timestamps**: SQLite CURRENT_TIMESTAMP for created_at fields
- **Async/Await**: All database operations are async (aiosqlite)
- **Error Handling**: FastAPI HTTPException for API errors, try/catch in frontend JS
- **Security**: File validation, path traversal protection, password-protected results
