from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime, date

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
    learned: Optional[bool] = False

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
    text: str = Field(..., min_length=1, max_length=500, description="English word or sentence to analyze")
    explanation_type: str = Field(..., pattern=r"^(simple|deep|sentence)$", description="Type of explanation: simple, deep, or sentence")

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
    root_analysis: Union[str, Dict[str, str]] = Field(..., description="字根、字首、字尾分析")
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

# User Settings Models
class LearningPreferences(BaseModel):
    daily_review_target: int = Field(default=20, ge=1, le=100, description="每日複習目標數量")
    difficulty_preference: str = Field(default="mixed", pattern=r"^(easy|normal|hard|mixed)$", description="難度偏好")
    review_reminder_enabled: bool = Field(default=True, description="是否開啟複習提醒")
    review_reminder_time: str = Field(default="09:00", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$", description="複習提醒時間")

class InterfaceSettings(BaseModel):
    voice_auto_play: bool = Field(default=False, description="語音自動播放")
    theme_mode: str = Field(default="light", pattern=r"^(light|dark|auto)$", description="主題模式")
    language: str = Field(default="zh-TW", description="介面語言")
    animation_enabled: bool = Field(default=True, description="動畫效果")

class AISettings(BaseModel):
    default_explanation_type: str = Field(default="simple", pattern=r"^(simple|deep)$", description="預設AI解釋類型")
    ai_provider_preference: str = Field(default="google", description="AI服務提供商偏好")
    explanation_detail_level: str = Field(default="standard", pattern=r"^(concise|standard|detailed)$", description="解釋詳細程度")

class StudySettings(BaseModel):
    spaced_repetition_algorithm: str = Field(default="sm2", description="間隔重複算法")
    show_pronunciation: bool = Field(default=True, description="顯示音標")
    show_etymology: bool = Field(default=True, description="顯示詞源")
    auto_mark_learned_threshold: int = Field(default=5, ge=3, le=10, description="自動標記為已學會的閾值")

class UserSettings(BaseModel):
    user_id: int
    learning_preferences: LearningPreferences
    interface_settings: InterfaceSettings
    ai_settings: AISettings
    study_settings: StudySettings
    created_at: datetime
    updated_at: datetime

class UserSettingsCreate(BaseModel):
    learning_preferences: Optional[LearningPreferences] = Field(default_factory=LearningPreferences)
    interface_settings: Optional[InterfaceSettings] = Field(default_factory=InterfaceSettings)
    ai_settings: Optional[AISettings] = Field(default_factory=AISettings)
    study_settings: Optional[StudySettings] = Field(default_factory=StudySettings)

class UserSettingsUpdate(BaseModel):
    learning_preferences: Optional[LearningPreferences] = None
    interface_settings: Optional[InterfaceSettings] = None
    ai_settings: Optional[AISettings] = None
    study_settings: Optional[StudySettings] = None

class UserSettingsResponse(BaseModel):
    user_id: int
    learning_preferences: LearningPreferences
    interface_settings: InterfaceSettings
    ai_settings: AISettings
    study_settings: StudySettings
    created_at: datetime
    updated_at: datetime

# Daily Discovery Models
class KnowledgePoint(BaseModel):
    id: str = Field(..., description="知識點ID")
    type: str = Field(..., description="知識點類型 (vocabulary/grammar/cultural/expression)")
    title: str = Field(..., description="知識點標題")
    content: str = Field(..., description="知識點內容")
    examples: List[str] = Field(default=[], description="例句或相關資訊")
    difficulty: str = Field(default="中級", description="難度等級")

# Daily Discovery Content Models
class DailyDiscoveryArticle(BaseModel):
    title: str = Field(..., description="文章標題")
    content: str = Field(..., description="文章內容")
    word_count: int = Field(..., description="文章字數")
    difficulty_level: str = Field(default="中級", description="難度等級")
    topic_category: str = Field(..., description="主題類別")

class ConversationTurn(BaseModel):
    speaker: str = Field(..., description="說話者（如：A, B, Waiter, Customer等）")
    text: str = Field(..., description="對話內容")
    translation: str = Field(..., description="中文翻譯")
    audio_notes: Optional[str] = Field(None, description="語音注意事項（如：語調、重音等）")

class DailyConversation(BaseModel):
    title: str = Field(..., description="對話標題")
    scenario: str = Field(..., description="對話情境")
    participants: List[str] = Field(..., description="對話參與者")
    conversation: List[ConversationTurn] = Field(..., description="對話內容")
    difficulty_level: str = Field(default="中級", description="難度等級")
    scenario_category: str = Field(..., description="情境類別（如：餐廳、購物、商務等）")

class DailyDiscoveryResponse(BaseModel):
    id: int = Field(..., description="內容ID")
    content_date: date = Field(..., description="內容日期")
    content_type: str = Field(..., description="內容類型（article或conversation）")
    article: Optional[DailyDiscoveryArticle] = Field(None, description="文章內容")
    conversation: Optional[DailyConversation] = Field(None, description="對話內容")
    knowledge_points: List[KnowledgePoint] = Field(default=[], description="知識點列表")
    learning_objectives: List[str] = Field(default=[], description="學習目標")
    discussion_questions: List[str] = Field(default=[], description="討論問題")
    created_at: datetime = Field(..., description="創建時間")
    expires_at: datetime = Field(..., description="過期時間")
    is_bookmarked: Optional[bool] = Field(default=False, description="當前用戶是否已收藏")
    bookmark_stats: Optional[Dict[str, int]] = Field(default={}, description="收藏統計信息")

# Sentence Analysis Models
class GrammarComponent(BaseModel):
    component: str = Field(..., description="語法成分（主語、謂語、賓語等）")
    text: str = Field(..., description="對應的文字內容")
    explanation: str = Field(..., description="中文解釋")

class TenseAnalysis(BaseModel):
    tense_name: str = Field(..., description="時態名稱")
    tense_form: str = Field(..., description="時態形式")
    usage_explanation: str = Field(..., description="使用情況說明")

class VocabularyBreakdown(BaseModel):
    word: str = Field(..., description="單字")
    part_of_speech: str = Field(..., description="詞性")
    meaning: str = Field(..., description="在句子中的含義")
    function: str = Field(..., description="在句子中的功能")

class SentenceAnalysisResponse(BaseModel):
    sentence: str = Field(..., description="分析的句子")
    sentence_type: str = Field(..., description="句型類型")
    grammar_structure: List[GrammarComponent] = Field(..., description="語法結構分析")
    tense_analysis: TenseAnalysis = Field(..., description="時態分析")
    key_grammar_points: List[str] = Field(default=[], description="重要語法點")
    vocabulary_breakdown: List[VocabularyBreakdown] = Field(..., description="詞彙分解")
    rewrite_suggestions: List[str] = Field(default=[], description="改寫建議")
    learning_tips: str = Field(..., description="學習提示")
    difficulty_level: str = Field(..., description="句子難度等級")
    
    @classmethod
    def model_validate(cls, obj):
        # Clean null values from lists before validation
        if isinstance(obj, dict):
            for key in ['key_grammar_points', 'rewrite_suggestions']:
                if key in obj and isinstance(obj[key], list):
                    obj[key] = [item for item in obj[key] if item is not None]
        return super().model_validate(obj)

class AIExplanationResponse(BaseModel):
    text: str = Field(..., description="分析的文字（單字或句子）")
    explanation: str
    explanation_type: str
    structured_data: Optional[StructuredAIResponse | DeepLearningAIResponse | SentenceAnalysisResponse] = Field(None, description="結構化數據")

# Bookmark Models
class BookmarkType:
    FULL = 'full'
    KNOWLEDGE_POINT = 'knowledge_point' 
    ARTICLE_SECTION = 'article_section'
    DISCUSSION = 'discussion'

class BookmarkRequest(BaseModel):
    discovery_id: int = Field(..., description="每日探索內容ID")
    bookmark_type: str = Field(default="full", description="收藏類型")
    knowledge_point_id: Optional[str] = Field(None, description="知識點ID（如果收藏特定知識點）")
    personal_notes: Optional[str] = Field(None, description="個人筆記")

class BookmarkResponse(BaseModel):
    id: int = Field(..., description="收藏ID")
    discovery_id: int = Field(..., description="每日探索內容ID")
    bookmark_type: str = Field(..., description="收藏類型")
    knowledge_point_id: Optional[str] = Field(None, description="知識點ID")
    personal_notes: Optional[str] = Field(None, description="個人筆記")
    created_at: datetime = Field(..., description="收藏時間")
    discovery: DailyDiscoveryResponse = Field(..., description="關聯的每日探索內容")

class BookmarkListResponse(BaseModel):
    bookmarks: List[BookmarkResponse] = Field(..., description="收藏列表")
    total_count: int = Field(..., description="總數量")
    page: int = Field(..., description="當前頁")
    page_size: int = Field(..., description="每頁大小")

class BookmarkTag(BaseModel):
    id: int = Field(..., description="標籤ID")
    tag_name: str = Field(..., description="標籤名稱")
    tag_color: str = Field(default="#3B82F6", description="標籤顏色")
    created_at: datetime = Field(..., description="創建時間")

class CreateTagRequest(BaseModel):
    tag_name: str = Field(..., min_length=1, max_length=20, description="標籤名稱")
    tag_color: str = Field(default="#3B82F6", description="標籤顏色")

class UpdateBookmarkNotesRequest(BaseModel):
    personal_notes: Optional[str] = Field(None, description="個人筆記")

# 輕量級收藏列表響應
class BookmarkSummary(BaseModel):
    id: int = Field(..., description="收藏ID")
    discovery_id: int = Field(..., description="每日探索ID")
    bookmark_type: str = Field(..., description="收藏類型")
    knowledge_point_id: Optional[str] = Field(None, description="知識點ID")
    personal_notes: Optional[str] = Field(None, description="個人筆記")
    created_at: datetime = Field(..., description="收藏時間")
    content_date: str = Field(..., description="內容日期")
    article_title: str = Field(..., description="文章標題")

class BookmarkSummaryListResponse(BaseModel):
    bookmarks: List[BookmarkSummary] = Field(..., description="收藏摘要列表")
    total_count: int = Field(..., description="總數量")
    page: int = Field(..., description="當前頁碼")
    page_size: int = Field(..., description="每頁大小")