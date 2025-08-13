"""
提醒處理器（簡化版）
只提供基本的提醒狀態查看功能，實際設定請使用 Mini App
"""

from aiogram import Router
from aiogram.filters import Command
from aiogram.types import Message
import logging

from bot.database.sqlite_db import get_user_settings

logger = logging.getLogger(__name__)

router = Router()

@router.message(Command(commands=["reminder", "提醒"]))
async def reminder_status_handler(message: Message) -> None:
    """顯示提醒狀態"""
    try:
        user_id = message.from_user.id
        
        # 獲取當前用戶設定
        from config_loader import load_config
        config = load_config()
        db_path = config['database']['db_path']
        settings = await get_user_settings(db_path, user_id)
        
        if not settings:
            await message.answer(
                "🔔 *提醒狀態*\n\n"
                "您還沒有設定複習提醒。\n\n"
                "📱 請使用 *Mini App* 進行提醒設定和管理",
                parse_mode='Markdown'
            )
            return
        
        learning_prefs = settings.get('learning_preferences', {})
        reminder_enabled = learning_prefs.get('review_reminder_enabled', False)
        reminder_time = learning_prefs.get('review_reminder_time', '09:00')
        
        status_emoji = "🔔" if reminder_enabled else "🔕"
        status_text = "已開啟" if reminder_enabled else "已關閉"
        
        message_text = f"""🔔 *複習提醒狀態*

{status_emoji} **狀態：** {status_text}"""
        
        if reminder_enabled:
            message_text += f"\n⏰ **時間：** {reminder_time}"
        
        message_text += f"""

📱 如需修改設定，請使用 *Mini App*
💡 Mini App 提供更完整的學習管理功能"""
        
        await message.answer(message_text, parse_mode='Markdown')
        
    except Exception as e:
        logger.error(f"查看提醒狀態失敗: {e}")
        await message.answer("查看提醒狀態時發生錯誤，請稍後再試。")