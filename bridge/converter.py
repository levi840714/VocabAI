from aiohttp import web
import logging


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
            # Extract query parameters and validate user
            query_params = dict(request.query)
            user_id = validate_user_access(query_params.get('user_id'))

            result = None
            # GET requests
            if request.method == 'GET':
                # Common path-param pattern
                if 'word_id' in request.match_info:
                    result = await fastapi_handler(word_id=int(request.match_info['word_id']), user_id=user_id)
                # Shorthand single-param endpoints
                elif request.path.endswith('/next') or request.path.endswith('/stats') or request.path.endswith('/settings'):
                    result = await fastapi_handler(user_id=user_id)
                # Daily discovery with optional filters
                elif request.path.endswith('/daily-discovery'):
                    date_str = query_params.get('date_str')
                    content_type = query_params.get('content_type')
                    result = await fastapi_handler(date_str=date_str, content_type=content_type, user_id=user_id)
                # Bookmarks collection
                elif request.path.endswith('/bookmarks') and 'bookmark_id' not in request.match_info:
                    page = int(query_params.get('page', 0))
                    page_size = int(query_params.get('page_size', 20))
                    bookmark_type = query_params.get('bookmark_type')
                    result = await fastapi_handler(bookmark_type=bookmark_type, page=page, page_size=page_size, user_id=user_id)
                # Bookmark detail
                elif '/bookmarks/' in request.path and 'bookmark_id' in request.match_info and not request.path.endswith('/notes'):
                    result = await fastapi_handler(bookmark_id=int(request.match_info['bookmark_id']), user_id=user_id)
                # Bookmark tags
                elif request.path.endswith('/bookmarks/tags'):
                    result = await fastapi_handler(user_id=user_id)
                # Words list
                elif 'words' in request.path:
                    page = int(query_params.get('page', 0))
                    page_size = int(query_params.get('page_size', 10))
                    filter_type = query_params.get('filter_type', 'all')
                    result = await fastapi_handler(page=page, page_size=page_size, filter_type=filter_type, user_id=user_id)
                else:
                    # Fallback: call without params
                    result = await fastapi_handler()

            # POST/PUT/DELETE
            elif request.method in ['POST', 'PUT', 'DELETE']:
                if request.method == 'DELETE':
                    # Words delete
                    if 'word_id' in request.match_info:
                        word_id = int(request.match_info['word_id'])
                        result = await fastapi_handler(word_id=word_id, user_id=user_id)
                    # Bookmarks delete
                    elif 'discovery_id' in request.match_info:
                        discovery_id = int(request.match_info['discovery_id'])
                        bookmark_type = query_params.get('bookmark_type', 'full')
                        knowledge_point_id = query_params.get('knowledge_point_id')
                        result = await fastapi_handler(discovery_id=discovery_id, bookmark_type=bookmark_type, knowledge_point_id=knowledge_point_id, user_id=user_id)
                else:
                    data = await request.json() if request.can_read_body else {}
                    # Word-specific
                    if 'word_id' in request.match_info:
                        word_id = int(request.match_info['word_id'])
                        if 'notes' in request.path:
                            from api.schemas import UpdateNotesRequest
                            notes_data = UpdateNotesRequest(**data)
                            result = await fastapi_handler(word_id=word_id, notes_data=notes_data)
                        elif 'toggle-learned' in request.path:
                            result = await fastapi_handler(word_id=word_id, user_id=user_id)
                        elif 'review' in request.path:
                            from api.schemas import ReviewRequest
                            review_data = ReviewRequest(**data)
                            result = await fastapi_handler(word_id=word_id, review_data=review_data)
                    # Bookmark notes update
                    elif 'bookmark_id' in request.match_info and request.method == 'PUT' and request.path.endswith('/notes'):
                        from api.schemas import UpdateBookmarkNotesRequest
                        notes_request = UpdateBookmarkNotesRequest(**data)
                        bookmark_id = int(request.match_info['bookmark_id'])
                        result = await fastapi_handler(bookmark_id=bookmark_id, notes_request=notes_request, user_id=user_id)
                    # Bookmarks create
                    elif request.path.endswith('/bookmarks') and request.method == 'POST':
                        from api.schemas import BookmarkRequest
                        bookmark_request = BookmarkRequest(**data)
                        result = await fastapi_handler(bookmark_request=bookmark_request, user_id=user_id)
                    # Tags create
                    elif request.path.endswith('/bookmarks/tags') and request.method == 'POST':
                        from api.schemas import CreateTagRequest
                        tag_request = CreateTagRequest(**data)
                        result = await fastapi_handler(tag_request=tag_request, user_id=user_id)
                    # Words create
                    elif 'words' in request.path:
                        from api.schemas import WordCreate
                        word_data = WordCreate(**data)
                        result = await fastapi_handler(word_data=word_data, user_id=user_id)
                    # AI explain
                    elif 'ai/explain' in request.path:
                        from api.schemas import AIExplanationRequest
                        ai_request = AIExplanationRequest(**data)
                        result = await fastapi_handler(request=ai_request)
                    # Settings
                    elif 'settings' in request.path:
                        if request.method == 'POST':
                            from api.schemas import UserSettingsCreate
                            settings_data = UserSettingsCreate(**data)
                            result = await fastapi_handler(settings_data=settings_data, user_id=user_id)
                        elif request.method == 'PUT':
                            from api.schemas import UserSettingsUpdate
                            settings_data = UserSettingsUpdate(**data)
                            result = await fastapi_handler(settings_data=settings_data, user_id=user_id)

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

