import sys
import os
import json
from fastapi import FastAPI, HTTPException, Depends, Query, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import logging
from typing import Optional

# Add the project root to the Python path to allow importing from 'app'
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Add the api directory to Python path for local imports
api_dir = os.path.dirname(__file__)
sys.path.insert(0, api_dir)

from schemas import (
    WordCreate, WordResponse, WordSimpleResponse, WordDetailResponse, WordsListResponse, 
    ReviewRequest, ReviewResponse, AIExplanationRequest, AIExplanationResponse, 
    StructuredAIResponse, DeepLearningAIResponse, StatsResponse, HealthResponse, ErrorResponse, UpdateNotesRequest,
    UserSettingsCreate, UserSettingsUpdate, UserSettingsResponse
)
from crud import (
    ensure_db_initialized, create_word, get_user_words, get_due_words, get_recent_words,
    get_next_review_word, update_review_result, get_user_stats, find_word_by_text, find_word_by_id,
    update_user_notes, delete_user_word, mark_user_word_as_learned, reset_user_word_learning_status, is_word_learned,
    get_user_settings_data, create_user_settings_data, update_user_settings_data, upsert_user_settings_data
)
from dependencies import get_database_path, get_ai_service, validate_user_access
from telegram_auth import get_user_from_telegram_header

# Uvicorn will handle the logging configuration. We just get the logger instance for our custom logs.
logger = logging.getLogger(__name__)

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
    
    # 驗證用戶訪問權限
    validated_user_id = validate_user_access(effective_user_id)
    
    logger.info(f"User authenticated: {validated_user_id} (telegram: {telegram_user_id is not None})")
    return validated_user_id

# FastAPI app instance
app = FastAPI(
    title="Vocab.ai API",
    description="API for the Vocab.ai vocabulary learning application",
    version="1.0.0",
    # 添加生產環境支援
    docs_url="/docs" if os.getenv("ENVIRONMENT", "development") == "development" else None,
    redoc_url="/redoc" if os.getenv("ENVIRONMENT", "development") == "development" else None,
)

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
        message="Vocab.ai API is running",
        timestamp=datetime.now()
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
        if not explanation:
            ai_service = get_ai_service()
            explanation = await ai_service.get_simple_explanation(word_data.word)
        
        success = await create_word(db_path, user_id, word_data.word.lower(), explanation, word_data.user_notes)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add word")
        
        return {"message": "Word added successfully", "word": word_data.word, "explanation": explanation}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding word: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to add word")

@app.get("/api/v1/words/{word_id}", response_model=WordDetailResponse)
async def get_word_by_id(word_id: int):
    """Get a specific word by ID."""
    db_path = get_database_path()
    
    try:
        word_data = await find_word_by_id(db_path, word_id)
        if not word_data:
            raise HTTPException(status_code=404, detail="Word not found")
        
        return WordDetailResponse(**dict(word_data))
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
            raw_explanation = await ai_service.get_simple_explanation(request.word)
        else:  # "deep"
            raw_explanation = await ai_service.get_deep_learning_explanation(request.word)
        
        structured_data = None
        try:
            is_deep = (request.explanation_type == "deep")
            structured_dict = ai_service.parse_structured_response(raw_explanation, is_deep_learning=is_deep)
            if is_deep:
                structured_data = DeepLearningAIResponse(**structured_dict)
            else:
                structured_data = StructuredAIResponse(**structured_dict)
        except Exception as parse_error:
            logger.warning(f"Failed to parse structured response: {parse_error}")
        
        return AIExplanationResponse(
            word=request.word,
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
async def update_word_notes(word_id: int, notes_data: UpdateNotesRequest):
    """Update user notes for a specific word."""
    logger.info(f"PUT /words/{word_id}/notes called - notes_data: {notes_data}")
    db_path = get_database_path()
    
    try:
        word_data = await find_word_by_id(db_path, word_id)
        if not word_data:
            raise HTTPException(status_code=404, detail="Word not found")
        
        success = await update_user_notes(db_path, word_id, notes_data.notes)
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
        
        if word_data['user_id'] != user_id:
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
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            return default_settings
            
        # Parse JSON strings back to objects
        parsed_settings = {
            "user_id": settings_data["user_id"],
            "learning_preferences": json.loads(settings_data["learning_preferences"]),
            "interface_settings": json.loads(settings_data["interface_settings"]),
            "ai_settings": json.loads(settings_data["ai_settings"]),
            "study_settings": json.loads(settings_data["study_settings"]),
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
            from bot.utils.event_manager import get_event_manager
            event_manager = get_event_manager()
            
            # 發布通用設定更新事件
            await event_manager.publish_user_settings_updated(user_id)
            
            # 檢查是否有提醒相關的設定變更
            learning_prefs = settings_data.learning_preferences.dict()
            if 'review_reminder_enabled' in learning_prefs or 'review_reminder_time' in learning_prefs:
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
            from bot.utils.event_manager import get_event_manager
            event_manager = get_event_manager()
            
            # 發布通用設定更新事件
            await event_manager.publish_user_settings_updated(user_id)
            
            # 檢查是否有提醒相關的設定變更
            if settings_data.learning_preferences:
                learning_prefs = settings_data.learning_preferences.dict()
                if 'review_reminder_enabled' in learning_prefs or 'review_reminder_time' in learning_prefs:
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

# Legacy endpoints for backward compatibility
@app.get("/api/v1/hello")
async def read_root():
    """Legacy hello endpoint."""
    return {"message": "Hello from Vocab.ai API!", "version": "1.0.0"}