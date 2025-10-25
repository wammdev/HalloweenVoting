"""
Database setup and query functions
"""
import sqlite3
import aiosqlite
from typing import List, Optional, Dict
from datetime import datetime
import uuid
from config import DATABASE_PATH, CATEGORIES, MULTIPLE_CHOICE_QUESTIONS


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
                deleted BOOLEAN DEFAULT 0,
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
                deleted BOOLEAN DEFAULT 0,
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

        # Create multiple choice questions table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS mc_questions (
                id TEXT PRIMARY KEY,
                question TEXT NOT NULL,
                display_order INTEGER
            )
        """)

        # Create multiple choice options table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS mc_options (
                id TEXT PRIMARY KEY,
                question_id TEXT NOT NULL,
                option_text TEXT NOT NULL,
                FOREIGN KEY (question_id) REFERENCES mc_questions(id)
            )
        """)

        # Create multiple choice votes table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS mc_votes (
                id TEXT PRIMARY KEY,
                voter_id TEXT,
                question_id TEXT NOT NULL,
                option_id TEXT NOT NULL,
                deleted BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (question_id) REFERENCES mc_questions(id),
                FOREIGN KEY (option_id) REFERENCES mc_options(id),
                UNIQUE(voter_id, question_id) ON CONFLICT REPLACE
            )
        """)

        await db.commit()

        # Insert default categories if not exist
        for cat in CATEGORIES:
            await db.execute("""
                INSERT OR IGNORE INTO categories (id, name, display_order)
                VALUES (?, ?, ?)
            """, (cat["id"], cat["name"], cat["order"]))

        # Insert multiple choice questions and options
        for question in MULTIPLE_CHOICE_QUESTIONS:
            await db.execute("""
                INSERT OR IGNORE INTO mc_questions (id, question, display_order)
                VALUES (?, ?, ?)
            """, (question["id"], question["question"], question["order"]))

            for option in question["options"]:
                await db.execute("""
                    INSERT OR IGNORE INTO mc_options (id, question_id, option_text)
                    VALUES (?, ?, ?)
                """, (option["id"], question["id"], option["text"]))

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
    """Get all entries (excluding deleted)"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, name, costume_name, photo_filename, created_at
            FROM entries
            WHERE deleted = 0
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
                LEFT JOIN votes v ON e.id = v.entry_id AND v.category = ? AND v.deleted = 0
                WHERE e.deleted = 0
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


async def get_mc_questions() -> List[Dict]:
    """Get all multiple choice questions with their options"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        questions = []
        async with db.execute("""
            SELECT id, question, display_order
            FROM mc_questions
            ORDER BY display_order
        """) as cursor:
            question_rows = await cursor.fetchall()

            for q_row in question_rows:
                question = dict(q_row)

                # Get options for this question
                async with db.execute("""
                    SELECT id, option_text
                    FROM mc_options
                    WHERE question_id = ?
                    ORDER BY id
                """, (question["id"],)) as opt_cursor:
                    option_rows = await opt_cursor.fetchall()
                    question["options"] = [dict(opt) for opt in option_rows]

                questions.append(question)

        return questions


async def create_mc_vote(question_id: str, option_id: str, voter_id: Optional[str] = None) -> str:
    """Create a multiple choice vote and return its ID"""
    vote_id = str(uuid.uuid4())

    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Check if question exists
        async with db.execute("SELECT id FROM mc_questions WHERE id = ?", (question_id,)) as cursor:
            if not await cursor.fetchone():
                raise ValueError("Question not found")

        # Check if option exists and belongs to the question
        async with db.execute(
            "SELECT id FROM mc_options WHERE id = ? AND question_id = ?",
            (option_id, question_id)
        ) as cursor:
            if not await cursor.fetchone():
                raise ValueError("Option not found or does not belong to this question")

        # Insert vote (will replace if voter_id+question_id already exists)
        await db.execute("""
            INSERT INTO mc_votes (id, voter_id, question_id, option_id)
            VALUES (?, ?, ?, ?)
        """, (vote_id, voter_id, question_id, option_id))
        await db.commit()

    return vote_id


async def get_mc_results() -> Dict[str, Dict]:
    """Get multiple choice vote results"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row

        results = {}

        for question in MULTIPLE_CHOICE_QUESTIONS:
            question_id = question["id"]

            async with db.execute("""
                SELECT
                    o.id as option_id,
                    o.option_text,
                    COUNT(v.id) as vote_count
                FROM mc_options o
                LEFT JOIN mc_votes v ON o.id = v.option_id AND v.question_id = ? AND v.deleted = 0
                WHERE o.question_id = ?
                GROUP BY o.id
                ORDER BY vote_count DESC, o.option_text ASC
            """, (question_id, question_id)) as cursor:
                rows = await cursor.fetchall()
                results[question_id] = {
                    "question": question["question"],
                    "options": [dict(row) for row in rows]
                }

        return results


# Admin functions for soft deletion management

async def get_all_entries_admin() -> List[Dict]:
    """Get all entries including deleted (admin only)"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT id, name, costume_name, photo_filename, deleted, created_at
            FROM entries
            ORDER BY created_at DESC
        """) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def get_all_votes_admin() -> List[Dict]:
    """Get all votes including deleted (admin only)"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT v.id, v.voter_id, v.category, v.entry_id, v.deleted, v.created_at,
                   e.name as entry_name, e.costume_name
            FROM votes v
            LEFT JOIN entries e ON v.entry_id = e.id
            ORDER BY v.created_at DESC
        """) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def get_all_mc_votes_admin() -> List[Dict]:
    """Get all MC votes including deleted (admin only)"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT v.id, v.voter_id, v.question_id, v.option_id, v.deleted, v.created_at,
                   q.question, o.option_text
            FROM mc_votes v
            LEFT JOIN mc_questions q ON v.question_id = q.id
            LEFT JOIN mc_options o ON v.option_id = o.id
            ORDER BY v.created_at DESC
        """) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]


async def soft_delete_entry(entry_id: str) -> bool:
    """Soft delete an entry"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("UPDATE entries SET deleted = 1 WHERE id = ?", (entry_id,))
        await db.commit()
        return True


async def restore_entry(entry_id: str) -> bool:
    """Restore a deleted entry"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("UPDATE entries SET deleted = 0 WHERE id = ?", (entry_id,))
        await db.commit()
        return True


async def soft_delete_vote(vote_id: str) -> bool:
    """Soft delete a vote"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("UPDATE votes SET deleted = 1 WHERE id = ?", (vote_id,))
        await db.commit()
        return True


async def restore_vote(vote_id: str) -> bool:
    """Restore a deleted vote"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("UPDATE votes SET deleted = 0 WHERE id = ?", (vote_id,))
        await db.commit()
        return True


async def soft_delete_mc_vote(vote_id: str) -> bool:
    """Soft delete an MC vote"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("UPDATE mc_votes SET deleted = 1 WHERE id = ?", (vote_id,))
        await db.commit()
        return True


async def restore_mc_vote(vote_id: str) -> bool:
    """Restore a deleted MC vote"""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("UPDATE mc_votes SET deleted = 0 WHERE id = ?", (vote_id,))
        await db.commit()
        return True
