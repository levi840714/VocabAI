import asyncio
import logging
import yaml
import os
import sys
from aiohttp import web
import subprocess
import uvicorn
from threading import Thread

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.webhook.aiohttp_server import SimpleRequestHandler, setup_application


from config_loader import load_config
from aiohttp import web
import json

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
            db_path = config.get('database', {}).get('db_path', 'vocabot.db')
            
            # Get words (returns tuple of words list and total count)
            words, total_count = await get_user_words(db_path, user_id)
            
            return web.json_response([{
                'id': word['id'],
                'word': word['word'],
                'definition': word['definition'],
                'example': word['example'],
                'created_at': word['created_at'],
                'last_reviewed': word['last_reviewed'],
                'review_count': word['review_count'],
                'difficulty': word['difficulty'],
                'next_review': word['next_review']
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
            db_path = config.get('database', {}).get('db_path', 'vocabot.db')
            
            # Get stats
            stats = await get_user_stats(db_path, user_id)
            
            return web.json_response(stats)
            
        except Exception as e:
            return web.json_response({'error': str(e)}, status=400)
    
    async def health_handler(request):
        return web.json_response({'status': 'healthy', 'service': 'vocabot-api'})
    
    # Add CORS middleware
    @web.middleware
    async def cors_middleware(request, handler):
        if request.method == "OPTIONS":
            response = web.Response()
        else:
            response = await handler(request)
        
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        return response
    
    # Add OPTIONS handler for CORS preflight
    async def options_handler(request):
        return web.Response()
    
    # Add routes
    app.router.add_get('/api/v1/words', get_words_handler)
    app.router.add_get('/api/v1/stats', get_stats_handler)
    app.router.add_get('/api/v1/health', health_handler)
    app.router.add_options('/api/{path:.*}', options_handler)
    
    # Add CORS middleware
    app.middlewares.append(cors_middleware)

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

    # Register handlers
    from bot.handlers import common, word_handler, vocabulary_handler, review_handler
    dp.include_router(common.router)
    dp.include_router(vocabulary_handler.router)
    dp.include_router(review_handler.router)
    dp.include_router(word_handler.router)

    # Pass services and config to all handlers
    dp['ai_service'] = ai_service
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
    await bot.set_webhook(url=webhook_url)
    
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
    
    # Check if we should start both services or just the bot
    start_api = os.getenv('START_API', 'true').lower() == 'true'
    mode = os.getenv('BOT_MODE', 'polling')  # 'webhook' or 'polling', default to polling for development
    
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
            logging.info("Starting bot in webhook mode (API routes integrated)")
            await start_webhook()
        else:
            logging.info("Starting bot in polling mode")
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
