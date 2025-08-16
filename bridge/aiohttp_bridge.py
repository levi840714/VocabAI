from aiohttp import web
from typing import Callable


def _route_exists(app: web.Application, method: str, path: str) -> bool:
    method = method.upper()
    try:
        for resource in app.router.resources():
            try:
                if resource.canonical != path:
                    continue
            except Exception:
                continue
            for route in resource:
                if getattr(route, 'method', '').upper() == method:
                    return True
    except Exception:
        pass
    return False


def _add_route_if_absent(app: web.Application, method: str, path: str, handler: Callable) -> None:
    if _route_exists(app, method, path):
        return
    if method == 'GET':
        app.router.add_get(path, handler)
    elif method == 'POST':
        app.router.add_post(path, handler)
    elif method == 'PUT':
        app.router.add_put(path, handler)
    elif method == 'DELETE':
        app.router.add_delete(path, handler)
    elif method == 'PATCH':
        app.router.add_patch(path, handler)


async def register_bookmark_routes(app: web.Application, convert_fastapi_to_aiohttp):
    """Register missing bookmark-related routes using provided converter.

    The converter should be a callable: (fastapi_handler, request) -> aiohttp response
    It is provided by main.setup_api_routes so it can capture validate_user_access, etc.
    """
    # Import FastAPI handlers (single source of truth)
    from api.main import (
        create_bookmark_endpoint,
        delete_bookmark_endpoint,
        get_bookmarks_endpoint,
        get_bookmark_detail_endpoint,
        update_bookmark_notes_endpoint,
        get_bookmark_tags_endpoint,
        create_bookmark_tag_endpoint,
        read_root,
    )

    # Helper to make wrapper bound to specific handler
    def wrap(handler):
        async def _wrapper(request):
            return await convert_fastapi_to_aiohttp(handler, request)
        return _wrapper

    # Register routes if not present
    _add_route_if_absent(app, 'POST', '/api/v1/bookmarks', wrap(create_bookmark_endpoint))
    _add_route_if_absent(app, 'DELETE', '/api/v1/bookmarks/{discovery_id}', wrap(delete_bookmark_endpoint))
    _add_route_if_absent(app, 'GET', '/api/v1/bookmarks', wrap(get_bookmarks_endpoint))
    _add_route_if_absent(app, 'GET', '/api/v1/bookmarks/{bookmark_id}', wrap(get_bookmark_detail_endpoint))
    _add_route_if_absent(app, 'PUT', '/api/v1/bookmarks/{bookmark_id}/notes', wrap(update_bookmark_notes_endpoint))
    _add_route_if_absent(app, 'GET', '/api/v1/bookmarks/tags', wrap(get_bookmark_tags_endpoint))
    _add_route_if_absent(app, 'POST', '/api/v1/bookmarks/tags', wrap(create_bookmark_tag_endpoint))
    # Legacy hello endpoint
    _add_route_if_absent(app, 'GET', '/api/v1/hello', wrap(read_root))

