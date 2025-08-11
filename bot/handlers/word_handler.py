from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.utils.keyboard import InlineKeyboardBuilder

import re

from bot.services.ai_service import AIService
from bot.database.sqlite_db import add_word
from bot.handlers.common import MAIN_MENU_BUTTON_TEXTS
import logging

router = Router()

def format_word_explanation(structured_data: dict, is_deep_learning: bool = False) -> str:
    """Formats structured word data for display in Telegram."""
    try:
        if is_deep_learning:
            return format_deep_learning_explanation(structured_data)
        
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
        # Fallback to basic word info if formatting fails
        word = structured_data.get('word', 'Unknown')
        return f"⚠️ 格式化失敗，但找到單字: <b>{word}</b>\n請稍後再試。"

def format_deep_learning_explanation(structured_data: dict) -> str:
    """Formats deep learning structured word data for display in Telegram."""
    try:
        word = structured_data.get('word', 'Unknown')
        pronunciations = structured_data.get('pronunciations', [])
        etymology = structured_data.get('etymology', {})
        definitions = structured_data.get('definitions', [])
        collocations = structured_data.get('collocations', {})
        examples = structured_data.get('examples', [])
        synonyms = structured_data.get('synonyms', [])
        antonyms = structured_data.get('antonyms', [])
        memory_strategies = structured_data.get('memory_strategies', {})
        cultural_notes = structured_data.get('cultural_notes', '')
        difficulty_level = structured_data.get('difficulty_level', '')
        frequency = structured_data.get('frequency', '')
        
        formatted = ""
        
        # Header with level and frequency
        if difficulty_level or frequency:
            formatted += f"📊 <b>級別:</b> {difficulty_level} | <b>頻率:</b> {frequency}\n\n"
        
        # Pronunciations
        if pronunciations:
            formatted += f"🔊 <b>發音:</b> {', '.join(pronunciations)}\n\n"
        
        # Etymology
        if etymology:
            formatted += "🏛️ <b>詞源分析:</b>\n"
            if etymology.get('origin'):
                formatted += f"• 來源: {etymology['origin']}\n"
            if etymology.get('root_analysis'):
                formatted += f"• 字根: {etymology['root_analysis']}\n"
            if etymology.get('related_words'):
                formatted += f"• 相關詞: {', '.join(etymology['related_words'][:5])}\n"
            formatted += "\n"
        
        # Definitions with enhanced info
        if definitions:
            formatted += "📖 <b>詳細定義:</b>\n"
            for def_group in definitions:
                part_of_speech = def_group.get('part_of_speech', '').title()
                meanings = def_group.get('meanings', [])
                
                if part_of_speech:
                    formatted += f"<i>{part_of_speech}</i>\n"
                
                for meaning in meanings:
                    definition = meaning.get('definition', '')
                    context = meaning.get('context', '')
                    formality = meaning.get('formality', '')
                    usage_notes = meaning.get('usage_notes', '')
                    
                    formatted += f"• {definition}"
                    if context:
                        formatted += f" ({context})"
                    if formality:
                        formatted += f" [{formality}]"
                    formatted += "\n"
                    if usage_notes:
                        formatted += f"  ⚠️ {usage_notes}\n"
                formatted += "\n"
        
        # Collocations
        if collocations:
            formatted += "🔗 <b>常用搭配:</b>\n"
            if collocations.get('common_phrases'):
                formatted += f"• 片語: {', '.join(collocations['common_phrases'][:3])}\n"
            if collocations.get('verb_combinations'):
                formatted += f"• 動詞: {', '.join(collocations['verb_combinations'][:3])}\n"
            formatted += "\n"
        
        # Enhanced Examples
        if examples:
            formatted += "💡 <b>情境例句:</b>\n"
            for example in examples[:2]:  # Limit to 2 examples for deep learning
                if isinstance(example, dict):
                    sentence = example.get('sentence', '')
                    translation = example.get('translation', '')
                    context = example.get('context', '')
                    formatted += f"• {sentence}\n"
                    if translation:
                        formatted += f"  📝 {translation}\n"
                    if context:
                        formatted += f"  🎯 {context}\n"
                else:
                    formatted += f"• {example}\n"
            formatted += "\n"
        
        # Enhanced Synonyms
        if synonyms:
            formatted += "🔄 <b>同義詞比較:</b>\n"
            for synonym in synonyms[:3]:
                if isinstance(synonym, dict):
                    word_syn = synonym.get('word', '')
                    difference = synonym.get('difference', '')
                    formatted += f"• {word_syn}: {difference}\n"
                else:
                    formatted += f"• {synonym}\n"
            formatted += "\n"
        
        # Memory Strategies
        if memory_strategies:
            formatted += "🧠 <b>記憶策略:</b>\n"
            if memory_strategies.get('visual'):
                formatted += f"👁️ 視覺: {memory_strategies['visual']}\n"
            if memory_strategies.get('association'):
                formatted += f"🔗 聯想: {memory_strategies['association']}\n"
            formatted += "\n"
        
        # Cultural Notes
        if cultural_notes:
            formatted += f"🌍 <b>文化背景:</b>\n{cultural_notes}\n\n"
        
        return formatted.strip()
    except Exception as e:
        logging.error(f"Error formatting deep learning explanation: {e}")
        # Fallback to basic word info if formatting fails
        word = structured_data.get('word', 'Unknown')
        return f"⚠️ 深度學習格式化失敗，但找到單字: <b>{word}</b>\n請稍後再試。"

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
