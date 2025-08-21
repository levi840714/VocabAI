from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message
import logging
import asyncio

from bot.services.ai_service import AIService
from bot.handlers.common import MAIN_MENU_BUTTON_TEXTS

router = Router()

def format_sentence_optimization_response(structured_data: dict) -> str:
    """格式化句子優化分析回應為 Telegram 顯示格式"""
    try:
        original_sentence = structured_data.get('original_sentence', 'Unknown')
        analysis = structured_data.get('analysis', {})
        grammar_issues = structured_data.get('grammar_issues', [])
        optimization_suggestions = structured_data.get('optimization_suggestions', [])
        vocabulary_enhancements = structured_data.get('vocabulary_enhancements', [])
        style_improvements = structured_data.get('style_improvements', {})
        final_optimized_versions = structured_data.get('final_optimized_versions', [])
        learning_tips = structured_data.get('learning_tips', '')
        
        formatted = f"📝 <b>原句分析：</b>\n{original_sentence}\n\n"
        
        # 基本分析
        if analysis:
            formatted += "🔍 <b>句子分析：</b>\n"
            if analysis.get('sentence_type'):
                formatted += f"• 句型：{analysis['sentence_type']}\n"
            if analysis.get('complexity_level'):
                formatted += f"• 複雜度：{analysis['complexity_level']}\n"
            
            # 語法結構
            grammar_structure = analysis.get('grammar_structure', [])
            if grammar_structure:
                formatted += "\n📊 <b>語法結構：</b>\n"
                for structure in grammar_structure[:3]:  # 限制顯示前3個
                    component = structure.get('component', '')
                    text = structure.get('text', '')
                    explanation = structure.get('explanation', '')
                    if component and text:
                        formatted += f"• <i>{component}</i>: {text}\n"
                        if explanation:
                            formatted += f"  → {explanation}\n"
            
            # 時態分析
            tense_analysis = analysis.get('tense_analysis', {})
            if tense_analysis and tense_analysis.get('tense_name'):
                formatted += f"\n⏰ <b>時態：</b> {tense_analysis['tense_name']}\n"
                if tense_analysis.get('usage_explanation'):
                    formatted += f"• {tense_analysis['usage_explanation']}\n"
            
            formatted += "\n"
        
        # 語法問題
        if grammar_issues:
            formatted += "⚠️ <b>語法檢查：</b>\n"
            for issue in grammar_issues[:2]:  # 限制顯示前2個問題
                issue_type = issue.get('type', '')
                location = issue.get('location', '')
                correction = issue.get('correction', '')
                explanation = issue.get('explanation', '')
                
                if issue_type and correction:
                    formatted += f"• {issue_type}"
                    if location:
                        formatted += f" ({location})"
                    formatted += f"\n  修正建議：{correction}\n"
                    if explanation:
                        formatted += f"  說明：{explanation}\n"
            formatted += "\n"
        
        # 優化建議
        if optimization_suggestions:
            formatted += "✨ <b>優化建議：</b>\n"
            for suggestion in optimization_suggestions[:2]:  # 限制顯示前2個建議
                suggestion_type = suggestion.get('type', '')
                original_part = suggestion.get('original_part', '')
                suggested_improvement = suggestion.get('suggested_improvement', '')
                reason = suggestion.get('reason', '')
                
                if suggestion_type and suggested_improvement:
                    formatted += f"• <i>{suggestion_type}</i>\n"
                    if original_part:
                        formatted += f"  原文：{original_part}\n"
                    formatted += f"  建議：{suggested_improvement}\n"
                    if reason:
                        formatted += f"  原因：{reason}\n"
            formatted += "\n"
        
        # 詞彙優化
        if vocabulary_enhancements:
            formatted += "📚 <b>詞彙建議：</b>\n"
            for enhancement in vocabulary_enhancements[:3]:  # 限制顯示前3個
                original_word = enhancement.get('original_word', '')
                suggested_alternatives = enhancement.get('suggested_alternatives', [])
                
                if original_word and suggested_alternatives:
                    formatted += f"• {original_word} → {', '.join(suggested_alternatives[:2])}\n"
            formatted += "\n"
        
        # 風格評估
        if style_improvements:
            formatted += "🎯 <b>風格評估：</b>\n"
            if style_improvements.get('formality_level'):
                formatted += f"• 正式程度：{style_improvements['formality_level']}\n"
            if style_improvements.get('clarity_score'):
                formatted += f"• 清晰度：{style_improvements['clarity_score']}\n"
            if style_improvements.get('overall_assessment'):
                formatted += f"• 整體評價：{style_improvements['overall_assessment']}\n"
            formatted += "\n"
        
        # 優化版本
        if final_optimized_versions:
            formatted += "💡 <b>優化版本：</b>\n"
            for i, version in enumerate(final_optimized_versions[:3], 1):
                formatted += f"{i}. {version}\n"
            formatted += "\n"
        
        # 學習建議
        if learning_tips:
            formatted += f"🧠 <b>學習建議：</b>\n{learning_tips}"
        
        return formatted.strip()
        
    except Exception as e:
        logging.error(f"Error formatting sentence optimization response: {e}")
        return f"⚠️ 格式化失敗，但成功分析了句子\n請稍後再試。"

def format_translation_response(structured_data: dict) -> str:
    """格式化翻譯回應為 Telegram 顯示格式"""
    try:
        original_text = structured_data.get('original_text', 'Unknown')
        detected_language = structured_data.get('detected_language', '未知')
        translations = structured_data.get('translations', {})
        language_analysis = structured_data.get('language_analysis', {})
        vocabulary_breakdown = structured_data.get('vocabulary_breakdown', [])
        grammar_comparison = structured_data.get('grammar_comparison', {})
        usage_examples = structured_data.get('usage_examples', [])
        learning_tips = structured_data.get('learning_tips', {})
        
        formatted = f"🌐 <b>原文 ({detected_language})：</b>\n{original_text}\n\n"
        
        # 主要翻譯
        if translations:
            primary_translation = translations.get('primary_translation', '')
            if primary_translation:
                formatted += f"✅ <b>主要翻譯：</b>\n{primary_translation}\n\n"
            
            # 替代翻譯
            alternative_translations = translations.get('alternative_translations', [])
            if alternative_translations:
                formatted += "🔄 <b>替代翻譯：</b>\n"
                for i, alt in enumerate(alternative_translations[:2], 1):
                    formatted += f"{i}. {alt}\n"
                formatted += "\n"
            
            # 直譯
            literal_translation = translations.get('literal_translation', '')
            if literal_translation and literal_translation != primary_translation:
                formatted += f"📖 <b>直譯：</b>\n{literal_translation}\n\n"
        
        # 語言分析
        if language_analysis:
            difficulty = language_analysis.get('language_difficulty', '')
            if difficulty:
                formatted += f"📊 <b>翻譯難度：</b>{difficulty}\n"
            
            # 關鍵挑戰
            key_challenges = language_analysis.get('key_challenges', [])
            if key_challenges:
                formatted += "⚡ <b>翻譯要點：</b>\n"
                for challenge in key_challenges[:2]:
                    formatted += f"• {challenge}\n"
                formatted += "\n"
            
            # 文化背景
            cultural_context = language_analysis.get('cultural_context', {})
            if cultural_context:
                cultural_differences = cultural_context.get('cultural_differences', '')
                usage_context = cultural_context.get('usage_context', '')
                if cultural_differences:
                    formatted += f"🌍 <b>文化差異：</b>\n{cultural_differences}\n"
                if usage_context:
                    formatted += f"📝 <b>使用語境：</b>\n{usage_context}\n"
                formatted += "\n"
        
        # 詞彙解析
        if vocabulary_breakdown:
            formatted += "📚 <b>重點詞彙：</b>\n"
            for vocab in vocabulary_breakdown[:3]:  # 限制顯示前3個
                original_word = vocab.get('original_word', '')
                translated_word = vocab.get('translated_word', '')
                part_of_speech = vocab.get('part_of_speech', '')
                usage_notes = vocab.get('usage_notes', '')
                
                if original_word and translated_word:
                    formatted += f"• <b>{original_word}</b> ({part_of_speech})\n"
                    formatted += f"  → {translated_word}\n"
                    if usage_notes:
                        formatted += f"  💡 {usage_notes}\n"
            formatted += "\n"
        
        # 語法比較
        if grammar_comparison:
            sentence_structure = grammar_comparison.get('sentence_structure', '')
            word_order = grammar_comparison.get('word_order', '')
            
            if sentence_structure or word_order:
                formatted += "🔍 <b>語法對比：</b>\n"
                if sentence_structure:
                    formatted += f"• 句子結構：{sentence_structure}\n"
                if word_order:
                    formatted += f"• 語序差異：{word_order}\n"
                formatted += "\n"
        
        # 使用例句
        if usage_examples:
            formatted += "💡 <b>使用例句：</b>\n"
            for example in usage_examples[:2]:
                scenario = example.get('scenario', '')
                example_original = example.get('example_original', '')
                example_translation = example.get('example_translation', '')
                
                if scenario:
                    formatted += f"<i>{scenario}：</i>\n"
                if example_original:
                    formatted += f"• {example_original}\n"
                if example_translation:
                    formatted += f"• {example_translation}\n"
            formatted += "\n"
        
        # 學習建議
        if learning_tips:
            translation_strategies = learning_tips.get('translation_strategies', '')
            common_mistakes = learning_tips.get('common_mistakes', '')
            
            if translation_strategies or common_mistakes:
                formatted += "🧠 <b>學習建議：</b>\n"
                if translation_strategies:
                    formatted += f"• 策略：{translation_strategies}\n"
                if common_mistakes:
                    formatted += f"• 注意：{common_mistakes}\n"
        
        return formatted.strip()
        
    except Exception as e:
        logging.error(f"Error formatting translation response: {e}")
        return f"⚠️ 格式化失敗，但成功翻譯了文本\n請稍後再試。"

@router.message(Command(commands=["s"]))
async def handle_sentence_analysis_optimization(message: Message, ai_service: AIService, config: dict):
    """處理 /s 命令 - 句子分析和優化"""
    # 提取命令後的文本
    command_args = message.text.split(' ', 1)
    if len(command_args) < 2 or not command_args[1].strip():
        await message.answer("請在 /s 命令後輸入要分析的英語句子。\n\n例如：\n/s I have went to the store yesterday.")
        return
    
    sentence = command_args[1].strip()
    
    processing_message = None
    try:
        # 發送 "正在分析..." 的提示消息
        processing_message = await message.answer("🔍 正在分析句子結構和優化建議...")
        
        # 獲取 AI 分析結果
        raw_response = await ai_service.get_sentence_analysis_optimization(sentence)
        
        # 檢查回應是否表示失敗
        if raw_response.startswith("Sorry, I couldn't process"):
            await processing_message.edit_text("⚠️ AI 服務暫時不可用，請稍後再試。系統已自動重試但仍未成功。")
            return
        
        # 解析結構化回應
        structured_data = ai_service.parse_structured_response(raw_response, is_sentence_optimization=True)
        
        # 格式化回應
        formatted_response = format_sentence_optimization_response(structured_data)
        
        # 編輯原始消息
        await processing_message.edit_text(
            formatted_response,
            parse_mode='HTML'
        )
        
    except asyncio.TimeoutError:
        if processing_message:
            await processing_message.edit_text("⏰ 分析超時，請稍後再試。")
        else:
            await message.answer("⏰ 分析超時，請稍後再試。")
    except Exception as e:
        logging.error(f"Error in sentence analysis optimization: {e}")
        error_msg = "⚠️ 分析過程中發生錯誤，請稍後再試。"
        if "timeout" in str(e).lower():
            error_msg = "⏰ 請求超時，AI 服務可能繁忙，請稍後再試。"
        elif "network" in str(e).lower() or "connection" in str(e).lower():
            error_msg = "🌐 網絡連接問題，請檢查網絡後再試。"
        
        if processing_message:
            await processing_message.edit_text(error_msg)
        else:
            await message.answer(error_msg)

@router.message(Command(commands=["t"]))
async def handle_translation(message: Message, ai_service: AIService, config: dict):
    """處理 /t 命令 - 翻譯功能"""
    # 提取命令後的文本
    command_args = message.text.split(' ', 1)
    if len(command_args) < 2 or not command_args[1].strip():
        await message.answer("請在 /t 命令後輸入要翻譯的文字。\n\n例如：\n/t Hello world\n/t 你好世界")
        return
    
    text_to_translate = command_args[1].strip()
    
    processing_message = None
    try:
        # 發送 "正在翻譯..." 的提示消息
        processing_message = await message.answer("🌐 正在翻譯並分析語言結構...")
        
        # 獲取 AI 翻譯結果
        raw_response = await ai_service.get_translation(text_to_translate)
        
        # 檢查回應是否表示失敗
        if raw_response.startswith("Sorry, I couldn't process"):
            await processing_message.edit_text("⚠️ AI 翻譯服務暫時不可用，請稍後再試。系統已自動重試但仍未成功。")
            return
        
        # 解析結構化回應
        structured_data = ai_service.parse_structured_response(raw_response, is_translation=True)
        
        # 格式化回應
        formatted_response = format_translation_response(structured_data)
        
        # 編輯原始消息
        await processing_message.edit_text(
            formatted_response,
            parse_mode='HTML'
        )
        
    except asyncio.TimeoutError:
        if processing_message:
            await processing_message.edit_text("⏰ 翻譯超時，請稍後再試。")
        else:
            await message.answer("⏰ 翻譯超時，請稍後再試。")
    except Exception as e:
        logging.error(f"Error in translation: {e}")
        error_msg = "⚠️ 翻譯過程中發生錯誤，請稍後再試。"
        if "timeout" in str(e).lower():
            error_msg = "⏰ 請求超時，AI 服務可能繁忙，請稍後再試。"
        elif "network" in str(e).lower() or "connection" in str(e).lower():
            error_msg = "🌐 網絡連接問題，請檢查網絡後再試。"
        
        if processing_message:
            await processing_message.edit_text(error_msg)
        else:
            await message.answer(error_msg)