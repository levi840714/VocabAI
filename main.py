import asyncio
import logging
import yaml
import os
import sys
import atexit
import sqlite3
import signal
from threading import Thread
from aiohttp import web
import subprocess
import uvicorn

from google.cloud import storage
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application


from config_loader import load_config
from aiohttp import web
import json

class GCSDBSync:
    """GCS 資料庫同步管理器"""
    
    def __init__(self, gcs_bucket_name: str, db_path: str):
        self.bucket_name = gcs_bucket_name
        self.db_path = db_path
        self.db_file_name = os.path.basename(db_path)
        self.client = None
        self.bucket = None
        self.blob = None
        
    def initialize(self):
        """初始化 GCS 連接"""
        try:
            self.client = storage.Client()
            self.bucket = self.client.get_bucket(self.bucket_name)
            self.blob = self.bucket.blob(self.db_file_name)
            logging.info(f"GCS 同步管理器初始化成功: {self.bucket_name}")
            return True
        except Exception as e:
            logging.error(f"GCS 同步管理器初始化失敗: {e}")
            return False
    
    def download_db(self):
        """從 GCS 下載資料庫"""
        try:
            if self.blob.exists():
                logging.info(f"正在從 GCS 下載 {self.db_file_name}...")
                self.blob.download_to_filename(self.db_path)
                logging.info("資料庫下載成功")
                return True
            else:
                logging.info(f"GCS 中未找到 {self.db_file_name}，將創建新的本地資料庫")
                self._ensure_db_exists()
                return False
        except Exception as e:
            logging.error(f"下載資料庫失敗: {e}")
            self._ensure_db_exists()
            return False
    
    def upload_db(self, force=False):
        """上傳資料庫到 GCS"""
        try:
            if not os.path.exists(self.db_path):
                logging.warning(f"資料庫文件不存在，跳過上傳: {self.db_path}")
                return False
            
            # 檢查資料庫完整性
            if not self._check_db_integrity():
                logging.error("資料庫完整性檢查失敗，跳過上傳")
                return False
            
            logging.info(f"正在上傳 {self.db_file_name} 到 GCS...")
            self.blob.upload_from_filename(self.db_path)
            logging.info("資料庫上傳成功")
            return True
            
        except Exception as e:
            logging.error(f"上傳資料庫失敗: {e}")
            return False
    
    def _ensure_db_exists(self):
        """確保本地資料庫文件存在"""
        if not os.path.exists(self.db_path):
            open(self.db_path, 'a').close()
            logging.info(f"創建空資料庫文件: {self.db_path}")
    
    def _check_db_integrity(self):
        """檢查資料庫完整性"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("PRAGMA integrity_check")
            return True
        except sqlite3.Error as e:
            logging.error(f"資料庫完整性檢查失敗: {e}")
            return False
    
    def start_periodic_sync(self, interval_minutes=5):
        """啟動定期同步 (背景執行)"""
        import asyncio
        
        async def periodic_upload():
            while True:
                try:
                    await asyncio.sleep(interval_minutes * 60)  # 轉換為秒
                    logging.info("執行定期資料庫同步...")
                    self.upload_db()
                except Exception as e:
                    logging.error(f"定期同步失敗: {e}")
        
        # 在背景執行定期同步
        asyncio.create_task(periodic_upload())
        logging.info(f"定期同步已啟動，間隔: {interval_minutes} 分鐘")

async def setup_api_routes(app):
    """Setup API routes on aiohttp server."""
    # Import API functions
    from api.crud import get_user_words, get_user_stats
    from api.dependencies import validate_user_access
    from config_loader import load_config
    
    async def get_words_handler(request):
        try:
            # Get user_id from query params
            user_id = request.query.get('user_id')
            if user_id:
                user_id = int(user_id)
            
            # Validate user access
            user_id = validate_user_access(user_id)
            
            # Get config for db_path
            config = load_config()
            db_path = config.get('database', {}).get('db_path', 'memwhiz.db')
            
            # Get words (returns tuple of words list and total count)
            words, total_count = await get_user_words(db_path, user_id)
            
            return web.json_response([{
                'id': word['id'],
                'word': word['word'],
                'initial_ai_explanation': word.get('initial_ai_explanation'),
                'chinese_meaning': word.get('chinese_meaning'),
                'user_notes': word.get('user_notes'),
                'interval': word.get('interval', 1),
                'difficulty': word.get('difficulty', 0),
                'next_review': word.get('next_review'),
                'created_at': word.get('created_at')
            } for word in words])
            
        except Exception as e:
            return web.json_response({'error': str(e)}, status=400)
    
    async def get_stats_handler(request):
        try:
            # Get user_id from query params
            user_id = request.query.get('user_id')
            if user_id:
                user_id = int(user_id)
            
            # Validate user access
            user_id = validate_user_access(user_id)
            
            # Get config for db_path
            config = load_config()
            db_path = config.get('database', {}).get('db_path', 'memwhiz.db')
            
            # Get stats
            stats = await get_user_stats(db_path, user_id)
            
            return web.json_response(stats)
            
        except Exception as e:
            return web.json_response({'error': str(e)}, status=400)
    
    # 全域 GCS 同步管理器 (在 main 函數中設定)
    global gcs_sync_manager
    
    async def sync_db_handler(request):
        """手動觸發資料庫同步的 API 端點"""
        try:
            if 'gcs_sync_manager' in globals() and gcs_sync_manager:
                success = gcs_sync_manager.upload_db()
                if success:
                    return web.json_response({'status': 'success', 'message': '資料庫同步成功'})
                else:
                    return web.json_response({'status': 'error', 'message': '資料庫同步失敗'}, status=500)
            else:
                return web.json_response({'status': 'error', 'message': '未啟用 GCS 同步'}, status=400)
        except Exception as e:
            return web.json_response({'status': 'error', 'message': str(e)}, status=500)
    
    # Add CORS middleware
    @web.middleware
    async def cors_middleware(request, handler):
        if request.method == "OPTIONS":
            response = web.Response()
        else:
            response = await handler(request)
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept, Origin, X-Requested-With'
        return response
    
    # Add OPTIONS handler for CORS preflight
    async def options_handler(request):
        return web.Response()
    
    # Bridge converter
    # NOTE:
    # - Do NOT implement endpoint-specific mapping in main.py.
    # - Implement/adjust bridging logic in bridge/converter.py only.
    # - New FastAPI endpoints (api/main.py) will be auto-registered to aiohttp below.
    from bridge.converter import make_converter
    convert_fastapi_to_aiohttp = make_converter(validate_user_access)

    # aiohttp 專屬管理端點
    app.router.add_post('/api/v1/sync-db', sync_db_handler)
    
    # CORS OPTIONS handlers
    app.router.add_options('/api/{path:.*}', options_handler)
    
    # Add CORS middleware
    app.middlewares.append(cors_middleware)

    # Centralized auto-bridge for all FastAPI routes
    # NOTE:
    # - Route registration is centralized in bridge/routes.py
    # - Do NOT add app.router.add_* here for API endpoints.
    from bridge.routes import auto_register_fastapi_routes
    await auto_register_fastapi_routes(app, convert_fastapi_to_aiohttp)

    # Feature-specific explicit bridge (bookmarks & legacy hello)
    try:
        from bridge.aiohttp_bridge import register_bookmark_routes
        await register_bookmark_routes(app, convert_fastapi_to_aiohttp)
    except Exception as e:
        logging.warning(f"Extra bookmark bridge failed: {e}")

    # Register additional bridge routes (bookmarks, legacy hello)
    try:
        from bridge.aiohttp_bridge import register_bookmark_routes
        await register_bookmark_routes(app, convert_fastapi_to_aiohttp)
        logging.info("Bookmark and legacy routes bridged via external module")
    except Exception as e:
        logging.warning(f"Failed to register extra bridge routes: {e}")

async def setup_bot_and_dispatcher():
    """Setup bot and dispatcher with all handlers and services."""
    config = load_config()

    # Initialize database
    from bot.database.sqlite_db import init_db
    await init_db(config['database']['db_path'])

    bot = Bot(
        token=config['telegram']['bot_token'], 
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )
    dp = Dispatcher()

    # Initialize AI Service
    from bot.services.ai_service import AIService
    ai_service = AIService(config)
    
    # Initialize Reminder Service
    from bot.services.reminder_service import ReminderService
    reminder_service = ReminderService(bot, config['database']['db_path'], config)
    await reminder_service.start()

    # Register handlers
    from bot.handlers import common, word_handler, vocabulary_handler, review_handler, reminder_handler
    dp.include_router(common.router)
    dp.include_router(vocabulary_handler.router)
    dp.include_router(review_handler.router)
    dp.include_router(word_handler.router)
    dp.include_router(reminder_handler.router)

    # Pass services and config to all handlers
    dp['ai_service'] = ai_service
    dp['reminder_service'] = reminder_service
    dp['config'] = config

    # Setup scheduler
    from bot.utils.scheduler import setup_scheduler
    setup_scheduler(bot, config['database']['db_path'])
    
    return bot, dp, config

async def start_webhook():
    """Start bot in webhook mode with integrated API server."""
    bot, dp, config = await setup_bot_and_dispatcher()
    
    # Webhook configuration
    webhook_config = config.get('webhook', {})
    webhook_url = os.getenv('WEBHOOK_URL') or webhook_config.get('url', 'https://your-domain.com/webhook')
    webhook_path = '/webhook'  # Standard webhook path
    host = '0.0.0.0'  # Listen on all interfaces
    port = int(os.getenv('PORT', os.getenv('API_PORT', '8080')))
    
    # Set webhook
    logging.info(f"Setting webhook URL: {webhook_url}")
    try:
        await bot.set_webhook(url=webhook_url)
        logging.info("Webhook URL set successfully")
    except Exception as e:
        logging.error(f"Failed to set webhook URL: {e}")
        # 不再在同一進程中切換到 polling，以避免重複附掛 Router 的風險
        raise
    
    # Create aiohttp application
    app = web.Application()
    
    # Check if we should add API routes to the same server
    start_api = os.getenv('START_API', 'true').lower() == 'true'
    
    if start_api:
        # Add basic API routes directly to aiohttp
        await setup_api_routes(app)
        logging.info("API routes added to webhook server")
    
    # Setup webhook handler
    webhook_requests_handler = SimpleRequestHandler(
        dispatcher=dp,
        bot=bot,
    )
    
    # Register webhook handler on the application
    webhook_requests_handler.register(app, path=webhook_path)
    
    # Mount dispatcher startup and shutdown hooks to aiohttp application
    setup_application(app, dp, bot=bot)
    
    # And finally start webserver
    runner = web.AppRunner(app)
    await runner.setup()
    
    site = web.TCPSite(runner, host, port)
    await site.start()
    
    logging.info(f"Webhook mode started on {host}:{port}{webhook_path}")
    logging.info(f"Webhook URL: {webhook_url}")
    if start_api:
        logging.info(f"API available at http://{host}:{port}/api/v1")
    
    # Keep the server running
    try:
        await asyncio.Future()  # run forever
    finally:
        await runner.cleanup()

async def start_polling():
    """Start bot in polling mode (for testing)."""
    bot, dp, config = await setup_bot_and_dispatcher()
    
    # Clear webhook if set
    await bot.delete_webhook()
    
    logging.info("Polling mode started")
    await dp.start_polling(bot)

def start_api_server():
    """Start the API server using subprocess."""
    try:
        # Get the current virtual environment's Python executable
        current_dir = os.path.dirname(__file__)
        api_dir = os.path.join(current_dir, 'api')
        
        # Get API port from environment variable
        api_port = os.getenv('PORT', os.getenv('API_PORT', '8080'))
        
        # Use the same Python executable that's running this script
        # Since we're running from api/ directory, the module is just main:app
        cmd = [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", api_port, "--reload"]
        
        logging.info(f"Starting API server in directory: {api_dir}")
        logging.info(f"Using Python: {sys.executable}")
        logging.info(f"API Port: {api_port}")
        logging.info(f"Command: {' '.join(cmd)}")
        
        process = subprocess.Popen(
            cmd,
            cwd=api_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        logging.info("API server process started successfully")
        return process
        
    except Exception as e:
        logging.error(f"Failed to start API server: {e}")
        return None

async def main():
    logging.basicConfig(level=logging.INFO)

    # Load configuration
    config = load_config()

    is_cloud_run = os.getenv('K_SERVICE') is not None
    db_path = config['database']['db_path'] # Get the determined DB path

    # --- GCS 資料庫處理 (僅在 Cloud Run 環境下執行) ---
    gcs_sync = None
    global gcs_sync_manager
    gcs_sync_manager = None
    
    if is_cloud_run:
        gcs_bucket_name = config['database'].get('gcs_bucket')  # Get bucket name from config
        
        if not gcs_bucket_name:
            logging.error("DATABASE_GCS_BUCKET environment variable not set in Cloud Run. Database persistence will fail.")
            # 確保資料庫文件存在
            if not os.path.exists(db_path):
                open(db_path, 'a').close()
        else:
            # 使用新的同步管理器
            gcs_sync = GCSDBSync(gcs_bucket_name, db_path)
            gcs_sync_manager = gcs_sync  # 設定全域變數
            if gcs_sync.initialize():
                # 啟動時下載資料庫
                gcs_sync.download_db()
                
                # 設定信號處理器來捕獲終止信號
                def signal_handler(signum, frame):
                    logging.info(f"接收到信號 {signum}，正在上傳資料庫...")
                    gcs_sync.upload_db()
                    sys.exit(0)
                
                # 註冊信號處理器 (Cloud Run 主要使用 SIGTERM)
                signal.signal(signal.SIGTERM, signal_handler)
                signal.signal(signal.SIGINT, signal_handler)
                
                # 註冊 atexit 作為備份
                atexit.register(lambda: gcs_sync.upload_db())
                
                # 啟動定期同步 (每 4 小時)
                gcs_sync.start_periodic_sync(interval_minutes=240)
                
                logging.info("GCS 資料庫同步設定完成 (包含定期同步)")
            else:
                logging.warning("GCS 同步初始化失敗，使用本地模式")
                if not os.path.exists(db_path):
                    open(db_path, 'a').close()
    else:
        # 非 Cloud Run 環境，確保本地資料庫文件存在
        if not os.path.exists(db_path):
            open(db_path, 'a').close()

    # Check if we should start both services or just the bot
    start_api = os.getenv('START_API', 'true').lower() == 'true'
    mode = os.getenv('BOT_MODE', 'polling').lower()
    
    # API server only runs as subprocess in polling mode
    # In webhook mode, API routes are integrated into the webhook server
    api_process = None
    if start_api and mode != 'webhook':
        api_process = start_api_server()
        if api_process:
            logging.info("API server started as subprocess")
            # Give API server time to start
            await asyncio.sleep(3)
        else:
            logging.warning("Failed to start API server, continuing with bot only")
    
    try:
        # Start bot
        if mode == 'webhook':
            logging.info(f"Starting bot in webhook mode (BOT_MODE={mode}) (API routes integrated)")
            await start_webhook()
        else:
            logging.info(f"Starting bot in polling mode (BOT_MODE={mode})")
            await start_polling()
    finally:
        # Clean up API process if it exists
        if api_process:
            logging.info("Terminating API server process")
            api_process.terminate()
            try:
                api_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                api_process.kill()

if __name__ == '__main__':
    asyncio.run(main())
