# 🎃 Halloween Costume Voting System

A fun and interactive voting system for your Halloween party! Guests can submit their costumes and everyone can vote for their favorites across multiple categories.

## Features

- **Easy Entry Submission**: Upload costume photos with name and costume name
- **Multiple Categories**: Vote across different categories (Scariest, Most Creative, Funniest, Best Group)
- **Mobile-Friendly**: Responsive design works great on phones and tablets
- **Real-time Results**: Password-protected results page with live vote counts
- **Vote Deduplication**: Prevents multiple votes from the same person
- **Self-hosted**: Run on your own laptop, no cloud services needed

## Tech Stack

- **Backend**: Python FastAPI + SQLite
- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Hosting**:
  - Backend on laptop (exposed via ngrok)
  - Frontend on GitHub Pages

## Quick Start

### Prerequisites

- Python 3.8+
- pip (Python package manager)
- ngrok account (free tier is fine)
- Git and GitHub account

### Utility Scripts

**`./refresh.sh`** - Clear all data and restart backend
- Stops the backend server
- Deletes database and uploaded images
- Restarts with fresh database
- **Use this to clear test data before your party!**

```bash
# Clear everything and start fresh
./refresh.sh
```

### Setup Instructions

#### 1. Backend Setup (On Your Laptop)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# (Optional) Change the results password
# Edit backend/config.py and change RESULTS_PASSWORD

# Run the server
python app.py
# OR use the convenient start script:
./start.sh
```

The server will start on `http://localhost:8000`

You can access the API documentation at: `http://localhost:8000/docs`

#### 2. Expose Backend via ngrok

In a new terminal:

```bash
# Install ngrok if you haven't already
# Download from: https://ngrok.com/download

# Start ngrok tunnel
ngrok http 8000
```

Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

#### 3. Frontend Configuration

```bash
# Edit frontend/js/config.js
# Replace YOUR_NGROK_URL_HERE with your ngrok URL
const PRODUCTION_API_URL = 'https://abc123.ngrok-free.app';
```

#### 4. Deploy Frontend to GitHub Pages

```bash
# Add and commit your changes
git add .
git commit -m "Add Halloween voting system"

# Push to GitHub
git push origin main

# Enable GitHub Pages
# Go to: Settings → Pages → Source: Deploy from branch → Branch: main → Folder: / (root)
# OR set folder to /frontend if you want to serve only the frontend directory
```

Wait a few minutes for GitHub Pages to deploy. Your site will be available at:
`https://yourusername.github.io/HalloweenVoting/frontend/`

(If serving from root, adjust file paths in HTML accordingly)

### Alternative: Test Locally

For testing before party:

```bash
# Backend: Already running on localhost:8000

# Frontend: Use a simple HTTP server
cd frontend
python -m http.server 8080

# Open browser to http://localhost:8080
```

## Usage Guide

### For Party Guests

1. **Submit Entry** (`submit.html`)
   - Enter your name(s)
   - Enter costume name
   - Upload photo (max 5MB)
   - Submit!

2. **Vote** (`vote.html`)
   - Browse all costume entries
   - Click through each category
   - Select your favorite in each category
   - Submit all votes

3. **Results** (`results.html`)
   - Enter password (ask the host!)
   - View live results for all categories
   - See winners with gold border

### For Host

Share these links with guests:
- **Submit costumes**: `https://yourusername.github.io/HalloweenVoting/frontend/submit.html`
- **Vote**: `https://yourusername.github.io/HalloweenVoting/frontend/vote.html`
- **Results**: `https://yourusername.github.io/HalloweenVoting/frontend/results.html`

**Results Password**: Set in `backend/config.py` (default: `spooky2025`)

## Configuration

### Categories

Edit categories in `backend/config.py`:

```python
CATEGORIES = [
    {"id": "scariest", "name": "Scariest", "order": 1},
    {"id": "most_creative", "name": "Most Creative", "order": 2},
    {"id": "funniest", "name": "Funniest", "order": 3},
    {"id": "best_group", "name": "Best Group Costume", "order": 4},
]
```

### Results Password

Change the password in `backend/config.py`:

```python
RESULTS_PASSWORD = "your_secret_password"
```

Or set via environment variable:
```bash
export RESULTS_PASSWORD="your_secret_password"
python app.py
```

### File Upload Limits

Adjust in `backend/config.py`:

```python
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
```

## Project Structure

```
HalloweenVoting/
├── backend/
│   ├── app.py              # FastAPI application
│   ├── database.py         # Database operations
│   ├── models.py           # Pydantic models
│   ├── config.py           # Configuration
│   ├── requirements.txt    # Python dependencies
│   ├── uploads/            # Uploaded images (auto-created)
│   └── halloween.db        # SQLite database (auto-created)
│
├── frontend/
│   ├── index.html          # Landing page
│   ├── submit.html         # Entry submission
│   ├── vote.html           # Voting interface
│   ├── results.html        # Results page
│   ├── css/
│   │   └── styles.css      # Styling
│   └── js/
│       ├── config.js       # API configuration
│       ├── submit.js       # Submission logic
│       ├── vote.js         # Voting logic
│       └── results.js      # Results logic
│
└── README.md               # This file
```

## API Endpoints

- `GET /api/categories` - Get all categories
- `POST /api/entries` - Submit new costume entry (multipart/form-data)
- `GET /api/entries` - Get all entries
- `POST /api/votes` - Submit a vote
- `POST /api/results` - Get results (requires password)
- `GET /api/uploads/{filename}` - Serve uploaded images

Full API documentation: `http://localhost:8000/docs`

## Troubleshooting

### Backend won't start

- Check Python version: `python --version` (need 3.8+)
- Install dependencies: `pip install -r requirements.txt`
- Check port 8000 is available

### Frontend can't connect to backend

- Verify ngrok is running: `ngrok http 8000`
- Update `frontend/js/config.js` with correct ngrok URL
- Check browser console for CORS errors

### Images not loading

- Check `backend/uploads/` folder exists
- Verify file permissions
- Check API endpoint: `http://localhost:8000/api/uploads/`

### Votes not saving

- Check browser localStorage is enabled
- Verify backend database is writable
- Check network tab in browser dev tools

## Tips for Party Day

1. **Test Everything**: Run through the full flow before guests arrive
2. **Keep Laptop Plugged In**: Don't let it sleep!
3. **Monitor ngrok**: Keep the ngrok terminal visible to watch for issues
4. **Backup Plan**: Take screenshots of database periodically
5. **Mobile Testing**: Test on a phone before sharing links
6. **QR Codes**: Generate QR codes for easy access to submission/voting pages

## Security Notes

- Results are password-protected
- Vote deduplication prevents spam (via localStorage + voter_id)
- File validation prevents malicious uploads
- CORS configured for your frontend domain
- For production: Use environment variables for sensitive config

## License

Free to use for your Halloween party! 🎃

## Credits

Made with 🎃 for an awesome Halloween party!

---

**Need help?** Check the issues tab or the API docs at `/docs`
