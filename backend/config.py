"""
Configuration for Halloween Voting System
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

# Categories for voting
CATEGORIES = [
    {"id": "scaries", "name": "Scariest: Ruthless killer", "order": 1},
    {"id": "original", "name": "Original: Mastermind of Mayhem", "order": 2},
    {"id": "couples", "name": "Couples: Partners in Crime", "order": 3},
    {"id": "funniest", "name": "Funniest: Laughing in the Face of Death", "order": 4},
    {"id": "nontheme", "name": "Non-Theme: Off the Record", "order": 5},
]

# Multiple choice voting questions (not tied to entries)
MULTIPLE_CHOICE_QUESTIONS = [
    {
        "id": "next_year_theme",
        "question": "What should next year's Halloween party theme be?",
        "order": 6,  # Appears after all costume categories
        "options": [
            {"id": "sat_morning_cartoons", "text": "Saturday Morning Cartoons/Sunday Funnies"},
            {"id": "scifi", "text": "Sci-Fi"},
        ]
    }
]

# Results password - CHANGE THIS!
RESULTS_PASSWORD = os.getenv("RESULTS_PASSWORD", "spooky2025")

# Admin password - CHANGE THIS!
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin2025")

# File upload settings
UPLOAD_DIR = "uploads"
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# Database
DATABASE_PATH = "halloween.db"

# CORS settings - update with your GitHub Pages URL
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "https://*.github.io",  # Will need to be more specific in production
]
