"""
複習提醒服務
整合 Telegram Bot 主動通知功能，根據用戶設定發送複習提醒
"""

import asyncio
import logging
from datetime import datetime, timedelta, time
from typing import Dict, List, Optional
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz

from .ai_service import AIService
from ..database.sqlite_db import get_words_for_user, get_user_settings, get_all_users_with_reminders
from ..utils.event_manager import get_event_manager, EventType, Event

logger = logging.getLogger(__name__)

class ReminderService:
    """複習提醒服務類"""
    
    def __init__(self, bot, db_path, config):
        self.bot = bot
        self.db_path = db_path
        self.config = config
        self.scheduler = AsyncIOScheduler()
        self.ai_service = AIService(config)
        self.active_jobs: Dict[int, str] = {}  # user_id -> job_id
        self.event_manager = get_event_manager()
        logger.info(f"ReminderService 使用事件管理器實例: {id(self.event_manager)}")
        
    async def start(self):
        """啟動提醒服務"""
        try:
            self.scheduler.start()
            logger.info("複習提醒服務已啟動")
            
            # 啟動事件管理器
            await self.event_manager.start()
            
            # 訂閱用戶設定更新事件
            self.event_manager.subscribe(
                EventType.USER_SETTINGS_UPDATED, 
                self._handle_user_settings_updated
            )
            self.event_manager.subscribe(
                EventType.REMINDER_SETTINGS_CHANGED,
                self._handle_reminder_settings_changed
            )
            
            # 初始化所有用戶的提醒任務
            await self.initialize_user_reminders()
            
        except Exception as e:
            logger.error(f"啟動複習提醒服務失敗: {e}")

    async def stop(self):
        """停止提醒服務"""
        try:
            self.scheduler.shutdown()
            await self.event_manager.stop()
            logger.info("複習提醒服務已停止")
        except Exception as e:
            logger.error(f"停止複習提醒服務失敗: {e}")

    async def initialize_user_reminders(self):
        """初始化所有用戶的提醒任務"""
        try:
            logger.info("正在初始化用戶提醒任務...")
            
            # 獲取所有啟用提醒的用戶
            users_with_reminders = await get_all_users_with_reminders(self.db_path)
            
            if not users_with_reminders:
                logger.info("未找到啟用提醒的用戶")
                return
            
            # 為每個用戶設定提醒任務
            for user_data in users_with_reminders:
                user_id = user_data['user_id']
                reminder_time = user_data['reminder_time']
                
                try:
                    await self.setup_user_reminder(user_id, reminder_time)
                    logger.info(f"用戶 {user_id} 提醒任務設定成功，時間：{reminder_time}")
                except Exception as user_error:
                    logger.error(f"用戶 {user_id} 提醒任務設定失敗: {user_error}")
            
            logger.info(f"初始化完成，共設定 {len(users_with_reminders)} 個用戶的提醒任務")
            
        except Exception as e:
            logger.error(f"初始化用戶提醒失敗: {e}")

    async def setup_user_reminder(self, user_id: int, reminder_time: str = "09:00"):
        """為用戶設定複習提醒
        
        Args:
            user_id: 用戶 ID
            reminder_time: 提醒時間，格式 "HH:MM"
        """
        try:
            # 移除現有的提醒任務
            await self.remove_user_reminder(user_id)
            
            # 解析時間
            hour, minute = map(int, reminder_time.split(':'))
            
            # 創建新的提醒任務（使用台北時區 UTC+8）
            taipei_tz = pytz.timezone('Asia/Taipei')
            job_id = f"reminder_{user_id}"
            self.scheduler.add_job(
                self.send_reminder_to_user,
                CronTrigger(hour=hour, minute=minute, timezone=taipei_tz),
                args=[user_id],
                id=job_id,
                replace_existing=True,
                misfire_grace_time=300  # 5分鐘容錯時間
            )
            
            self.active_jobs[user_id] = job_id
            
            # 獲取剛設定的任務資訊
            job = self.scheduler.get_job(job_id)
            next_run_time = job.next_run_time if job else "無法獲取"
            
            logger.info(f"✅ 已為用戶 {user_id} 設定 {reminder_time} 的複習提醒")
            logger.info(f"📅 下次執行時間: {next_run_time}")
            logger.info(f"📊 當前活躍任務數: {len(self.active_jobs)}")
            
        except Exception as e:
            logger.error(f"設定用戶 {user_id} 複習提醒失敗: {e}")

    async def remove_user_reminder(self, user_id: int):
        """移除用戶的複習提醒"""
        try:
            if user_id in self.active_jobs:
                job_id = self.active_jobs[user_id]
                self.scheduler.remove_job(job_id)
                del self.active_jobs[user_id]
                logger.info(f"已移除用戶 {user_id} 的複習提醒")
                
        except Exception as e:
            logger.error(f"移除用戶 {user_id} 複習提醒失敗: {e}")

    async def send_reminder_to_user(self, user_id: int):
        """發送複習提醒給指定用戶"""
        try:
            logger.info(f"🔔 開始為用戶 {user_id} 發送複習提醒")
            
            # 檢查用戶設定
            settings = await get_user_settings(self.db_path, user_id)
            if not settings or not settings.get('learning_preferences', {}).get('review_reminder_enabled', False):
                logger.warning(f"用戶 {user_id} 的複習提醒已關閉或無設定")
                return

            # 獲取需要複習的單字
            due_words = await self.get_due_words_for_user(user_id)
            
            if not due_words:
                # 沒有需要複習的單字，發送鼓勵訊息
                await self.send_encouragement_message(user_id)
                return

            # 生成個人化提醒訊息
            reminder_message = await self.generate_reminder_message(user_id, due_words)
            
            # 發送提醒
            await self.bot.send_message(user_id, reminder_message, parse_mode='Markdown')
            
            logger.info(f"✅ 已發送複習提醒給用戶 {user_id}，共 {len(due_words)} 個單字")
            
        except Exception as e:
            logger.error(f"發送複習提醒給用戶 {user_id} 失敗: {e}")

    async def get_due_words_for_user(self, user_id: int) -> List[Dict]:
        """獲取用戶需要複習的單字"""
        try:
            # 獲取用戶詞彙（使用現有的函數）
            vocabulary, _ = await get_words_for_user(self.db_path, user_id, page=0, page_size=1000)
            if not vocabulary:
                return []

            due_words = []
            # 使用台北時區的當前日期
            taipei_tz = pytz.timezone('Asia/Taipei')
            current_date = datetime.now(taipei_tz).strftime('%Y-%m-%d')
            
            for word_data in vocabulary:
                # 檢查是否需要複習（基於 next_review 欄位）
                next_review = word_data.get('next_review')
                if next_review and next_review <= current_date:
                    due_words.append({
                        'word': word_data['word'],
                        'next_review': next_review,
                        'interval': word_data.get('interval', 1),
                        'difficulty': word_data.get('difficulty', 0)
                    })
            
            # 按複習日期排序（最早需要複習的優先）
            due_words.sort(key=lambda x: x['next_review'])
            
            # 根據用戶的每日複習目標限制返回的單字數量
            try:
                settings = await get_user_settings(self.db_path, user_id)
                if settings:
                    learning_prefs = settings.get('learning_preferences', {})
                    daily_target = learning_prefs.get('daily_review_target', 10)
                else:
                    daily_target = 10
                
                # 返回不超過每日目標數量的單字，最多不超過20個
                limit = min(daily_target, 20)
                return due_words[:limit]
                
            except Exception as settings_error:
                logger.warning(f"無法獲取用戶 {user_id} 設定，使用預設限制: {settings_error}")
                return due_words[:10]  # 預設限制10個單字
            
        except Exception as e:
            logger.error(f"獲取用戶 {user_id} 待複習單字失敗: {e}")
            return []

    async def generate_reminder_message(self, user_id: int, due_words: List[Dict]) -> str:
        """生成個人化複習提醒訊息"""
        try:
            # 獲取用戶設定
            settings = await get_user_settings(self.db_path, user_id)
            daily_target = settings.get('learning_preferences', {}).get('daily_review_target', 20)
            
            # 基本提醒訊息
            word_list = "\n".join([f"• {word['word']}" for word in due_words[:5]])
            
            base_message = f"""🌟 *每日複習提醒*

📚 今天有 *{len(due_words)} 個*單字需要複習
🎯 每日目標：{daily_target} 個
⏰ 建議用時：10-15 分鐘

📝 *優先複習：*
{word_list}
{"..." if len(due_words) > 5 else ""}

💡 堅持每日複習，效果更佳！

📱 開啟 *Mini App* 開始學習""".strip()

            # 如果啟用 AI，添加個人化建議
            if settings.get('ai_settings', {}).get('default_explanation_type') == 'deep':
                try:
                    ai_tip = await self.generate_ai_study_tip(due_words)
                    if ai_tip:
                        base_message += f"\n\n🤖 **AI 學習建議：**\n{ai_tip}"
                except Exception as e:
                    logger.warning(f"生成 AI 學習建議失敗: {e}")

            return base_message
            
        except Exception as e:
            logger.error(f"生成提醒訊息失敗: {e}")
            return "🌟 是時候複習您的單字了！點擊 /review 開始複習。"

    async def generate_ai_study_tip(self, due_words: List[Dict]) -> Optional[str]:
        """使用 AI 生成學習建議"""
        try:
            if not due_words:
                return None
            
            word_list = [word['word'] for word in due_words[:3]]
            
            prompt = f"""
            請為以下英文單字提供一個簡潔的學習建議（50字內）：
            {', '.join(word_list)}
            
            重點：
            1. 如何記憶這些單字
            2. 是否有共同特徵
            3. 實用的記憶技巧
            
            用繁體中文回答，語氣友善鼓勵。
            """
            
            response = await self.ai_service.get_simple_response(prompt)
            return response.strip() if response else None
            
        except Exception as e:
            logger.error(f"生成 AI 學習建議失敗: {e}")
            return None

    async def send_encouragement_message(self, user_id: int):
        """發送鼓勵訊息（當沒有需要複習的單字時）"""
        try:
            encouragement_messages = [
                "🎉 *太棒了！*\n沒有需要複習的單字\n\n✨ 可以在 Mini App 中\n學習一些新單字",
                "🌟 *恭喜！*\n複習進度非常好\n\n📚 可以挑戰更難的單字\n提升英文水平",
                "💪 *做得好！*\n學習計劃執行順利\n\n🚀 開啟 Mini App 探索\n更多學習功能"
            ]
            
            import random
            message = random.choice(encouragement_messages)
            
            await self.bot.send_message(user_id, message, parse_mode='Markdown')
            logger.info(f"已發送鼓勵訊息給用戶 {user_id}")
            
        except Exception as e:
            logger.error(f"發送鼓勵訊息給用戶 {user_id} 失敗: {e}")

    async def send_weekly_report(self, user_id: int):
        """發送週報告"""
        try:
            # 獲取用戶一周的學習數據
            # 這裡需要添加統計功能
            
            report_message = """
📊 **週學習報告** 📊

🎯 **本週成就**
• 新學單字：15 個
• 複習次數：42 次
• 連續學習：5 天

⭐ **表現評估**
您本週的學習表現很棒！保持這個節奏，英文水平一定會有顯著提升。

🎯 **下週目標**
建議下週挑戰學習 20 個新單字，加油！

💡 使用 /progress 查看詳細學習數據
            """.strip()
            
            await self.bot.send_message(user_id, report_message, parse_mode='Markdown')
            
        except Exception as e:
            logger.error(f"發送週報告給用戶 {user_id} 失敗: {e}")

    async def update_user_reminder_settings(self, user_id: int):
        """動態更新用戶的提醒設定
        
        當用戶修改提醒設定時調用此方法，會重新讀取設定並更新提醒任務
        """
        try:
            # 獲取用戶最新設定
            settings = await get_user_settings(self.db_path, user_id)
            
            if not settings:
                logger.info(f"用戶 {user_id} 沒有設定，移除提醒任務")
                await self.remove_user_reminder(user_id)
                return
            
            learning_preferences = settings.get('learning_preferences', {})
            reminder_enabled = learning_preferences.get('review_reminder_enabled', False)
            
            if not reminder_enabled:
                # 用戶關閉了提醒，移除現有任務
                logger.info(f"用戶 {user_id} 關閉了提醒功能，移除提醒任務")
                await self.remove_user_reminder(user_id)
            else:
                # 用戶開啟了提醒，設定或更新任務
                reminder_time = learning_preferences.get('review_reminder_time', '09:00')
                await self.setup_user_reminder(user_id, reminder_time)
                logger.info(f"用戶 {user_id} 的提醒設定已更新：{reminder_time}")
                
        except Exception as e:
            logger.error(f"更新用戶 {user_id} 提醒設定失敗: {e}")

    def get_reminder_status(self, user_id: int) -> Dict:
        """獲取用戶提醒狀態"""
        return {
            'has_reminder': user_id in self.active_jobs,
            'job_id': self.active_jobs.get(user_id),
            'is_running': self.scheduler.running
        }
    
    def get_all_active_reminders(self) -> Dict[int, str]:
        """獲取所有活躍的提醒任務"""
        return self.active_jobs.copy()
    
    async def _handle_user_settings_updated(self, event: Event):
        """處理用戶設定更新事件"""
        try:
            user_id = event.user_id
            logger.info(f"📡 ReminderService 收到用戶 {user_id} 設定更新事件")
            
            # 重新讀取用戶設定並更新提醒
            await self.update_user_reminder_settings(user_id)
            logger.info(f"✅ 用戶 {user_id} 設定更新處理完成")
            
        except Exception as e:
            logger.error(f"❌ 處理用戶設定更新事件失敗 (user_id: {event.user_id}): {e}")
            import traceback
            logger.error(f"詳細錯誤: {traceback.format_exc()}")
    
    async def _handle_reminder_settings_changed(self, event: Event):
        """處理提醒設定變更事件"""
        try:
            user_id = event.user_id
            data = event.data or {}
            reminder_enabled = data.get('reminder_enabled', False)
            reminder_time = data.get('reminder_time')
            
            logger.info(f"📡 ReminderService 收到用戶 {user_id} 提醒設定變更事件: enabled={reminder_enabled}, time={reminder_time}")
            
            if not reminder_enabled:
                # 關閉提醒
                logger.info(f"🔕 關閉用戶 {user_id} 的提醒")
                await self.remove_user_reminder(user_id)
            else:
                # 開啟或更新提醒
                logger.info(f"🔔 開啟/更新用戶 {user_id} 的提醒")
                if reminder_time:
                    await self.setup_user_reminder(user_id, reminder_time)
                else:
                    # 如果沒有提供時間，使用預設或從資料庫讀取
                    await self.update_user_reminder_settings(user_id)
            
            logger.info(f"✅ 用戶 {user_id} 提醒設定變更處理完成")
            
        except Exception as e:
            logger.error(f"❌ 處理提醒設定變更事件失敗 (user_id: {event.user_id}): {e}")
            import traceback
            logger.error(f"詳細錯誤: {traceback.format_exc()}")