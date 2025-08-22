import sys
import os
import json
from fastapi import FastAPI, HTTPException, Depends, Query, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import logging
from typing import Optional, List
import pytz

# Add the project root to the Python path to allow importing from 'app'
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Add the api directory to Python path for local imports
api_dir = os.path.dirname(__file__)
sys.path.insert(0, api_dir)

from schemas import (
    WordCreate, WordResponse, WordSimpleResponse, WordDetailResponse, WordsListResponse, 
    ReviewRequest, ReviewResponse, AIExplanationRequest, AIExplanationResponse, 
    StructuredAIResponse, DeepLearningAIResponse, SentenceAnalysisResponse, StatsResponse, HealthResponse, ErrorResponse, UpdateNotesRequest,
    UserSettingsCreate, UserSettingsUpdate, UserSettingsResponse,
    DailyDiscoveryResponse, DailyDiscoveryArticle, KnowledgePoint,
    BookmarkRequest, BookmarkResponse, BookmarkListResponse, BookmarkTag, CreateTagRequest, UpdateBookmarkNotesRequest,
    BookmarkSummary, BookmarkSummaryListResponse,
    WordCategory, WordCategoryCreate, WordCategoryListResponse, UpdateWordCategoryRequest, 
    CategoryStatsResponse, CategorySuggestionsResponse
)
from crud import (
    ensure_db_initialized, create_word, get_user_words, get_due_words, get_recent_words,
    get_next_review_word, update_review_result, get_user_stats, find_word_by_text, find_word_by_id,
    update_user_notes, delete_user_word, mark_user_word_as_learned, reset_user_word_learning_status, is_word_learned,
    get_user_settings_data, create_user_settings_data, update_user_settings_data, upsert_user_settings_data,
    get_daily_discovery_data, create_daily_discovery_data, cleanup_expired_daily_discovery_data,
    create_bookmark, delete_bookmark, get_bookmarks, get_user_bookmarks_summary, get_bookmark_detail,
    check_bookmark_exists, update_bookmark_personal_notes, create_tag, get_tags, add_tag_to_bookmark
)
from dependencies import get_database_path, get_ai_service, validate_user_access, get_whitelist_users, is_whitelist_enabled
# 控制是否在 API 進程中載入 Telegram 事件橋接（避免 Cloud Run 多次附掛 Router）
ENABLE_TELEGRAM_BRIDGE = os.getenv('ENABLE_TELEGRAM_BRIDGE', '0') == '1'
if ENABLE_TELEGRAM_BRIDGE:
    try:
        from bot.utils.event_manager import get_event_manager as _get_event_manager
    except Exception:
        _get_event_manager = None
else:
    _get_event_manager = None
from telegram_auth import get_user_from_telegram_header

# Uvicorn will handle the logging configuration. We just get the logger instance for our custom logs.
logger = logging.getLogger(__name__)

# 時區工具函數
def get_taipei_timezone():
    """獲取台北時區"""
    return pytz.timezone('Asia/Taipei')

def get_taipei_now():
    """獲取台北時區的當前時間"""
    return datetime.now(get_taipei_timezone())

def to_taipei_time(utc_datetime_str: str):
    """將 UTC 時間字符串轉換為台北時區"""
    utc_dt = datetime.fromisoformat(utc_datetime_str.replace('Z', '+00:00'))
    if utc_dt.tzinfo is None:
        utc_dt = pytz.UTC.localize(utc_dt)
    return utc_dt.astimezone(get_taipei_timezone())

def to_utc_time(taipei_datetime):
    """將台北時區時間轉換為 UTC"""
    if taipei_datetime.tzinfo is None:
        taipei_datetime = get_taipei_timezone().localize(taipei_datetime)
    return taipei_datetime.astimezone(pytz.UTC)

# 用戶身份驗證依賴函數
def get_current_user(
    authorization: Optional[str] = Header(None),
    user_id: Optional[int] = Query(None, description="User ID (for local testing)")
) -> int:
    """
    獲取當前用戶 ID，支援 Telegram Mini App 驗證和本地測試
    
    Args:
        authorization: HTTP Authorization 標頭 (格式: 'Bearer tma <telegram_data>')
        user_id: 查詢參數中的用戶 ID (僅用於本地測試)
        
    Returns:
        int: 驗證後的用戶 ID
    """
    # 嘗試從 Telegram 授權標頭獲取用戶 ID
    telegram_user_id = None
    try:
        telegram_user_id = get_user_from_telegram_header(authorization)
    except HTTPException as e:
        logger.warning(f"Telegram authentication failed: {e.detail}")
        # 如果 Telegram 驗證失敗，但有提供 user_id 查詢參數，繼續使用該參數
    
    # 優先使用 Telegram 驗證的用戶 ID
    effective_user_id = telegram_user_id if telegram_user_id is not None else user_id
    
    # 如果都沒有，且白名單未啟用，使用默認測試用戶
    if effective_user_id is None:
        if not is_whitelist_enabled():
            whitelist = get_whitelist_users()
            if whitelist:
                effective_user_id = whitelist[0]
                logger.info(f"Using default test user: {effective_user_id}")
    
    # 驗證用戶訪問權限
    validated_user_id = validate_user_access(effective_user_id)
    
    logger.info(f"User authenticated: {validated_user_id} (telegram: {telegram_user_id is not None})")
    return validated_user_id

# FastAPI app instance
app = FastAPI(
    title="MemWhiz API",
    description="API for the MemWhiz vocabulary learning application",
    version="1.0.0",
    # 添加生產環境支援
    docs_url="/docs" if os.getenv("ENVIRONMENT", "development") == "development" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT", "development") == "development" else None,
)

# Global event manager singleton to avoid re-attaching routers
EVENT_MANAGER = None

# CORS middleware - 強化設定以防止跨域和 Referrer Policy 錯誤
origins = [
    "*",  # Allow all origins for development; restrict in production
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=[
        "*",
        "Authorization",
        "Content-Type", 
        "X-Requested-With",
        "Accept",
        "Origin",
        "Access-Control-Request-Method",
        "Access-Control-Request-Headers",
        "Referrer-Policy",
        "Sec-Fetch-Site",
        "Sec-Fetch-Mode",
        "Sec-Fetch-Dest"
    ],
    expose_headers=["*"],
    max_age=3600,
)

# 添加中間件處理 Referrer Policy 和安全標頭
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """添加安全標頭以解決跨域和 Referrer Policy 問題"""
    response = await call_next(request)
    
    # 設定 Referrer Policy 允許跨域請求
    response.headers["Referrer-Policy"] = "no-referrer-when-downgrade"
    
    # 允許跨域嵌入（如果需要）
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    
    # 設定 Content Security Policy 允許跨域請求
    response.headers["Content-Security-Policy"] = (
        "default-src 'self' *; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' *; "
        "style-src 'self' 'unsafe-inline' *; "
        "img-src 'self' data: *; "
        "connect-src 'self' *; "
        "font-src 'self' *; "
        "object-src 'none'; "
        "media-src 'self' *; "
        "frame-src 'self' *;"
    )
    
    return response

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    db_path = get_database_path()
    await ensure_db_initialized(db_path)
    logger.info("Database initialized successfully")
    # Initialize event manager once to avoid attaching routers multiple times
    global EVENT_MANAGER
    if ENABLE_TELEGRAM_BRIDGE and _get_event_manager is not None and EVENT_MANAGER is None:
        try:
            EVENT_MANAGER = _get_event_manager()
            logger.info("Event manager initialized")
        except Exception as e:
            logger.warning(f"Failed to initialize event manager at startup: {e}")

# 添加全域錯誤處理器
@app.exception_handler(405)
async def method_not_allowed_handler(request: Request, exc):
    """處理 405 Method Not Allowed 錯誤"""
    logger.warning(f"405 Method Not Allowed: {request.method} {request.url.path}")
    return JSONResponse(
        status_code=405,
        content={
            "detail": f"Method {request.method} not allowed for {request.url.path}",
            "allowed_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        }
    )

# 添加通用 OPTIONS 處理器（備用方案）
@app.options("/{path:path}")
async def options_handler(path: str):
    """通用 OPTIONS 處理器，防止 405 錯誤"""
    return {"message": "OK"}

@app.get("/api/v1/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        message="MemWhiz API is running",
        timestamp=get_taipei_now()
    )

@app.get("/api/v1/words", response_model=WordsListResponse)
async def get_words(
    page: int = Query(0, ge=0, description="Page number (0-based)"),
    page_size: int = Query(10, ge=1, le=100, description="Number of words per page"),
    filter_type: str = Query("all", pattern=r"^(all|due|recent)$", description="Filter type: all, due, or recent"),
    user_id: int = Depends(get_current_user)
):
    """Get paginated words for a user."""
    logger.info(f"GET /words called - user_id: {user_id}, page: {page}, page_size: {page_size}, filter_type: {filter_type}")
    db_path = get_database_path()
    
    try:
        if filter_type == "due":
            words_data, total_count = await get_due_words(db_path, user_id, page, page_size)
        elif filter_type == "recent":
            words_data, total_count = await get_recent_words(db_path, user_id, page, page_size)
        else:  # "all"
            words_data, total_count = await get_user_words(db_path, user_id, page, page_size)
        
        words = []
        for word_data in words_data:
            word_dict = dict(word_data)
            # Add learned status based on spaced repetition parameters
            learned_status = is_word_learned(word_dict)  # Pass dict instead of Row object
            word_dict['learned'] = learned_status
            words.append(WordSimpleResponse(**word_dict))
        
        return WordsListResponse(
            words=words,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
    except Exception as e:
        logger.error(f"Error getting words: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve words")

@app.post("/api/v1/words", response_model=dict)
async def add_word(word_data: WordCreate, user_id: int = Depends(get_current_user)):
    """Add a new word to the user's vocabulary."""
    logger.info(f"POST /words called - user_id: {user_id}, word_data: {word_data}")
    db_path = get_database_path()
    
    try:
        existing_word = await find_word_by_text(db_path, user_id, word_data.word.lower())
        if existing_word:
            raise HTTPException(status_code=409, detail="Word already exists in your vocabulary")
        
        explanation = word_data.initial_ai_explanation
        category = word_data.category or "uncategorized"
        logger.info(f"Received category: {word_data.category}, using category: {category}")
        
        # Get AI explanation if not provided
        if not explanation:
            ai_service = get_ai_service()
            explanation = await ai_service.get_simple_explanation(word_data.word)
        
        # Get AI category suggestion if category is uncategorized
        suggested_category = None
        if category == "uncategorized":
            try:
                ai_service = get_ai_service()
                raw_suggestions = await ai_service.get_word_category_suggestions(word_data.word, explanation)
                suggestions_data = ai_service.parse_structured_response(raw_suggestions)
                if suggestions_data and 'auto_selected' in suggestions_data:
                    suggested_category = suggestions_data['auto_selected']
                    category = suggested_category
            except Exception as e:
                logger.warning(f"Failed to get category suggestion for {word_data.word}: {str(e)}")
        
        logger.info(f"Creating word with category: {category}")
        success = await create_word(db_path, user_id, word_data.word.lower(), explanation, word_data.user_notes, category)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add word")
        
        response = {
            "message": "Word added successfully", 
            "word": word_data.word, 
            "explanation": explanation,
            "category": category
        }
        if suggested_category:
            response["ai_suggested_category"] = suggested_category
            
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding word: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add word")

@app.get("/api/v1/words/{word_id}", response_model=WordDetailResponse)
async def get_word_by_id(word_id: int, user_id: int = Depends(get_current_user)):
    """Get a specific word by ID."""
    logger.info(f"GET /words/{word_id} called - user_id: {user_id}")
    db_path = get_database_path()
    
    try:
        word_data = await find_word_by_id(db_path, word_id)
        if not word_data:
            raise HTTPException(status_code=404, detail="Word not found")
        
        # 檢查用戶權限（強制整數型別比較避免型別差異導致誤判）
        word_dict = dict(word_data)
        row_user_id = int(word_dict.get('user_id')) if word_dict.get('user_id') is not None else None
        req_user_id = int(user_id) if user_id is not None else None
        if row_user_id != req_user_id:
            logger.warning(
                f"Ownership mismatch for word {word_id}: row_user_id={row_user_id}, request_user_id={req_user_id}"
            )
            raise HTTPException(status_code=403, detail="Access denied - word belongs to different user")
        
        # 添加 learned 狀態計算
        learned_status = is_word_learned(word_dict)
        word_dict['learned'] = learned_status
        
        logger.info(f"Successfully retrieved word {word_id} for user {user_id}, learned: {learned_status}")
        return WordDetailResponse(**word_dict)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting word {word_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve word")

@app.get("/api/v1/review/next", response_model=WordDetailResponse | dict)
async def get_next_review(user_id: int = Depends(get_current_user)):
    """Get the next word for review."""
    db_path = get_database_path()
    
    try:
        word_data = await get_next_review_word(db_path, user_id)
        if not word_data:
            return {"message": "No words due for review"}
        
        return WordDetailResponse(**dict(word_data))
    except Exception as e:
        logger.error(f"Error getting next review: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get next review")

@app.post("/api/v1/review/{word_id}", response_model=ReviewResponse)
async def submit_review(word_id: int, review_data: ReviewRequest, user_id: int = Depends(get_current_user)):
    """Submit a review result for a word."""
    db_path = get_database_path()
    
    try:
        result = await update_review_result(db_path, word_id, review_data.response, user_id)
        return ReviewResponse(**result)
    except Exception as e:
        logger.error(f"Error submitting review for word {word_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to submit review")

@app.post("/api/v1/ai/explain", response_model=AIExplanationResponse)
async def get_ai_explanation(request: AIExplanationRequest):
    """Get AI explanation for a word."""
    try:
        ai_service = get_ai_service()
        
        if request.explanation_type == "simple":
            raw_explanation = await ai_service.get_simple_explanation(request.text)
        elif request.explanation_type == "deep":
            raw_explanation = await ai_service.get_deep_learning_explanation(request.text)
        else:  # "sentence"
            raw_explanation = await ai_service.get_sentence_analysis(request.text)
        
        structured_data = None
        try:
            is_deep = (request.explanation_type == "deep")
            is_sentence = (request.explanation_type == "sentence")
            structured_dict = ai_service.parse_structured_response(raw_explanation, is_deep_learning=is_deep, is_sentence_analysis=is_sentence)
            
            if is_sentence:
                structured_data = SentenceAnalysisResponse(**structured_dict)
            elif is_deep:
                structured_data = DeepLearningAIResponse(**structured_dict)
            else:
                structured_data = StructuredAIResponse(**structured_dict)
        except Exception as parse_error:
            logger.warning(f"Failed to parse structured response: {parse_error}")
        
        return AIExplanationResponse(
            text=request.text,
            explanation=raw_explanation,
            explanation_type=request.explanation_type,
            structured_data=structured_data
        )
    except Exception as e:
        logger.error(f"Error getting AI explanation: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get AI explanation")

@app.get("/api/v1/stats", response_model=StatsResponse)
async def get_user_statistics(user_id: int = Depends(get_current_user)):
    """Get user learning statistics."""
    db_path = get_database_path()
    
    try:
        stats = await get_user_stats(db_path, user_id)
        return StatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error getting user stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")

@app.put("/api/v1/words/{word_id}/notes", response_model=dict)
async def update_word_notes(word_id: int, notes_data: UpdateNotesRequest, user_id: int = Depends(get_current_user)):
    """Update user notes for a specific word."""
    logger.info(f"PUT /words/{word_id}/notes called - user_id: {user_id}")
    db_path = get_database_path()
    
    try:
        word_data = await find_word_by_id(db_path, word_id)
        if not word_data:
            raise HTTPException(status_code=404, detail="Word not found")
        # Ensure the word belongs to the authenticated user
        row_user_id = int(word_data.get('user_id')) if word_data.get('user_id') is not None else None
        if row_user_id != int(user_id):
            raise HTTPException(status_code=403, detail="Access denied - word belongs to different user")
        
        success = await update_user_notes(db_path, word_id, user_id, notes_data.notes)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update notes")
        
        return {"message": "Notes updated successfully", "word_id": word_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating notes for word {word_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update notes")

@app.delete("/api/v1/words/{word_id}", response_model=dict)
async def delete_word(word_id: int, user_id: int = Depends(get_current_user)):
    """Delete a word from the user's vocabulary."""
    logger.info(f"DELETE /words/{word_id} called - user_id: {user_id}")
    db_path = get_database_path()
    
    try:
        word_data = await find_word_by_id(db_path, word_id)
        if not word_data:
            raise HTTPException(status_code=404, detail="Word not found")
        
        row_user_id = int(word_data.get('user_id')) if word_data.get('user_id') is not None else None
        if row_user_id != int(user_id):
            raise HTTPException(status_code=403, detail="Access denied - word belongs to different user")
        
        success = await delete_user_word(db_path, word_id, user_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete word")
        
        return {"message": "Word deleted successfully", "word_id": word_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting word {word_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete word")

@app.put("/api/v1/words/{word_id}/toggle-learned", response_model=dict)
async def toggle_word_learned(word_id: int, user_id: int = Depends(get_current_user)):
    """Toggle a word's learned status (mark as learned or reset to learning)."""
    logger.info(f"PUT /words/{word_id}/toggle-learned called - user_id: {user_id}")
    db_path = get_database_path()
    
    try:
        word_data = await find_word_by_id(db_path, word_id)
        if not word_data:
            raise HTTPException(status_code=404, detail="Word not found")
        
        if word_data['user_id'] != user_id:
            raise HTTPException(status_code=403, detail="Access denied - word belongs to different user")
        
        # Check current learned status
        word_dict = dict(word_data)
        is_currently_learned = is_word_learned(word_dict)
        
        if is_currently_learned:
            # Reset to learning status
            success = await reset_user_word_learning_status(db_path, word_id, user_id)
            message = "Word reset to learning status successfully"
            new_status = "learning"
        else:
            # Mark as learned
            success = await mark_user_word_as_learned(db_path, word_id, user_id)
            message = "Word marked as learned successfully"
            new_status = "learned"
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to toggle word status")
        
        return {"message": message, "word_id": word_id, "new_status": new_status}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling word {word_id} status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to toggle word status")

# Word Categories endpoints
@app.get("/api/v1/categories", response_model=WordCategoryListResponse)
async def get_user_categories(user_id: int = Depends(get_current_user)):
    """Get all categories for the user."""
    logger.info(f"GET /categories called - user_id: {user_id}")
    db_path = get_database_path()
    
    try:
        from bot.database.sqlite_db import get_user_categories, create_default_categories
        
        categories = await get_user_categories(db_path, user_id)
        if not categories:
            # Create default categories for new user
            await create_default_categories(db_path, user_id)
            categories = await get_user_categories(db_path, user_id)
        
        return WordCategoryListResponse(categories=categories)
    except Exception as e:
        logger.error(f"Error getting categories for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get categories")

@app.post("/api/v1/categories", response_model=dict)
async def create_category(category_data: WordCategoryCreate, user_id: int = Depends(get_current_user)):
    """Create a new custom category."""
    logger.info(f"POST /categories called - user_id: {user_id}, category: {category_data.category_name}")
    db_path = get_database_path()
    
    try:
        from bot.database.sqlite_db import create_user_category
        
        success = await create_user_category(db_path, user_id, category_data.category_name, category_data.color_code)
        if success:
            return {"message": "Category created successfully", "category_name": category_data.category_name}
        else:
            raise HTTPException(status_code=400, detail="Category already exists")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create category")

@app.put("/api/v1/words/{word_id}/category", response_model=dict)
async def update_word_category(word_id: int, category_data: UpdateWordCategoryRequest, user_id: int = Depends(get_current_user)):
    """Update a word's category."""
    logger.info(f"PUT /words/{word_id}/category called - user_id: {user_id}, category: {category_data.category}")
    db_path = get_database_path()
    
    try:
        from bot.database.sqlite_db import update_word_category
        
        success = await update_word_category(db_path, word_id, user_id, category_data.category)
        if success:
            return {"message": "Word category updated successfully", "word_id": word_id, "category": category_data.category}
        else:
            raise HTTPException(status_code=404, detail="Word not found or not owned by user")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating word category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update word category")

@app.get("/api/v1/words/by-category/{category}", response_model=WordsListResponse)
async def get_words_by_category(category: str, page: int = Query(0, ge=0), page_size: int = Query(20, ge=1, le=50), user_id: int = Depends(get_current_user)):
    """Get words filtered by category."""
    logger.info(f"GET /words/by-category/{category} called - user_id: {user_id}, page: {page}, page_size: {page_size}")
    db_path = get_database_path()
    
    try:
        from bot.database.sqlite_db import get_words_by_category
        
        words_data, total_count = await get_words_by_category(db_path, user_id, category, page, page_size)
        
        words = []
        for word_data in words_data:
            word_dict = dict(word_data)
            learned_status = is_word_learned(word_dict)
            word_dict['learned'] = learned_status
            words.append(WordSimpleResponse(**word_dict))
        
        return WordsListResponse(words=words, total_count=total_count, page=page, page_size=page_size)
    except Exception as e:
        logger.error(f"Error getting words by category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get words by category")

@app.get("/api/v1/categories/stats", response_model=CategoryStatsResponse)
async def get_category_stats(user_id: int = Depends(get_current_user)):
    """Get word count statistics by category."""
    logger.info(f"GET /categories/stats called - user_id: {user_id}")
    db_path = get_database_path()
    
    try:
        from bot.database.sqlite_db import get_category_stats
        
        stats = await get_category_stats(db_path, user_id)
        return CategoryStatsResponse(category_stats=stats)
    except Exception as e:
        logger.error(f"Error getting category stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get category stats")

@app.post("/api/v1/words/{word}/category-suggestions", response_model=CategorySuggestionsResponse)
async def get_word_category_suggestions(word: str, user_id: int = Depends(get_current_user)):
    """Get AI-powered category suggestions for a word."""
    logger.info(f"POST /words/{word}/category-suggestions called - user_id: {user_id}")
    
    try:
        ai_service = get_ai_service()
        
        # Get existing word data if available for better suggestions
        db_path = get_database_path()
        word_data = await find_word_by_text(db_path, user_id, word)
        ai_explanation = word_data.get('initial_ai_explanation', '') if word_data else ''
        
        # Get AI category suggestions
        raw_response = await ai_service.get_word_category_suggestions(word, ai_explanation)
        structured_data = ai_service.parse_structured_response(raw_response)
        
        return CategorySuggestionsResponse(**structured_data)
    except Exception as e:
        logger.error(f"Error getting category suggestions for {word}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get category suggestions")

# User Settings endpoints
@app.get("/api/v1/settings", response_model=UserSettingsResponse)
async def get_user_settings(user_id: int = Depends(get_current_user)):
    """Get user settings."""
    logger.info(f"GET /settings called - user_id: {user_id}")
    db_path = get_database_path()
    
    try:
        settings_data = await get_user_settings_data(db_path, user_id)
        if not settings_data:
            # Return default settings if none exist
            from schemas import LearningPreferences, InterfaceSettings, AISettings, StudySettings
            default_settings = UserSettingsResponse(
                user_id=user_id,
                learning_preferences=LearningPreferences(),
                interface_settings=InterfaceSettings(),
                ai_settings=AISettings(),
                study_settings=StudySettings(),
                created_at=get_taipei_now(),
                updated_at=get_taipei_now()
            )
            return default_settings
            
        # Settings data is already parsed in get_user_settings
        parsed_settings = {
            "user_id": settings_data["user_id"],
            "learning_preferences": settings_data["learning_preferences"],
            "interface_settings": settings_data["interface_settings"],
            "ai_settings": settings_data["ai_settings"],
            "study_settings": settings_data["study_settings"],
            "created_at": datetime.fromisoformat(settings_data["created_at"]),
            "updated_at": datetime.fromisoformat(settings_data["updated_at"])
        }
        
        return UserSettingsResponse(**parsed_settings)
    except Exception as e:
        logger.error(f"Error getting user settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user settings")

@app.post("/api/v1/settings", response_model=dict)
async def create_or_update_settings(
    settings_data: UserSettingsCreate,
    user_id: int = Depends(get_current_user)
):
    """Create or update user settings."""
    logger.info(f"POST /settings called - user_id: {user_id}")
    db_path = get_database_path()
    
    try:
        # Convert Pydantic models to JSON strings
        learning_preferences_json = json.dumps(settings_data.learning_preferences.dict())
        interface_settings_json = json.dumps(settings_data.interface_settings.dict())
        ai_settings_json = json.dumps(settings_data.ai_settings.dict())
        study_settings_json = json.dumps(settings_data.study_settings.dict())
        
        success = await upsert_user_settings_data(
            db_path, user_id,
            learning_preferences_json, interface_settings_json,
            ai_settings_json, study_settings_json
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save user settings")
        
        # 發布設定變更事件
        try:
            global EVENT_MANAGER
            event_manager = EVENT_MANAGER or (_get_event_manager() if _get_event_manager else None)
            
            # 發布通用設定更新事件
            if event_manager:
                await event_manager.publish_user_settings_updated(user_id)
            
            # 檢查是否有提醒相關的設定變更
            learning_prefs = settings_data.learning_preferences.dict()
            if 'review_reminder_enabled' in learning_prefs or 'review_reminder_time' in learning_prefs:
                if event_manager:
                    await event_manager.publish_reminder_settings_changed(
                        user_id=user_id,
                        reminder_enabled=learning_prefs.get('review_reminder_enabled', False),
                        reminder_time=learning_prefs.get('review_reminder_time', '09:00')
                    )
                    logger.info(f"🚀 API 發布提醒設定變更事件 - 用戶: {user_id}")
        except Exception as e:
            logger.warning(f"發布事件失敗: {e}")
        
        return {"message": "User settings saved successfully", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving user settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to save user settings")

@app.put("/api/v1/settings", response_model=dict)
async def update_settings(
    settings_data: UserSettingsUpdate,
    user_id: int = Depends(get_current_user)
):
    """Update specific user settings."""
    logger.info(f"PUT /settings called - user_id: {user_id}")
    db_path = get_database_path()
    
    try:
        # Convert provided settings to JSON strings
        learning_preferences_json = None
        if settings_data.learning_preferences:
            learning_preferences_json = json.dumps(settings_data.learning_preferences.dict())
            
        interface_settings_json = None
        if settings_data.interface_settings:
            interface_settings_json = json.dumps(settings_data.interface_settings.dict())
            
        ai_settings_json = None
        if settings_data.ai_settings:
            ai_settings_json = json.dumps(settings_data.ai_settings.dict())
            
        study_settings_json = None
        if settings_data.study_settings:
            study_settings_json = json.dumps(settings_data.study_settings.dict())
        
        # 確保用戶設定存在，如果不存在則創建預設設定
        existing_settings = await get_user_settings_data(db_path, user_id)
        if not existing_settings:
            # 創建預設設定
            from schemas import LearningPreferences, InterfaceSettings, AISettings, StudySettings
            default_learning = json.dumps(LearningPreferences().dict())
            default_interface = json.dumps(InterfaceSettings().dict())
            default_ai = json.dumps(AISettings().dict())
            default_study = json.dumps(StudySettings().dict())
            
            create_success = await create_user_settings_data(
                db_path, user_id,
                default_learning, default_interface,
                default_ai, default_study
            )
            if not create_success:
                raise HTTPException(status_code=500, detail="Failed to create user settings")
        
        # 使用 update 函數來只更新提供的欄位
        success = await update_user_settings_data(
            db_path, user_id,
            learning_preferences_json, interface_settings_json,
            ai_settings_json, study_settings_json
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update user settings")
        
        # 發布設定變更事件
        try:
            global EVENT_MANAGER
            event_manager = EVENT_MANAGER or (_get_event_manager() if _get_event_manager else None)
            
            # 發布通用設定更新事件
            if event_manager:
                await event_manager.publish_user_settings_updated(user_id)
            
            # 檢查是否有提醒相關的設定變更
            if settings_data.learning_preferences:
                learning_prefs = settings_data.learning_preferences.dict()
                if 'review_reminder_enabled' in learning_prefs or 'review_reminder_time' in learning_prefs:
                    if event_manager:
                        await event_manager.publish_reminder_settings_changed(
                            user_id=user_id,
                            reminder_enabled=learning_prefs.get('review_reminder_enabled', False),
                            reminder_time=learning_prefs.get('review_reminder_time', '09:00')
                        )
                        logger.info(f"🚀 API PUT 發布提醒設定變更事件 - 用戶: {user_id}")
        except Exception as e:
            logger.warning(f"發布事件失敗: {e}")
        
        return {"message": "User settings updated successfully", "user_id": user_id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user settings: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update user settings")

# Daily Discovery endpoints
@app.get("/api/v1/daily-discovery", response_model=DailyDiscoveryResponse)
async def get_daily_discovery(
    date_str: Optional[str] = Query(None, description="Date string in YYYY-MM-DD format, defaults to today"),
    content_type: Optional[str] = Query(None, description="Content type: 'article' or 'conversation', defaults to random"),
    user_id: int = Depends(get_current_user)
):
    """Get daily discovery content for specific date (defaults to today)."""
    logger.info(f"GET /daily-discovery called - user_id: {user_id}, date: {date_str}")
    db_path = get_database_path()
    
    # 自動清理過期內容
    try:
        await cleanup_expired_daily_discovery_data(db_path)
    except Exception as e:
        logger.warning(f"Failed to cleanup expired content: {e}")
    
    # 使用今天的日期如果沒有指定
    if not date_str:
        from datetime import date
        date_str = date.today().strftime('%Y-%m-%d')
    
    try:
        # 如果沒有指定內容類型，隨機選擇
        if not content_type:
            import random
            content_type = random.choice(['article', 'conversation'])
        
        # 檢查是否已有當天指定類型的內容（使用複合鍵）
        discovery_data = await get_daily_discovery_data(db_path, f"{date_str}_{content_type}")
        
        if not discovery_data:
            # 沒有內容則生成新的
            logger.info(f"生成 {date_str} 的每日探索內容 ({content_type})")
            ai_service = get_ai_service()
            
            if content_type == 'conversation':
                raw_content = await ai_service.generate_daily_conversation()
            else:
                raw_content = await ai_service.generate_daily_discovery()
            
            # 解析 AI 生成的內容
            try:
                parsed_content = ai_service.parse_structured_response(raw_content)
                
                if content_type == 'conversation':
                    conversation_data = parsed_content.get('conversation', {})
                    title = conversation_data.get('title', 'Daily Conversation')
                    content = f"Scenario: {conversation_data.get('scenario', '')}"
                else:
                    article_data = parsed_content.get('article', {})
                    title = article_data.get('title', 'Daily Discovery')
                    content = article_data.get('content', 'Content generation failed')
                
                # 添加內容類型到解析內容中
                parsed_content['content_type'] = content_type
                
                # 創建並保存新內容（使用複合鍵）
                success = await create_daily_discovery_data(
                    db_path, f"{date_str}_{content_type}", 
                    title,
                    content,
                    parsed_content
                )
                
                if success:
                    # 重新獲取剛創建的內容
                    discovery_data = await get_daily_discovery_data(db_path, f"{date_str}_{content_type}")
                else:
                    raise HTTPException(status_code=500, detail="Failed to save generated content")
                    
            except Exception as parse_error:
                logger.error(f"Failed to parse AI content: {parse_error}")
                raise HTTPException(status_code=500, detail="Failed to generate daily content")
        
        if not discovery_data:
            raise HTTPException(status_code=500, detail="Failed to retrieve daily discovery content")
            
        # 構建響應數據
        knowledge_points = []
        article_obj = None
        conversation_obj = None
        learning_objectives = []
        discussion_questions = []
        
        if 'knowledge_points' in discovery_data:
            raw_points = discovery_data['knowledge_points']
            if isinstance(raw_points, list):
                for point in raw_points:
                    if isinstance(point, dict):
                        knowledge_points.append(KnowledgePoint(**point))
            
            # 從原始資料中提取其他資訊
            if isinstance(raw_points, dict):
                if 'article' in raw_points:
                    article_info = raw_points['article']
                    article_obj = DailyDiscoveryArticle(**article_info)
                
                if 'conversation' in raw_points:
                    from schemas import DailyConversation, ConversationTurn
                    conversation_info = raw_points['conversation']
                    # 轉換對話資料
                    conversation_turns = []
                    for turn in conversation_info.get('conversation', []):
                        conversation_turns.append(ConversationTurn(**turn))
                    
                    conversation_obj = DailyConversation(
                        title=conversation_info.get('title', ''),
                        scenario=conversation_info.get('scenario', ''),
                        participants=conversation_info.get('participants', []),
                        conversation=conversation_turns,
                        difficulty_level=conversation_info.get('difficulty_level', '中級'),
                        scenario_category=conversation_info.get('scenario_category', '')
                    )
                
                if 'knowledge_points' in raw_points and isinstance(raw_points['knowledge_points'], list):
                    for point in raw_points['knowledge_points']:
                        if isinstance(point, dict):
                            knowledge_points.append(KnowledgePoint(**point))
                
                learning_objectives = raw_points.get('learning_objectives', [])
                discussion_questions = raw_points.get('discussion_questions', [])
        
        # 如果沒有解析到文章物件且內容類型是文章，使用資料庫中的基本資訊
        if not article_obj and content_type == 'article':
            article_obj = DailyDiscoveryArticle(
                title=discovery_data['article_title'],
                content=discovery_data['article_content'],
                word_count=len(discovery_data['article_content'].split()),
                difficulty_level="中級",
                topic_category="General"
            )
        
        # 解析時間戳
        from datetime import datetime
        created_at = to_taipei_time(discovery_data['created_at'])
        expires_at = to_taipei_time(discovery_data['expires_at'])
        
        # 從複合鍵中提取實際日期
        actual_date_str = discovery_data['content_date']
        if '_' in actual_date_str:
            actual_date_str = actual_date_str.split('_')[0]
        content_date = datetime.strptime(actual_date_str, '%Y-%m-%d').date()
        
        # 檢查用戶是否已收藏此內容
        db_path = get_database_path()
        is_bookmarked = await check_bookmark_exists(db_path, user_id, discovery_data['id'])
        
        return DailyDiscoveryResponse(
            id=discovery_data['id'],
            content_date=content_date,
            content_type=content_type,
            article=article_obj,
            conversation=conversation_obj,
            knowledge_points=knowledge_points,
            learning_objectives=learning_objectives,
            discussion_questions=discussion_questions,
            created_at=created_at,
            expires_at=expires_at,
            is_bookmarked=is_bookmarked,
            bookmark_stats={}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting daily discovery: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve daily discovery content")

# Bookmark endpoints
@app.post("/api/v1/bookmarks", response_model=dict)
async def create_bookmark_endpoint(
    bookmark_request: BookmarkRequest,
    user_id: int = Depends(get_current_user)
):
    """Create a new bookmark."""
    logger.info(f"POST /bookmarks called - user_id: {user_id}, discovery_id: {bookmark_request.discovery_id}")
    
    try:
        db_path = get_database_path()
        await ensure_db_initialized(db_path)
        
        # Check if bookmark already exists
        exists = await check_bookmark_exists(
            db_path, user_id, bookmark_request.discovery_id, 
            bookmark_request.bookmark_type, bookmark_request.knowledge_point_id
        )
        
        if exists:
            raise HTTPException(status_code=409, detail="Bookmark already exists")
        
        success = await create_bookmark(
            db_path, user_id, bookmark_request.discovery_id,
            bookmark_request.bookmark_type, bookmark_request.knowledge_point_id,
            bookmark_request.personal_notes
        )
        
        if success:
            return {"success": True, "message": "Bookmark created successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to create bookmark")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating bookmark: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create bookmark")

@app.delete("/api/v1/bookmarks/{discovery_id}")
async def delete_bookmark_endpoint(
    discovery_id: int,
    bookmark_type: str = Query(default="full", description="Bookmark type"),
    knowledge_point_id: Optional[str] = Query(None, description="Knowledge point ID"),
    user_id: int = Depends(get_current_user)
):
    """Delete a bookmark."""
    logger.info(f"DELETE /bookmarks/{discovery_id} called - user_id: {user_id}")
    
    try:
        db_path = get_database_path()
        await ensure_db_initialized(db_path)
        
        await delete_bookmark(db_path, user_id, discovery_id, bookmark_type, knowledge_point_id)
        return {"success": True, "message": "Bookmark deleted successfully"}
        
    except Exception as e:
        logger.error(f"Error deleting bookmark: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete bookmark")

@app.get("/api/v1/bookmarks", response_model=BookmarkSummaryListResponse)
async def get_bookmarks_endpoint(
    bookmark_type: Optional[str] = Query(None, description="Filter by bookmark type"),
    content_type: Optional[str] = Query(None, description="Filter by content type: article|conversation"),
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD (by content date)"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD (by content date)"),
    page: int = Query(default=0, ge=0, description="Page number"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    user_id: int = Depends(get_current_user)
):
    """Get user bookmarks summary (supports filtering and pagination)."""
    logger.info(
        f"GET /bookmarks called - user_id: {user_id}, bookmark_type: {bookmark_type}, content_type: {content_type}, start: {start_date}, end: {end_date}, page: {page}, size: {page_size}"
    )
    try:
        db_path = get_database_path()
        await ensure_db_initialized(db_path)

        # 先獲取第一頁以取得總數
        first_page, total_count = await get_user_bookmarks_summary(db_path, user_id, bookmark_type, 0, max(50, page_size))

        # 如果超過一頁，聚合所有頁再做篩選（避免過濾後計數不正確）
        all_rows = list(first_page)
        if total_count > len(first_page):
            pages = (total_count + max(50, page_size) - 1) // max(50, page_size)
            for p in range(1, pages):
                rows, _ = await get_user_bookmarks_summary(db_path, user_id, bookmark_type, p, max(50, page_size))
                all_rows.extend(rows)

        # 轉換為簡化結構並套用過濾
        def row_to_summary(row):
            created = to_taipei_time(row['created_at'])
            return BookmarkSummary(
                id=row['id'],
                discovery_id=row['discovery_id'],
                bookmark_type=row['bookmark_type'],
                knowledge_point_id=row['knowledge_point_id'],
                personal_notes=row['personal_notes'],
                created_at=created,
                content_date=row['content_date'],
                article_title=row['article_title'],
                content_type=row.get('content_type', 'article')
            )

        all_summaries = [row_to_summary(r) for r in all_rows]

        # 後端過濾（內容類型 + 日期）
        from datetime import datetime
        filtered = []
        for b in all_summaries:
            if content_type and b.content_type != content_type:
                continue
            if start_date:
                try:
                    if datetime.strptime(b.content_date, '%Y-%m-%d') < datetime.strptime(start_date, '%Y-%m-%d'):
                        continue
                except Exception:
                    pass
            if end_date:
                try:
                    # 包含當天
                    if datetime.strptime(b.content_date, '%Y-%m-%d') > datetime.strptime(end_date, '%Y-%m-%d'):
                        continue
                except Exception:
                    pass
            filtered.append(b)

        filtered_total = len(filtered)

        # 重新套用分頁
        start_idx = page * page_size
        end_idx = start_idx + page_size
        page_items = filtered[start_idx:end_idx]

        return BookmarkSummaryListResponse(
            bookmarks=page_items,
            total_count=filtered_total,
            page=page,
            page_size=page_size
        )

    except Exception as e:
        logger.error(f"Error getting bookmarks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve bookmarks")

@app.get("/api/v1/bookmarks/{bookmark_id}", response_model=BookmarkResponse)
async def get_bookmark_detail_endpoint(
    bookmark_id: int,
    user_id: int = Depends(get_current_user)
):
    """Get detailed bookmark content."""
    logger.info(f"GET /bookmarks/{bookmark_id} called - user_id: {user_id}")
    
    try:
        db_path = get_database_path()
        await ensure_db_initialized(db_path)
        
        bookmark_data = await get_bookmark_detail(db_path, bookmark_id, user_id)
        
        if not bookmark_data:
            raise HTTPException(status_code=404, detail="Bookmark not found")
        
        # 處理完整的discovery數據
        discovery_info = bookmark_data['discovery']
        
        # 解析完整的知識點和內容結構
        knowledge_points = []
        learning_objectives = []
        discussion_questions = []
        article_obj = None
        
        kp_data_raw = discovery_info['knowledge_points']
        
        # 解析完整的JSON結構
        import json
        if isinstance(kp_data_raw, str):
            try:
                parsed_content = json.loads(kp_data_raw)
            except (json.JSONDecodeError, TypeError):
                parsed_content = {}
        elif isinstance(kp_data_raw, dict):
            parsed_content = kp_data_raw
        else:
            parsed_content = {}
        
        # 提取知識點
        if 'knowledge_points' in parsed_content and isinstance(parsed_content['knowledge_points'], list):
            for point in parsed_content['knowledge_points']:
                if isinstance(point, dict):
                    knowledge_points.append(KnowledgePoint(**point))
        elif isinstance(parsed_content, list):
            # 如果直接是知識點列表
            for point in parsed_content:
                if isinstance(point, dict):
                    knowledge_points.append(KnowledgePoint(**point))
        
        # 提取文章詳細信息
        if 'article' in parsed_content:
            article_info = parsed_content['article']
            article_obj = DailyDiscoveryArticle(**article_info)
        
        # 如果沒有解析到文章對象，使用基本信息
        if not article_obj:
            article_obj = DailyDiscoveryArticle(
                title=discovery_info['article_title'],
                content=discovery_info['article_content'],
                word_count=len(discovery_info['article_content'].split()),
                difficulty_level="中級",
                topic_category="General"
            )
        
        # 提取學習目標
        if discovery_info.get('learning_objectives'):
            try:
                learning_objectives = json.loads(discovery_info['learning_objectives']) if isinstance(discovery_info['learning_objectives'], str) else discovery_info['learning_objectives']
            except (json.JSONDecodeError, TypeError):
                learning_objectives = []
        else:
            learning_objectives = parsed_content.get('learning_objectives', [])
        
        # 提取討論問題
        if discovery_info.get('discussion_questions'):
            try:
                discussion_questions = json.loads(discovery_info['discussion_questions']) if isinstance(discovery_info['discussion_questions'], str) else discovery_info['discussion_questions']
            except (json.JSONDecodeError, TypeError):
                discussion_questions = []
        else:
            discussion_questions = parsed_content.get('discussion_questions', [])
        
        # 解析時間和內容類型
        from datetime import datetime
        
        # 從複合鍵中提取實際日期和內容類型
        raw_date = discovery_info['content_date']
        if '_' in raw_date:
            actual_date_str, content_type = raw_date.split('_', 1)
        else:
            actual_date_str = raw_date
            # 從解析內容中檢測內容類型，而不是預設為文章
            if 'conversation' in parsed_content:
                content_type = 'conversation'
            else:
                content_type = 'article'
        
        content_date = datetime.strptime(actual_date_str, '%Y-%m-%d').date()
        bookmark_created_at = to_taipei_time(bookmark_data['created_at'])
        
        # 檢查是否為對話類型，並處理對話內容
        conversation_obj = None
        if content_type == 'conversation' and 'conversation' in parsed_content:
            from schemas import DailyConversation, ConversationTurn
            conversation_info = parsed_content['conversation']
            conversation_turns = []
            for turn in conversation_info.get('conversation', []):
                conversation_turns.append(ConversationTurn(**turn))
            
            conversation_obj = DailyConversation(
                title=conversation_info.get('title', ''),
                scenario=conversation_info.get('scenario', ''),
                participants=conversation_info.get('participants', []),
                conversation=conversation_turns,
                difficulty_level=conversation_info.get('difficulty_level', '中級'),
                scenario_category=conversation_info.get('scenario_category', '')
            )
            # 對話模式下不需要文章物件
            article_obj = None
        
        discovery_obj = DailyDiscoveryResponse(
            id=bookmark_data['discovery_id'],
            content_date=content_date,
            content_type=content_type,
            article=article_obj,
            conversation=conversation_obj,
            knowledge_points=knowledge_points,
            learning_objectives=learning_objectives,
            discussion_questions=discussion_questions,
            created_at=bookmark_created_at,
            expires_at=bookmark_created_at,
            is_bookmarked=True,
            bookmark_stats={}
        )
        
        bookmark = BookmarkResponse(
            id=bookmark_data['id'],
            discovery_id=bookmark_data['discovery_id'],
            bookmark_type=bookmark_data['bookmark_type'],
            knowledge_point_id=bookmark_data['knowledge_point_id'],
            personal_notes=bookmark_data['personal_notes'],
            created_at=bookmark_created_at,
            discovery=discovery_obj
        )
        
        return bookmark
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bookmark detail: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve bookmark detail")

@app.put("/api/v1/bookmarks/{bookmark_id}/notes")
async def update_bookmark_notes_endpoint(
    bookmark_id: int,
    notes_request: UpdateBookmarkNotesRequest,
    user_id: int = Depends(get_current_user)
):
    """Update bookmark personal notes."""
    logger.info(f"PUT /bookmarks/{bookmark_id}/notes called - user_id: {user_id}")
    
    try:
        db_path = get_database_path()
        await ensure_db_initialized(db_path)
        
        await update_bookmark_personal_notes(db_path, bookmark_id, user_id, notes_request.personal_notes)
        return {"success": True, "message": "Bookmark notes updated successfully"}
        
    except Exception as e:
        logger.error(f"Error updating bookmark notes: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update bookmark notes")

@app.get("/api/v1/bookmarks/tags", response_model=List[BookmarkTag])
async def get_bookmark_tags_endpoint(
    user_id: int = Depends(get_current_user)
):
    """Get user bookmark tags."""
    logger.info(f"GET /bookmarks/tags called - user_id: {user_id}")
    
    try:
        db_path = get_database_path()
        await ensure_db_initialized(db_path)
        
        tags_data = await get_tags(db_path, user_id)
        
        tags = []
        for tag_data in tags_data:
            from datetime import datetime
            created_at = to_taipei_time(tag_data['created_at'])
            tag = BookmarkTag(
                id=tag_data['id'],
                tag_name=tag_data['tag_name'],
                tag_color=tag_data['tag_color'],
                created_at=created_at
            )
            tags.append(tag)
        
        return tags
        
    except Exception as e:
        logger.error(f"Error getting bookmark tags: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to retrieve bookmark tags")

@app.post("/api/v1/bookmarks/tags", response_model=dict)
async def create_bookmark_tag_endpoint(
    tag_request: CreateTagRequest,
    user_id: int = Depends(get_current_user)
):
    """Create a new bookmark tag."""
    logger.info(f"POST /bookmarks/tags called - user_id: {user_id}, tag: {tag_request.tag_name}")
    
    try:
        db_path = get_database_path()
        await ensure_db_initialized(db_path)
        
        success = await create_tag(db_path, user_id, tag_request.tag_name, tag_request.tag_color)
        
        if success:
            return {"success": True, "message": "Tag created successfully"}
        else:
            raise HTTPException(status_code=409, detail="Tag already exists")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating bookmark tag: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create bookmark tag")

# Legacy endpoints for backward compatibility
@app.get("/api/v1/hello")
async def read_root():
    """Legacy hello endpoint."""
    return {"message": "Hello from MemWhiz API!", "version": "1.0.0"}
