from aiohttp import web
import logging


async def auto_register_fastapi_routes(app: web.Application, convert_fastapi_to_aiohttp):
    """
    Auto-register FastAPI routes onto aiohttp using the provided converter.

    Where to register routes:
    - This module centralizes all FastAPI→aiohttp route registrations.
    - Do NOT add route registrations in main.py — keep it slim and call this.
    - If some routes need explicit handling, add small wrappers here or in
      bridge/aiohttp_bridge.py (feature-specific) and import them from main.
    """
    try:
        from fastapi.routing import APIRoute
        from api.main import app as fastapi_app
    except Exception as e:
        logging.warning(f"Failed to import FastAPI app for auto-registration: {e}")
        return

    # Build a set of existing (method, path) to avoid duplicates
    existing = set()
    for resource in app.router.resources():
        try:
            path = resource.canonical
        except Exception:
            continue
        for route in resource:
            method = getattr(route, 'method', None)
            if method and path:
                existing.add((method.upper(), path))

    def make_wrapper(func):
        async def wrapper(request, _func=func):
            return await convert_fastapi_to_aiohttp(_func, request)
        return wrapper

    added = 0
    for r in fastapi_app.routes:
        if not isinstance(r, APIRoute):
            continue
        path = r.path
        if path.startswith('/docs') or path.startswith('/openapi') or path.startswith('/redoc'):
            continue
        for m in (r.methods or set()):
            method = m.upper()
            if method in {'OPTIONS', 'HEAD'}:
                continue
            key = (method, path)
            if key in existing:
                continue
            wrapper = make_wrapper(r.endpoint)
            if method == 'GET':
                app.router.add_get(path, wrapper)
            elif method == 'POST':
                app.router.add_post(path, wrapper)
            elif method == 'PUT':
                app.router.add_put(path, wrapper)
            elif method == 'DELETE':
                app.router.add_delete(path, wrapper)
            elif method == 'PATCH':
                app.router.add_patch(path, wrapper)
            added += 1
            existing.add(key)

    if added:
        logging.info(f"Auto-registered {added} FastAPI routes onto aiohttp")

