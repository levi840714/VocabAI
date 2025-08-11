from aiogram import Router, F
from aiogram.filters import Command, CommandObject
from aiogram.types import Message, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder
import math
from datetime import date
import re
import json

from bot.database.sqlite_db import get_words_for_user, get_word_by_id, get_word_by_word, get_words_due_for_review, get_recently_added_words
from bot.services.ai_service import AIService

router = Router()
PAGE_SIZE = 5

async def format_words_page(words, filter_type="all"):
    if not words:
        if filter_type == "all":
            return "您還沒有添加任何單字！請傳送一個單字給我來開始。"
        elif filter_type == "review_today":
            return "太棒了！您今天沒有需要複習的單字。繼續加油！"
        elif filter_type == "recent":
            return "沒有找到最近添加的單字。"
        else:
            return "未找到符合這個篩選器的單字。"
    
    formatted_list = []
    for word in words:
        explanation_snippet = "未找到中文定義。"
        
        # Check if we have the stored Chinese meaning (new format)
        if 'chinese_meaning' in word and word['chinese_meaning'] and word['chinese_meaning'] not in ["未找到中文定義", "解析錯誤"]:
            explanation_snippet = word['chinese_meaning']
        elif word['initial_ai_explanation']:
            # This is for backwards compatibility with old stored data
            # If it's JSON format, try to parse it
            if word['initial_ai_explanation'].strip().startswith('{'):
                try:
                    import json
                    structured_data = json.loads(word['initial_ai_explanation'])
                    definitions = structured_data.get('definitions', [])
                    chinese_definitions = []
                    
                    for def_group in definitions:
                        meanings = def_group.get('meanings', [])
                        for meaning in meanings:
                            definition = meaning.get('definition', '')
                            if definition:
                                chinese_definitions.append(definition)
                    
                    if chinese_definitions:
                        explanation_snippet = chinese_definitions[0]  # Use first definition
                except (json.JSONDecodeError, KeyError):
                    # If JSON parsing fails, keep the fallback
                    pass
            else:
                # Try old format extraction as fallback
                chinese_match = re.search(r"2. 【中文定義】：\s*([\s\S]*?)(?=\s*\n3. 【例句】：|$)", word['initial_ai_explanation'])
                if chinese_match:
                    explanation_snippet = chinese_match.group(1).strip()

        # Truncate explanation snippet if too long
        if len(explanation_snippet) > 50:
            explanation_snippet = explanation_snippet[:50] + "..."

        formatted_list.append(f"<b>{word['word']}</b> - <i>{explanation_snippet}</i>")
    return "\n".join(formatted_list)

def create_pagination_keyboard(current_page, total_words, words_on_page, filter_type="all"):
    builder = InlineKeyboardBuilder()
    total_pages = math.ceil(total_words / PAGE_SIZE)

    # Previous button
    if current_page > 0:
        builder.button(text="⬅️ Previous", callback_data=f"vocab_page:{filter_type}:{current_page - 1}")
    
    # Next button
    if (current_page + 1) * PAGE_SIZE < total_words:
        builder.button(text="Next ➡️", callback_data=f"vocab_page:{filter_type}:{current_page + 1}")
    
    # Add a row for word details buttons
    if words_on_page: # Only add if there are words on the page
        for word in words_on_page:
            builder.button(text=f"Details: {word['word']}", callback_data=f"word_details:{word['id']}")
        builder.adjust(2, len(words_on_page)) # Adjust for 2 pagination buttons and then word detail buttons

    return builder.as_markup()

@router.message(F.text == "📚 My Vocabulary")
async def command_my_vocabulary_handler(message: Message, config: dict):
    user_id = message.from_user.id
    db_path = config['database']['db_path']

    builder = InlineKeyboardBuilder()
    builder.button(text="All Words", callback_data="vocab_filter:all")
    builder.button(text="Words to Review Today", callback_data="vocab_filter:review_today")
    builder.button(text="Recently Added", callback_data="vocab_filter:recent")
    builder.adjust(2)

    await message.answer("How would you like to browse your vocabulary?", reply_markup=builder.as_markup())

@router.message(Command("vocab"))
async def command_vocab_command_handler(message: Message, command: CommandObject, config: dict):
    user_id = message.from_user.id
    db_path = config['database']['db_path']

    if command.args:
        search_word = command.args.strip()
        word_data = await get_word_by_word(db_path, user_id, search_word)

        if word_data:
            builder = InlineKeyboardBuilder()
            builder.button(text="Deep Learning", callback_data=f"deep_learning_from_vocab:{word_data['id']}")
            builder.button(text="Back to List", callback_data=f"vocab_page:all:0")
            builder.adjust(1)

            await message.answer(
                f"<b>{word_data['word']}</b>\n\n{word_data['initial_ai_explanation']}",
                reply_markup=builder.as_markup()
            )
        else:
            await message.answer(f"Word '{search_word}' not found in your vocabulary.")
        return

    builder = InlineKeyboardBuilder()
    builder.button(text="All Words", callback_data="vocab_filter:all")
    builder.button(text="Words to Review Today", callback_data="vocab_filter:review_today")
    builder.button(text="Recently Added", callback_data="vocab_filter:recent")
    builder.adjust(2)

    await message.answer("How would you like to browse your vocabulary?", reply_markup=builder.as_markup())

@router.callback_query(F.data.startswith("vocab_filter:"))
async def process_vocab_filter_callback(callback_query: CallbackQuery, config: dict):
    filter_type = callback_query.data.split(":")[1]
    user_id = callback_query.from_user.id
    db_path = config['database']['db_path']

    words = []
    total_count = 0

    if filter_type == "all":
        words, total_count = await get_words_for_user(db_path, user_id, page=0, page_size=PAGE_SIZE)
    elif filter_type == "review_today":
        words, total_count = await get_words_due_for_review(db_path, user_id, page=0, page_size=PAGE_SIZE)
    elif filter_type == "recent":
        words, total_count = await get_recently_added_words(db_path, user_id, page=0, page_size=PAGE_SIZE)

    text = await format_words_page(words, filter_type)
    reply_markup = create_pagination_keyboard(0, total_count, words, filter_type)

    await callback_query.message.edit_text(text, reply_markup=reply_markup)

@router.callback_query(F.data.startswith("vocab_page:"))
async def process_vocab_page_callback(callback_query: CallbackQuery, config: dict):
    _, filter_type, page_str = callback_query.data.split(":")
    page = int(page_str)
    user_id = callback_query.from_user.id
    db_path = config['database']['db_path']

    words = []
    total_count = 0

    if filter_type == "all":
        words, total_count = await get_words_for_user(db_path, user_id, page=page, page_size=PAGE_SIZE)
    elif filter_type == "review_today":
        words, total_count = await get_words_due_for_review(db_path, user_id, page=page, page_size=PAGE_SIZE)
    elif filter_type == "recent":
        words, total_count = await get_recently_added_words(db_path, user_id, page=page, page_size=PAGE_SIZE)
    
    text = await format_words_page(words, filter_type)
    reply_markup = create_pagination_keyboard(page, total_count, words, filter_type)

    await callback_query.message.edit_text(text, reply_markup=reply_markup)

@router.callback_query(F.data.startswith("word_details:"))
async def word_details_handler(callback_query: CallbackQuery, ai_service: AIService, config: dict):
    word_id = int(callback_query.data.split(":")[1])
    db_path = config['database']['db_path']

    word_data = await get_word_by_id(db_path, word_id)

    if not word_data:
        await callback_query.answer("Could not retrieve word details.", show_alert=True)
        return

    # Format the AI explanation for display
    formatted_explanation = word_data['initial_ai_explanation']
    if word_data['initial_ai_explanation']:
        try:
            # Try to parse and format if it's JSON
            structured_data = ai_service.parse_structured_response(word_data['initial_ai_explanation'])
            from bot.handlers.word_handler import format_word_explanation
            formatted_explanation = format_word_explanation(structured_data)
        except:
            # If parsing fails, use the raw explanation
            formatted_explanation = word_data['initial_ai_explanation']

    builder = InlineKeyboardBuilder()
    builder.button(text="Deep Learning", callback_data=f"deep_learning_from_vocab:{word_id}")
    builder.button(text="Dictionary 📚", url=f"https://www.vocabulary.com/dictionary/{word_data['word']}")
    builder.button(text="Translator 🌐", url=f"https://translate.google.com/#en/zh-TW/{word_data['word']}")
    builder.button(text="Back to List", callback_data=f"vocab_page:all:0")
    builder.adjust(2, 2)

    await callback_query.message.edit_text(
        f"<b>{word_data['word']}</b>\n\n{formatted_explanation}\n\n<i>Next Review: {word_data['next_review']}</i>",
        reply_markup=builder.as_markup()
    )

@router.callback_query(F.data.startswith("deep_learning_from_vocab:"))
async def deep_learning_from_vocab_handler(callback_query: CallbackQuery, ai_service: AIService, config: dict):
    word_id = int(callback_query.data.split(":")[1])
    db_path = config['database']['db_path']

    word_data = await get_word_by_id(db_path, word_id)

    if not word_data:
        await callback_query.answer("Could not retrieve word details.", show_alert=True)
        return

    await callback_query.answer("正在獲取深度學習資訊...")

    raw_deep_explanation = await ai_service.get_deep_learning_explanation(word_data['word'])
    structured_deep_data = ai_service.parse_structured_response(raw_deep_explanation, is_deep_learning=True)
    
    # Import the formatting function from word_handler
    from bot.handlers.word_handler import format_word_explanation
    formatted_deep_explanation = format_word_explanation(structured_deep_data, is_deep_learning=True)

    new_text = f"<b>{word_data['word']}</b>\n\n{word_data['initial_ai_explanation']}\n\n<hr>\n\n<b>🔍 深度學習內容:</b>\n{formatted_deep_explanation}"

    builder = InlineKeyboardBuilder()
    builder.button(text="Back to Details", callback_data=f"word_details:{word_id}")
    builder.adjust(1)

    await callback_query.message.edit_text(new_text, reply_markup=builder.as_markup())
