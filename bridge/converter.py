from aiohttp import web
import logging
import inspect
from typing import Any, Optional, get_origin, get_args
from pydantic import BaseModel

try:
    # FastAPI Param base for Query/Path/Header/Body defaults
    from fastapi.params import Param as FastAPIParam  # type: ignore
except Exception:  # pragma: no cover - optional import
    FastAPIParam = None  # type: ignore


def make_converter(validate_user_access):
    """
    Factory to create the FastAPI→aiohttp converter.

    Where to implement bridging logic:
    - Add or adjust parameter mapping for new endpoints here.
    - Prefer generic signature-driven mapping; if a specific endpoint needs
      special handling (e.g., mixed query/path/body), add a small branch here.
    - Keep main.py slim; do NOT implement endpoint-specific logic in main.py.
    """

    async def convert_fastapi_to_aiohttp(fastapi_handler, request, **kwargs):
        try:
            # Extract params from request
            query_params = dict(request.query)
            path_params = dict(request.match_info)

            # Resolve body JSON if present
            body_data: dict[str, Any] = {}
            if request.method in ['POST', 'PUT', 'PATCH'] and request.can_read_body:
                try:
                    parsed = await request.json()
                    if isinstance(parsed, dict):
                        body_data = parsed
                except Exception:
                    body_data = {}

            # Resolve user id (auth is secondary; focus is auto param mapping)
            user_id_raw: Optional[Any] = query_params.get('user_id')
            try:
                auth_header = request.headers.get('Authorization')
                if auth_header:
                    from api.telegram_auth import get_user_from_telegram_header
                    telegram_uid = get_user_from_telegram_header(auth_header)
                    if telegram_uid is not None:
                        user_id_raw = telegram_uid
            except Exception:
                pass
            user_id = validate_user_access(user_id_raw)

            def cast_value(value: Any, annotation: Any) -> Any:
                if value is None or annotation is inspect._empty:
                    return value
                origin = get_origin(annotation)
                args = get_args(annotation)
                target = None
                # Optional[X]
                if origin is Optional:
                    target = args[0] if args else Any
                else:
                    target = annotation
                try:
                    if target in (int, float, str):
                        return target(value)
                    if target is bool:
                        if isinstance(value, str):
                            return value.lower() in ['1', 'true', 't', 'yes', 'y']
                        return bool(value)
                except Exception:
                    return value
                return value

            def _unwrap_fastapi_default(default_obj: Any) -> Any:
                """Unwrap FastAPI Param defaults (e.g., Query(...)) to primitive default values.

                If default is Ellipsis (required), return None to let handler use own logic.
                """
                try:
                    if FastAPIParam is not None and isinstance(default_obj, FastAPIParam):
                        inner = getattr(default_obj, 'default', None)
                        # FastAPI uses Ellipsis to denote required; map to None
                        if inner is Ellipsis:
                            return None
                        return inner
                except Exception:
                    pass
                return default_obj

            def build_kwargs(func):
                sig = inspect.signature(func)
                kwargs = {}
                for name, param in sig.parameters.items():
                    ann = param.annotation
                    # Inject resolved user_id when requested
                    if name == 'user_id':
                        kwargs[name] = user_id
                        continue
                    # Path params first
                    if name in path_params:
                        kwargs[name] = cast_value(path_params[name], ann)
                        continue
                    # Query params next
                    if name in query_params:
                        kwargs[name] = cast_value(query_params[name], ann)
                        continue
                    # Pydantic model from body
                    try:
                        if isinstance(ann, type) and issubclass(ann, BaseModel):
                            candidate = None
                            if name in body_data and isinstance(body_data[name], dict):
                                candidate = body_data[name]
                            else:
                                candidate = body_data
                            try:
                                kwargs[name] = ann(**candidate)
                                continue
                            except Exception:
                                pass
                    except Exception:
                        pass
                    # Plain body field
                    if name in body_data:
                        kwargs[name] = cast_value(body_data[name], ann)
                        continue
                    # Default value (handle FastAPI Param wrappers like Query(...))
                    if param.default is not inspect._empty:
                        kwargs[name] = _unwrap_fastapi_default(param.default)
                return kwargs

            call_kwargs = build_kwargs(fastapi_handler)
            result = await fastapi_handler(**call_kwargs)

            # Serialize Pydantic responses
            if hasattr(result, 'model_dump'):
                result = result.model_dump()
            elif hasattr(result, 'dict'):
                result = result.dict()

            # Handle datetime/date serialization
            import json
            from datetime import datetime, date

            def json_serializer(obj):
                if isinstance(obj, (datetime, date)):
                    return obj.isoformat()
                raise TypeError(f"Object of type {type(obj)} is not JSON serializable")

            return web.json_response(result, dumps=lambda obj: json.dumps(obj, default=json_serializer))

        except Exception as e:
            logging.exception("convert_fastapi_to_aiohttp failed")
            return web.json_response({'error': str(e)}, status=400)

    return convert_fastapi_to_aiohttp
