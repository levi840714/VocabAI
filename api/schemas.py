from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class WordBase(BaseModel):
    word: str = Field(..., min_length=1, max_length=100, description="The English word")
    initial_ai_explanation: Optional[str] = Field(None, description="AI-generated explanation")
    user_notes: Optional[str] = Field(None, description="User's personal notes")

class WordCreate(WordBase):
    pass

class WordResponse(WordBase):
    id: int
    user_id: Optional[int] = None
    next_review: Optional[str] = None
    interval: Optional[int] = None
    difficulty: Optional[int] = None
    created_at: Optional[str] = None

class WordSimpleResponse(BaseModel):
    id: int
    word: str
    initial_ai_explanation: Optional[str] = None
    user_notes: Optional[str] = None
    learned: Optional[bool] = False

class WordDetailResponse(BaseModel):
    id: int
    user_id: int
    word: str
    initial_ai_explanation: Optional[str] = None
    user_notes: Optional[str] = None
    next_review: str
    interval: int
    difficulty: int
    created_at: str

class WordsListResponse(BaseModel):
    words: List[WordSimpleResponse]
    total_count: int
    page: int
    page_size: int

class ReviewRequest(BaseModel):
    response: str = Field(..., pattern=r"^(easy|hard|again|mastered)$", description="User response: easy, hard, again, or mastered")

class ReviewResponse(BaseModel):
    success: bool
    message: str
    next_review_date: Optional[str] = None

class AIExplanationRequest(BaseModel):
    word: str = Field(..., min_length=1, max_length=100)
    explanation_type: str = Field(..., pattern=r"^(simple|deep)$", description="Type of explanation: simple or deep")

# Structured AI Response Models
class WordMeaning(BaseModel):
    definition: str = Field(..., description="中文定義")
    context: Optional[str] = Field(None, description="使用語境")

class WordDefinition(BaseModel):
    part_of_speech: str = Field(..., description="詞性")
    meanings: List[WordMeaning] = Field(..., description="該詞性下的多個意思")

class StructuredAIResponse(BaseModel):
    word: str = Field(..., description="英文單字")
    pronunciations: List[str] = Field(default=[], description="音標列表")
    definitions: List[WordDefinition] = Field(..., description="按詞性分組的定義")
    examples: List[str] = Field(default=[], description="例句列表")
    synonyms: List[str] = Field(default=[], description="同義詞")
    antonyms: List[str] = Field(default=[], description="反義詞")
    memory_tips: Optional[str] = Field(None, description="記憶技巧")
    
    @classmethod
    def model_validate(cls, obj):
        # Clean null values from lists before validation
        if isinstance(obj, dict):
            if 'pronunciations' in obj and isinstance(obj['pronunciations'], list):
                obj['pronunciations'] = [p for p in obj['pronunciations'] if p is not None]
            if 'examples' in obj and isinstance(obj['examples'], list):
                obj['examples'] = [e for e in obj['examples'] if e is not None]
            if 'synonyms' in obj and isinstance(obj['synonyms'], list):
                obj['synonyms'] = [s for s in obj['synonyms'] if s is not None]
            if 'antonyms' in obj and isinstance(obj['antonyms'], list):
                obj['antonyms'] = [a for a in obj['antonyms'] if a is not None]
        return super().model_validate(obj)

class AIExplanationResponse(BaseModel):
    word: str
    explanation: str
    explanation_type: str
    structured_data: Optional[StructuredAIResponse] = Field(None, description="結構化數據")

class StatsResponse(BaseModel):
    total_words: int
    due_today: int
    reviewed_today: int
    difficulty_distribution: Dict[int, int]

class HealthResponse(BaseModel):
    status: str
    message: str
    timestamp: datetime

class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None

class UpdateNotesRequest(BaseModel):
    notes: Optional[str] = Field(None, description="User's personal notes for the word")