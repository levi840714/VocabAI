import sys
import os
from typing import List, Tuple, Dict, Optional

# Add the project root to the Python path to allow importing from 'bot'
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from bot.database.sqlite_db import (
    init_db,
    add_word,
    get_words_for_user,
    get_word_to_review,
    get_words_due_for_review,
    get_recently_added_words,
    update_word_review_status,
    get_word_by_id,
    get_word_by_word,
    get_total_words_count,
    get_reviewed_words_count_today,
    get_due_words_count_today,
    get_word_difficulty_distribution,
    update_word_notes,
    delete_word,
    mark_word_as_learned,
    reset_word_learning_status,
    is_word_learned,
    get_user_settings,
    create_user_settings,
    update_user_settings,
    upsert_user_settings,
    get_daily_discovery,
    create_daily_discovery,
    cleanup_expired_daily_discovery
)
from bot.core.spaced_repetition import calculate_next_review_date

# Re-export database functions for API use
async def ensure_db_initialized(db_path: str) -> None:
    """Initialize database if needed."""
    await init_db(db_path)

async def create_word(db_path: str, user_id: int, word: str, explanation: str, user_notes: str = None) -> bool:
    """Create a new word in the database."""
    return await add_word(db_path, user_id, word, explanation, user_notes)

async def get_user_words(db_path: str, user_id: int, page: int = 0, page_size: int = 10) -> Tuple[List, int]:
    """Get paginated words for a user."""
    return await get_words_for_user(db_path, user_id, page, page_size)

async def get_due_words(db_path: str, user_id: int, page: int = 0, page_size: int = 10) -> Tuple[List, int]:
    """Get words due for review."""
    return await get_words_due_for_review(db_path, user_id, page, page_size)

async def get_recent_words(db_path: str, user_id: int, page: int = 0, page_size: int = 10) -> Tuple[List, int]:
    """Get recently added words."""
    return await get_recently_added_words(db_path, user_id, page, page_size)

async def get_next_review_word(db_path: str, user_id: int):
    """Get the next word for review."""
    return await get_word_to_review(db_path, user_id)

async def update_review_result(db_path: str, word_id: int, response: str, user_id: int) -> Dict[str, any]:
    """Update word review status based on user response."""
    # Get current word data and verify ownership
    word = await get_word_by_id(db_path, word_id)
    if not word:
        return {"success": False, "message": "Word not found"}
    
    if word['user_id'] != user_id:
        return {"success": False, "message": "Unauthorized access to word"}
    
    # Calculate new review parameters (ensure types are integers)
    current_interval = int(word['interval']) if word['interval'] is not None else 1
    current_difficulty = int(word['difficulty']) if word['difficulty'] is not None else 0
    
    new_interval, new_difficulty, next_review_date = calculate_next_review_date(
        current_interval, current_difficulty, response
    )
    
    # Update in database
    await update_word_review_status(db_path, word_id, new_interval, new_difficulty, next_review_date, response)
    
    return {
        "success": True,
        "message": f"Review updated successfully. Next review: {next_review_date}",
        "next_review_date": next_review_date
    }

async def get_user_stats(db_path: str, user_id: int) -> Dict[str, any]:
    """Get user statistics."""
    total_words = await get_total_words_count(db_path, user_id)
    due_today = await get_due_words_count_today(db_path, user_id)
    reviewed_today = await get_reviewed_words_count_today(db_path, user_id)
    difficulty_distribution = await get_word_difficulty_distribution(db_path, user_id)
    
    return {
        "total_words": total_words,
        "due_today": due_today,
        "reviewed_today": reviewed_today,
        "difficulty_distribution": difficulty_distribution
    }

async def find_word_by_text(db_path: str, user_id: int, word: str):
    """Find a word by its text."""
    return await get_word_by_word(db_path, user_id, word)

async def update_user_notes(db_path: str, word_id: int, user_notes: str) -> bool:
    """Update user notes for a word."""
    try:
        await update_word_notes(db_path, word_id, user_notes)
        return True
    except Exception:
        return False

async def find_word_by_id(db_path: str, word_id: int):
    """Find a word by its ID."""
    return await get_word_by_id(db_path, word_id)

async def delete_user_word(db_path: str, word_id: int, user_id: int) -> bool:
    """Delete a word belonging to a user."""
    return await delete_word(db_path, word_id, user_id)

async def mark_user_word_as_learned(db_path: str, word_id: int, user_id: int) -> bool:
    """Mark a word as learned for a user."""
    return await mark_word_as_learned(db_path, word_id, user_id)

async def reset_user_word_learning_status(db_path: str, word_id: int, user_id: int) -> bool:
    """Reset a word's learning status for a user."""
    return await reset_word_learning_status(db_path, word_id, user_id)

# User Settings CRUD functions
async def get_user_settings_data(db_path: str, user_id: int):
    """Get user settings data."""
    return await get_user_settings(db_path, user_id)

async def create_user_settings_data(db_path: str, user_id: int, learning_preferences: str, interface_settings: str, ai_settings: str, study_settings: str) -> bool:
    """Create user settings."""
    return await create_user_settings(db_path, user_id, learning_preferences, interface_settings, ai_settings, study_settings)

async def update_user_settings_data(db_path: str, user_id: int, learning_preferences: str = None, interface_settings: str = None, ai_settings: str = None, study_settings: str = None) -> bool:
    """Update user settings."""
    return await update_user_settings(db_path, user_id, learning_preferences, interface_settings, ai_settings, study_settings)

async def upsert_user_settings_data(db_path: str, user_id: int, learning_preferences: str, interface_settings: str, ai_settings: str, study_settings: str) -> bool:
    """Create or update user settings (upsert)."""
    return await upsert_user_settings(db_path, user_id, learning_preferences, interface_settings, ai_settings, study_settings)

# Daily Discovery CRUD functions
async def get_daily_discovery_data(db_path: str, date_str: str):
    """Get daily discovery data for specific date."""
    return await get_daily_discovery(db_path, date_str)

async def create_daily_discovery_data(db_path: str, date_str: str, article_title: str, article_content: str, knowledge_points: list) -> bool:
    """Create daily discovery content."""
    return await create_daily_discovery(db_path, date_str, article_title, article_content, knowledge_points)

async def cleanup_expired_daily_discovery_data(db_path: str) -> int:
    """Clean up expired daily discovery content."""
    return await cleanup_expired_daily_discovery(db_path)