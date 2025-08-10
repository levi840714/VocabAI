from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder

import re

from bot.services.ai_service import AIService
from bot.database.sqlite_db import add_word
from bot.handlers.common import MAIN_MENU_BUTTON_TEXTS
import logging

router = Router()

def format_word_explanation(structured_data: dict) -> str:
    """Formats structured word data for display in Telegram."""
    try:
        word = structured_data.get('word', 'Unknown')
        pronunciations = structured_data.get('pronunciations', [])
        definitions = structured_data.get('definitions', [])
        examples = structured_data.get('examples', [])
        synonyms = structured_data.get('synonyms', [])
        antonyms = structured_data.get('antonyms', [])
        memory_tips = structured_data.get('memory_tips', '')
        
        formatted = ""
        
        # Pronunciations
        if pronunciations:
            formatted += f"🔊 <b>發音:</b> {', '.join(pronunciations)}\n\n"
        
        # Definitions
        if definitions:
            formatted += "📖 <b>定義:</b>\n"
            for i, def_group in enumerate(definitions, 1):
                part_of_speech = def_group.get('part_of_speech', '').title()
                meanings = def_group.get('meanings', [])
                
                if part_of_speech:
                    formatted += f"<i>{part_of_speech}</i>\n"
                
                for meaning in meanings:
                    definition = meaning.get('definition', '')
                    context = meaning.get('context', '')
                    formatted += f"• {definition}"
                    if context:
                        formatted += f" ({context})"
                    formatted += "\n"
                formatted += "\n"
        
        # Examples
        if examples:
            formatted += "💡 <b>例句:</b>\n"
            for example in examples[:3]:  # Limit to 3 examples
                formatted += f"• {example}\n"
            formatted += "\n"
        
        # Synonyms and Antonyms
        if synonyms:
            formatted += f"🔄 <b>同義詞:</b> {', '.join(synonyms)}\n"
        if antonyms:
            formatted += f"⚡ <b>反義詞:</b> {', '.join(antonyms)}\n"
        
        # Memory tips
        if memory_tips and memory_tips != "None":
            formatted += f"\n🧠 <b>記憶小技巧:</b> {memory_tips}"
        
        return formatted.strip()
    except Exception as e:
        logging.error(f"Error formatting word explanation: {e}")
        # Fallback to raw data if formatting fails
        return str(structured_data)

def extract_chinese_definitions(structured_data: dict) -> str:
    """Extracts Chinese definitions from structured data for database storage."""
    try:
        definitions = structured_data.get('definitions', [])
        chinese_definitions = []
        
        for def_group in definitions:
            meanings = def_group.get('meanings', [])
            for meaning in meanings:
                definition = meaning.get('definition', '')
                if definition and definition.strip():
                    # Only take Chinese characters, skip English definitions
                    if any('\u4e00' <= char <= '\u9fff' for char in definition):
                        chinese_definitions.append(definition.strip())
        
        if chinese_definitions:
            return '; '.join(chinese_definitions[:3])  # Limit to first 3 definitions
        else:
            # If no Chinese found in definitions, try to get the first meaningful definition
            for def_group in definitions:
                meanings = def_group.get('meanings', [])
                for meaning in meanings:
                    definition = meaning.get('definition', '')
                    if definition and definition.strip():
                        return definition.strip()
            
            return "未找到中文定義"
    except Exception as e:
        logging.error(f"Error extracting Chinese definitions: {e}")
        return "解析錯誤"

@router.message(F.text & ~F.text.startswith('/'))
async def handle_word_message(message: Message, ai_service: AIService, config: dict):
    """Handles regular text messages as potential words to be added."""
    word = message.text.strip()
    raw_explanation = await ai_service.get_simple_explanation(word)
    
    # Try to parse JSON response
    structured_data = ai_service.parse_structured_response(raw_explanation)
    
    # Format the response for display
    formatted_explanation = format_word_explanation(structured_data)

    builder = InlineKeyboardBuilder()
    builder.button(text="Add to Vocabulary", callback_data=f"add_word:{word}")

    await message.answer(
        f"<b>{word}</b>\n\n{formatted_explanation}",
        reply_markup=builder.as_markup(),
        parse_mode='HTML'
    )

@router.callback_query(F.data.startswith("add_word:"))
async def process_add_word_callback(callback_query: CallbackQuery, ai_service: AIService, config: dict):
    """Handles the 'Add to Vocabulary' button callback."""
    _, word = callback_query.data.split(":", 1)
    user_id = callback_query.from_user.id
    db_path = config['database']['db_path']

    raw_explanation = await ai_service.get_simple_explanation(word)
    structured_data = ai_service.parse_structured_response(raw_explanation)
    
    # Extract Chinese definitions for database storage
    chinese_meaning = extract_chinese_definitions(structured_data)
    
    # Format for display
    formatted_explanation = format_word_explanation(structured_data)

    if await add_word(db_path, user_id, word, raw_explanation, chinese_meaning):
        await callback_query.answer("單字已成功加入詞彙庫！")
        await callback_query.message.edit_text(
            f"<b>{word}</b>\n\n{formatted_explanation}\n\n<i>✅ 已加入您的詞彙庫。</i>", 
            parse_mode='HTML'
        )
        return
    else:
        await callback_query.answer("此單字已在您的詞彙庫中。", show_alert=True)
