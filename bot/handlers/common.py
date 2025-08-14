from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, ReplyKeyboardMarkup, KeyboardButton

from bot.database.sqlite_db import get_total_words_count, get_reviewed_words_count_today, get_due_words_count_today, get_word_difficulty_distribution

router = Router()

MAIN_MENU_BUTTON_TEXTS = [
    "📚 My Vocabulary"
]

@router.message(Command(commands=["start"]))
async def command_start_handler(message: Message) -> None:
    """
    This handler receives messages with `/start` command
    """
    kb = [
        [KeyboardButton(text="📚 My Vocabulary")]
    ]
    keyboard = ReplyKeyboardMarkup(keyboard=kb, resize_keyboard=True)

    await message.answer(f"Hello, {message.from_user.full_name}! 我是 MemWhiz(記憶天才)，您的智能英語學習夥伴！🧠✨\n\n請使用 Mini App 體驗完整功能，或使用以下命令：", reply_markup=keyboard)


