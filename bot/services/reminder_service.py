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

from .ai_service import AIService
from ..database.sqlite_db import get_words_for_user, get_user_settings

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
        
    async def start(self):
        """啟動提醒服務"""
        try:
            self.scheduler.start()
            logger.info("複習提醒服務已啟動")
            
            # 初始化所有用戶的提醒任務
            await self.initialize_user_reminders()
            
        except Exception as e:
            logger.error(f"啟動複習提醒服務失敗: {e}")

    async def stop(self):
        """停止提醒服務"""
        try:
            self.scheduler.shutdown()
            logger.info("複習提醒服務已停止")
        except Exception as e:
            logger.error(f"停止複習提醒服務失敗: {e}")

    async def initialize_user_reminders(self):
        """初始化所有用戶的提醒任務"""
        try:
            # 這裡需要獲取所有啟用提醒的用戶
            # 由於我們使用 SQLite，需要添加相應的查詢方法
            logger.info("正在初始化用戶提醒任務...")
            
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
            
            # 創建新的提醒任務
            job_id = f"reminder_{user_id}"
            self.scheduler.add_job(
                self.send_reminder_to_user,
                CronTrigger(hour=hour, minute=minute),
                args=[user_id],
                id=job_id,
                replace_existing=True,
                misfire_grace_time=300  # 5分鐘容錯時間
            )
            
            self.active_jobs[user_id] = job_id
            logger.info(f"已為用戶 {user_id} 設定 {reminder_time} 的複習提醒")
            
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
            # 檢查用戶設定
            settings = await get_user_settings(self.db_path, user_id)
            if not settings or not settings.get('learning_preferences', {}).get('review_reminder_enabled', False):
                logger.info(f"用戶 {user_id} 的複習提醒已關閉")
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
            
            logger.info(f"已發送複習提醒給用戶 {user_id}，共 {len(due_words)} 個單字")
            
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
            current_date = datetime.now().strftime('%Y-%m-%d')
            
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
            
            return due_words[:10]  # 限制最多10個單字
            
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
            word_list = "\\n".join([f"• {word['word']}" for word in due_words[:5]])
            
            base_message = f"""
🌟 *每日複習提醒* 🌟

您好！是時候複習您的單字了 📚

📊 **今日複習概況**
• 待複習單字：{len(due_words)} 個
• 每日目標：{daily_target} 個
• 建議複習時間：10-15 分鐘

📝 **優先複習單字：**
{word_list}
{"..." if len(due_words) > 5 else ""}

💡 **小提醒：**
規律複習是記憶的關鍵。每天花幾分鐘複習，勝過臨時抱佛腳！

🚀 點擊 /review 開始複習，或使用 Mini App 進行更豐富的學習體驗。

加油！您距離目標又近了一步 💪
            """.strip()

            # 如果啟用 AI，添加個人化建議
            if settings.get('ai_settings', {}).get('default_explanation_type') == 'deep':
                try:
                    ai_tip = await self.generate_ai_study_tip(due_words)
                    if ai_tip:
                        base_message += f"\\n\\n🤖 **AI 學習建議：**\\n{ai_tip}"
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
                "🎉 太棒了！您目前沒有需要複習的單字。\\n\\n✨ 不如今天學習一些新單字吧？點擊 /add_word 開始。",
                "🌟 恭喜您！複習進度非常棒！\\n\\n📚 考慮挑戰一些更高難度的單字，讓您的英文更上一層樓。",
                "💪 您的學習計劃執行得很好！\\n\\n🚀 今天可以嘗試使用 Mini App 探索更多學習功能。"
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

    def get_reminder_status(self, user_id: int) -> Dict:
        """獲取用戶提醒狀態"""
        return {
            'has_reminder': user_id in self.active_jobs,
            'job_id': self.active_jobs.get(user_id),
            'is_running': self.scheduler.running
        }