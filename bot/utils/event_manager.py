"""
事件管理器
使用發布-訂閱模式實現解耦的事件通知系統
"""

import asyncio
import logging
from typing import Dict, List, Callable, Any
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)

class EventType(Enum):
    """事件類型枚舉"""
    USER_SETTINGS_UPDATED = "user_settings_updated"
    REMINDER_SETTINGS_CHANGED = "reminder_settings_changed"
    USER_REGISTERED = "user_registered"
    USER_DELETED = "user_deleted"

@dataclass
class Event:
    """事件數據結構"""
    event_type: EventType
    user_id: int
    data: Dict[str, Any] = None
    timestamp: float = None
    
    def __post_init__(self):
        if self.timestamp is None:
            import time
            self.timestamp = time.time()

class EventManager:
    """事件管理器 - 單例模式"""
    
    _instance = None
    _lock = asyncio.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._subscribers: Dict[EventType, List[Callable]] = {}
            self._event_queue = asyncio.Queue()
            self._running = False
            self._processor_task = None
            self._initialized = True
    
    async def start(self):
        """啟動事件處理器"""
        if self._running:
            return
        
        self._running = True
        self._processor_task = asyncio.create_task(self._process_events())
        logger.info("事件管理器已啟動")
    
    async def stop(self):
        """停止事件處理器"""
        if not self._running:
            return
        
        self._running = False
        
        # 添加一個停止事件來結束處理循環
        await self._event_queue.put(None)
        
        if self._processor_task:
            try:
                await self._processor_task
            except asyncio.CancelledError:
                pass
        
        logger.info("事件管理器已停止")
    
    def subscribe(self, event_type: EventType, callback: Callable):
        """訂閱事件
        
        Args:
            event_type: 事件類型
            callback: 回調函數，應該是 async 函數，接收 Event 參數
        """
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        
        self._subscribers[event_type].append(callback)
        logger.info(f"已訂閱事件 {event_type.value}")
    
    def unsubscribe(self, event_type: EventType, callback: Callable):
        """取消訂閱事件"""
        if event_type in self._subscribers:
            try:
                self._subscribers[event_type].remove(callback)
                logger.info(f"已取消訂閱事件 {event_type.value}")
            except ValueError:
                logger.warning(f"嘗試取消不存在的訂閱: {event_type.value}")
    
    async def publish(self, event: Event):
        """發布事件"""
        try:
            await self._event_queue.put(event)
            logger.debug(f"事件已發布: {event.event_type.value} for user {event.user_id}")
        except Exception as e:
            logger.error(f"發布事件失敗: {e}")
    
    async def publish_user_settings_updated(self, user_id: int, settings_data: Dict[str, Any] = None):
        """便捷方法：發布用戶設定更新事件"""
        event = Event(
            event_type=EventType.USER_SETTINGS_UPDATED,
            user_id=user_id,
            data=settings_data or {}
        )
        await self.publish(event)
    
    async def publish_reminder_settings_changed(self, user_id: int, reminder_enabled: bool, reminder_time: str = None):
        """便捷方法：發布提醒設定變更事件"""
        event = Event(
            event_type=EventType.REMINDER_SETTINGS_CHANGED,
            user_id=user_id,
            data={
                'reminder_enabled': reminder_enabled,
                'reminder_time': reminder_time
            }
        )
        await self.publish(event)
    
    async def _process_events(self):
        """事件處理循環"""
        logger.info("事件處理器開始運行")
        
        while self._running:
            try:
                # 等待事件
                event = await self._event_queue.get()
                
                # 停止信號
                if event is None:
                    break
                
                # 處理事件
                await self._handle_event(event)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"處理事件時發生錯誤: {e}")
    
    async def _handle_event(self, event: Event):
        """處理單個事件"""
        subscribers = self._subscribers.get(event.event_type, [])
        
        if not subscribers:
            logger.debug(f"沒有訂閱者處理事件: {event.event_type.value}")
            return
        
        # 並行執行所有回調函數
        tasks = []
        for callback in subscribers:
            try:
                task = asyncio.create_task(callback(event))
                tasks.append(task)
            except Exception as e:
                logger.error(f"創建回調任務失敗: {e}")
        
        # 等待所有任務完成
        if tasks:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 檢查是否有錯誤
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    logger.error(f"事件回調 {i} 執行失敗: {result}")

# 全局事件管理器實例
_event_manager = None

def get_event_manager() -> EventManager:
    """獲取全局事件管理器實例"""
    global _event_manager
    if _event_manager is None:
        _event_manager = EventManager()
        # 添加調試信息
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"創建新的事件管理器實例: {id(_event_manager)}")
    return _event_manager