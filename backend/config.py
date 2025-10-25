"""
Configuration for Halloween Voting System
"""
import os

# Categories for voting
CATEGORIES = [
    {"id": "scaries", "name": "Scariest: Ruthless killer", "order": 1},
    {"id": "original", "name": "Original: Mastermind of Mayhem", "order": 2},
    {"id": "couples", "name": "Couples: Partners in Crime", "order": 3},
    {"id": "funniest", "name": "Funniest: Laughing in the Face of Death", "order": 4},
    {"id": "nontheme", "name": "Non-Theme: Off the Record", "order": 5},
]

# Results password - CHANGE THIS!
RESULTS_PASSWORD = os.getenv("RESULTS_PASSWORD", "spooky2025")

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
