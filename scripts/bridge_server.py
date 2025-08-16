import asyncio
import logging
import os
import sys
from aiohttp import web


async def create_app() -> web.Application:
    """Create an aiohttp app and mount API routes via the bridge.

    This simulates Cloud Run webhook “bridge mode” locally without starting the bot
    or calling Telegram. It only exposes the bridged API endpoints.
    """
    # Ensure project root is on sys.path so we can import main.py
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    # Import the route setup function from the project entry (main.py)
    from main import setup_api_routes

    app = web.Application()
    await setup_api_routes(app)
    return app


def main():
    logging.basicConfig(level=logging.INFO)
    port = int(os.getenv("PORT", "8080"))
    host = os.getenv("HOST", "0.0.0.0")
    logging.info(f"Starting bridge-mode API on http://{host}:{port}")
    logging.info("Press Ctrl+C to stop.")

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    app = loop.run_until_complete(create_app())
    web.run_app(app, host=host, port=port)


if __name__ == "__main__":
    main()
