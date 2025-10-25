"""
Database setup and query functions
"""
import sqlite3
import aiosqlite
from typing import List, Optional, Dict
from datetime import datetime
import uuid
from config import DATABASE_PATH, CATEGORIES


async def init_db():
    """Initialize database with required tables"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Create entries table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS entries (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                costume_name TEXT NOT NULL,
                photo_filename TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Create votes table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS votes (
                id TEXT PRIMARY KEY,
                voter_id TEXT,
                category TEXT NOT NULL,
                entry_id TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (entry_id) REFERENCES entries(id),
                UNIQUE(voter_id, category) ON CONFLICT REPLACE
            )
        """)

        # Create categories table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                display_order INTEGER
            )
        """)

        await db.commit()

        # Insert default categories if not exist
        for cat in CATEGORIES:
            await db.execute("""
                INSERT OR IGNORE INTO categories (id, name, display_order)
                VALUES (?, ?, ?)
            """, (cat["id"], cat["name"], cat["order"]))

        await db.commit()


async def create_entry(name: str, costume_name: str, photo_filename: str) -> str:
    """Create a new entry and return its ID"""
    entry_id = str(uuid.uuid4())

    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("""
            INSERT INTO entries (id, name, costume_name, photo_filename)
            VALUES (?, ?, ?, ?)
        """, (entry_id, name, costume_name, photo_filename))
        await db.commit()

    return entry_id


async def get_all_entries() -> List[Dict]:
    """Get all entries"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, name, costume_name, photo_filename, created_at
            FROM entries
            ORDER BY created_at DESC
        """) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def create_vote(category: str, entry_id: str, voter_id: Optional[str] = None) -> str:
    """Create a vote and return its ID"""
    vote_id = str(uuid.uuid4())

    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Check if entry exists
        async with db.execute("SELECT id FROM entries WHERE id = ?", (entry_id,)) as cursor:
            if not await cursor.fetchone():
                raise ValueError("Entry not found")

        # Check if category exists
        async with db.execute("SELECT id FROM categories WHERE id = ?", (category,)) as cursor:
            if not await cursor.fetchone():
                raise ValueError("Category not found")

        # Insert vote (will replace if voter_id+category already exists)
        await db.execute("""
            INSERT INTO votes (id, voter_id, category, entry_id)
            VALUES (?, ?, ?, ?)
        """, (vote_id, voter_id, category, entry_id))
        await db.commit()

    return vote_id


async def get_results() -> Dict[str, List[Dict]]:
    """Get vote results grouped by category"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        results = {}

        for category in CATEGORIES:
            async with db.execute("""
                SELECT
                    e.id as entry_id,
                    e.name,
                    e.costume_name,
                    e.photo_filename,
                    COUNT(v.id) as vote_count
                FROM entries e
                LEFT JOIN votes v ON e.id = v.entry_id AND v.category = ?
                GROUP BY e.id
                ORDER BY vote_count DESC, e.name ASC
            """, (category["id"],)) as cursor:
                rows = await cursor.fetchall()
                results[category["id"]] = [dict(row) for row in rows]

        return results


async def get_categories() -> List[Dict]:
    """Get all categories"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, name, display_order
            FROM categories
            ORDER BY display_order
        """) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]
