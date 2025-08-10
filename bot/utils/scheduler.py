from apscheduler.schedulers.asyncio import AsyncIOScheduler
from aiogram import Bot

from bot.database.sqlite_db import get_all_user_ids, get_word_to_review

async def daily_review_reminder(bot: Bot, db_path: str):
    """Sends a reminder to all users who have words to review."""
    user_ids = await get_all_user_ids(db_path)
    for user_id in user_ids:
        word_to_review = await get_word_to_review(db_path, user_id)
        if word_to_review:
            try:
                await bot.send_message(user_id, "👋 It's time for your daily review! You have words waiting for you.")
            except Exception as e:
                print(f"Failed to send message to user {user_id}: {e}")

def setup_scheduler(bot: Bot, db_path: str):
    """Sets up and starts the scheduler for daily reminders."""
    scheduler = AsyncIOScheduler()
    scheduler.add_job(daily_review_reminder, 'cron', hour=9, minute=0, args=[bot, db_path])
    scheduler.start()
    print("Scheduler started.")
