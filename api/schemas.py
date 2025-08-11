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
    formality: Optional[str] = Field(None, description="正式程度")
    usage_notes: Optional[str] = Field(None, description="用法提醒")

class WordDefinition(BaseModel):
    part_of_speech: str = Field(..., description="詞性")
    meanings: List[WordMeaning] = Field(..., description="該詞性下的多個意思")

class Etymology(BaseModel):
    origin: str = Field(..., description="詞彙來源和歷史背景")
    root_analysis: str = Field(..., description="字根、字首、字尾分析")
    related_words: List[str] = Field(default=[], description="相關詞彙")

class Collocations(BaseModel):
    common_phrases: List[str] = Field(default=[], description="常見片語")
    verb_combinations: List[str] = Field(default=[], description="動詞搭配")
    adjective_combinations: List[str] = Field(default=[], description="形容詞搭配")
    preposition_combinations: List[str] = Field(default=[], description="介詞搭配")

class ExampleSentence(BaseModel):
    sentence: str = Field(..., description="例句")
    translation: str = Field(..., description="中文翻譯")
    context: str = Field(..., description="使用情境說明")

class EnhancedSynonym(BaseModel):
    word: str = Field(..., description="同義詞")
    difference: str = Field(..., description="與原詞的細微差別")

class MemoryStrategies(BaseModel):
    visual: str = Field(..., description="視覺化記憶方法")
    association: str = Field(..., description="聯想記憶技巧")
    word_formation: str = Field(..., description="詞彙構成記憶法")
    story: str = Field(..., description="故事記憶法")

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

class DeepLearningAIResponse(BaseModel):
    word: str = Field(..., description="英文單字")
    pronunciations: List[str] = Field(default=[], description="音標列表")
    etymology: Etymology = Field(..., description="詞源分析")
    definitions: List[WordDefinition] = Field(..., description="按詞性分組的定義")
    collocations: Collocations = Field(..., description="搭配用法")
    examples: List[ExampleSentence] = Field(..., description="情境例句")
    synonyms: List[EnhancedSynonym] = Field(default=[], description="同義詞比較")
    antonyms: List[str] = Field(default=[], description="反義詞")
    memory_strategies: MemoryStrategies = Field(..., description="記憶策略")
    cultural_notes: str = Field(..., description="文化背景和使用注意事項")
    difficulty_level: str = Field(..., description="難度級別")
    frequency: str = Field(..., description="使用頻率")
    
    @classmethod
    def model_validate(cls, obj):
        # Clean null values from lists before validation
        if isinstance(obj, dict):
            if 'pronunciations' in obj and isinstance(obj['pronunciations'], list):
                obj['pronunciations'] = [p for p in obj['pronunciations'] if p is not None]
            if 'antonyms' in obj and isinstance(obj['antonyms'], list):
                obj['antonyms'] = [a for a in obj['antonyms'] if a is not None]
            # Handle nested lists
            if 'etymology' in obj and isinstance(obj['etymology'], dict):
                if 'related_words' in obj['etymology'] and isinstance(obj['etymology']['related_words'], list):
                    obj['etymology']['related_words'] = [w for w in obj['etymology']['related_words'] if w is not None]
            if 'collocations' in obj and isinstance(obj['collocations'], dict):
                for key in ['common_phrases', 'verb_combinations', 'adjective_combinations', 'preposition_combinations']:
                    if key in obj['collocations'] and isinstance(obj['collocations'][key], list):
                        obj['collocations'][key] = [item for item in obj['collocations'][key] if item is not None]
        return super().model_validate(obj)

class AIExplanationResponse(BaseModel):
    word: str
    explanation: str
    explanation_type: str
    structured_data: Optional[StructuredAIResponse | DeepLearningAIResponse] = Field(None, description="結構化數據")

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