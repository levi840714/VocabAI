"""
提醒處理器
處理用戶的複習提醒相關命令
"""

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.types import Message, InlineKeyboardMarkup, InlineKeyboardButton, CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
import re
import logging

from bot.database.sqlite_db import get_user_settings, update_user_settings

logger = logging.getLogger(__name__)

router = Router()

class ReminderStates(StatesGroup):
    """提醒設定狀態"""
    waiting_for_time = State()

@router.message(Command(commands=["reminder", "提醒", "settings"]))
async def reminder_settings_handler(message: Message) -> None:
    """處理提醒設定命令"""
    try:
        user_id = message.from_user.id
        
        # 獲取當前用戶設定
        settings = await get_user_settings(user_id)
        
        learning_prefs = settings.get('learning_preferences', {}) if settings else {}
        reminder_enabled = learning_prefs.get('review_reminder_enabled', False)
        reminder_time = learning_prefs.get('review_reminder_time', '09:00')
        
        status_text = "✅ 已開啟" if reminder_enabled else "❌ 已關閉"
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🔔 開啟提醒" if not reminder_enabled else "🔕 關閉提醒",
                    callback_data=f"reminder_toggle_{user_id}"
                )
            ],
            [
                InlineKeyboardButton(
                    text="⏰ 設定提醒時間",
                    callback_data=f"reminder_time_{user_id}"
                )
            ],
            [
                InlineKeyboardButton(
                    text="📊 測試提醒",
                    callback_data=f"reminder_test_{user_id}"
                )
            ]
        ])
        
        await message.answer(
            f"""
🔔 **複習提醒設定**

**當前狀態：** {status_text}
**提醒時間：** {reminder_time}

複習提醒會在每天指定時間自動發送，幫助您保持學習習慣。

請選擇您要進行的操作：
            """.strip(),
            reply_markup=keyboard,
            parse_mode='Markdown'
        )
        
    except Exception as e:
        logger.error(f"處理提醒設定失敗: {e}")
        await message.answer("設定提醒時發生錯誤，請稍後再試。")

@router.callback_query(F.data.startswith("reminder_toggle_"))
async def toggle_reminder_handler(callback: CallbackQuery) -> None:
    """切換提醒開關"""
    try:
        user_id = int(callback.data.split("_")[-1])
        
        if callback.from_user.id != user_id:
            await callback.answer("❌ 無權限操作", show_alert=True)
            return
        
        # 獲取當前設定
        settings = await get_user_settings(user_id) or {}
        learning_prefs = settings.get('learning_preferences', {})
        
        # 切換提醒狀態
        current_enabled = learning_prefs.get('review_reminder_enabled', False)
        new_enabled = not current_enabled
        
        # 更新設定
        new_learning_prefs = {**learning_prefs, 'review_reminder_enabled': new_enabled}
        new_settings = {**settings, 'learning_preferences': new_learning_prefs}
        
        await update_user_settings(user_id, new_settings)
        
        # 更新提醒服務
        reminder_service = callback.bot.get('reminder_service')
        if reminder_service:
            if new_enabled:
                reminder_time = learning_prefs.get('review_reminder_time', '09:00')
                await reminder_service.setup_user_reminder(user_id, reminder_time)
            else:
                await reminder_service.remove_user_reminder(user_id)
        
        status_text = "✅ 已開啟" if new_enabled else "❌ 已關閉"
        action_text = "開啟" if new_enabled else "關閉"
        
        await callback.answer(f"✅ 提醒已{action_text}")
        
        # 更新鍵盤
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🔔 開啟提醒" if not new_enabled else "🔕 關閉提醒",
                    callback_data=f"reminder_toggle_{user_id}"
                )
            ],
            [
                InlineKeyboardButton(
                    text="⏰ 設定提醒時間",
                    callback_data=f"reminder_time_{user_id}"
                )
            ],
            [
                InlineKeyboardButton(
                    text="📊 測試提醒",
                    callback_data=f"reminder_test_{user_id}"
                )
            ]
        ])
        
        await callback.message.edit_text(
            f"""
🔔 **複習提醒設定**

**當前狀態：** {status_text}
**提醒時間：** {learning_prefs.get('review_reminder_time', '09:00')}

複習提醒會在每天指定時間自動發送，幫助您保持學習習慣。

請選擇您要進行的操作：
            """.strip(),
            reply_markup=keyboard,
            parse_mode='Markdown'
        )
        
    except Exception as e:
        logger.error(f"切換提醒狀態失敗: {e}")
        await callback.answer("❌ 切換提醒狀態失敗", show_alert=True)

@router.callback_query(F.data.startswith("reminder_time_"))
async def set_reminder_time_handler(callback: CallbackQuery, state: FSMContext) -> None:
    """設定提醒時間"""
    try:
        user_id = int(callback.data.split("_")[-1])
        
        if callback.from_user.id != user_id:
            await callback.answer("❌ 無權限操作", show_alert=True)
            return
        
        await state.set_state(ReminderStates.waiting_for_time)
        await state.update_data(user_id=user_id)
        
        await callback.message.answer(
            """
⏰ **設定提醒時間**

請輸入您希望收到複習提醒的時間，格式為 `HH:MM`

例如：
• `09:00` - 上午 9 點
• `18:30` - 下午 6 點半
• `21:15` - 晚上 9 點 15 分

請輸入時間：
            """.strip(),
            parse_mode='Markdown'
        )
        
        await callback.answer()
        
    except Exception as e:
        logger.error(f"設定提醒時間失敗: {e}")
        await callback.answer("❌ 設定提醒時間失敗", show_alert=True)

@router.message(ReminderStates.waiting_for_time)
async def process_reminder_time(message: Message, state: FSMContext) -> None:
    """處理提醒時間輸入"""
    try:
        time_text = message.text.strip()
        
        # 驗證時間格式
        time_pattern = r'^([01]?\d|2[0-3]):([0-5]\d)$'
        if not re.match(time_pattern, time_text):
            await message.answer(
                "❌ 時間格式不正確，請使用 `HH:MM` 格式，例如 `09:00` 或 `18:30`",
                parse_mode='Markdown'
            )
            return
        
        # 獲取狀態數據
        data = await state.get_data()
        user_id = data['user_id']
        
        # 更新用戶設定
        settings = await get_user_settings(user_id) or {}
        learning_prefs = settings.get('learning_preferences', {})
        
        new_learning_prefs = {**learning_prefs, 'review_reminder_time': time_text}
        new_settings = {**settings, 'learning_preferences': new_learning_prefs}
        
        await update_user_settings(user_id, new_settings)
        
        # 如果提醒已啟用，更新提醒服務
        if learning_prefs.get('review_reminder_enabled', False):
            reminder_service = message.bot.get('reminder_service')
            if reminder_service:
                await reminder_service.setup_user_reminder(user_id, time_text)
        
        await state.clear()
        
        await message.answer(
            f"✅ 提醒時間已設定為 **{time_text}**\\n\\n"
            f"{'🔔 提醒功能已啟用，您將在每天 ' + time_text + ' 收到複習提醒' if learning_prefs.get('review_reminder_enabled') else '💡 請記得開啟提醒功能以接收每日提醒'}",
            parse_mode='Markdown'
        )
        
    except Exception as e:
        logger.error(f"處理提醒時間失敗: {e}")
        await message.answer("❌ 設定提醒時間失敗，請稍後再試")
        await state.clear()

@router.callback_query(F.data.startswith("reminder_test_"))
async def test_reminder_handler(callback: CallbackQuery) -> None:
    """測試提醒功能"""
    try:
        user_id = int(callback.data.split("_")[-1])
        
        if callback.from_user.id != user_id:
            await callback.answer("❌ 無權限操作", show_alert=True)
            return
        
        # 獲取提醒服務
        reminder_service = callback.bot.get('reminder_service')
        if not reminder_service:
            await callback.answer("❌ 提醒服務不可用", show_alert=True)
            return
        
        await callback.answer("📤 正在發送測試提醒...")
        
        # 發送測試提醒
        await reminder_service.send_reminder_to_user(user_id)
        
        await callback.message.answer(
            "📬 **測試提醒已發送！**\\n\\n"
            "如果您收到了提醒訊息，表示提醒功能運作正常。\\n\\n"
            "💡 實際的每日提醒會在您設定的時間自動發送。",
            parse_mode='Markdown'
        )
        
    except Exception as e:
        logger.error(f"測試提醒失敗: {e}")
        await callback.answer("❌ 測試提醒失敗", show_alert=True)

@router.message(Command(commands=["review"]))
async def review_command_handler(message: Message) -> None:
    """處理複習命令"""
    try:
        user_id = message.from_user.id
        
        # 這裡可以整合現有的複習功能
        # 或者引導用戶使用 Mini App
        
        keyboard = InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🚀 開始複習 (Mini App)",
                    url="https://t.me/your_bot?startapp=study"
                )
            ],
            [
                InlineKeyboardButton(
                    text="📚 查看單字庫",
                    callback_data=f"vocabulary_{user_id}"
                )
            ]
        ])
        
        await message.answer(
            """
📚 **開始複習**

您可以選擇以下方式進行複習：

🌟 **推薦使用 Mini App** - 提供更豐富的學習體驗，包括：
• 間隔重複複習系統
• AI 智能解釋
• 學習進度追蹤
• 語音發音功能

或者您也可以在這裡查看您的單字庫。
            """.strip(),
            reply_markup=keyboard,
            parse_mode='Markdown'
        )
        
    except Exception as e:
        logger.error(f"處理複習命令失敗: {e}")
        await message.answer("❌ 載入複習功能失敗，請稍後再試")