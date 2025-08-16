export interface Word {
  id: string
  term: string
  pronunciation?: string
  definition: string
  example?: string
  learned: boolean
  dateAdded: string
  structured_data?: StructuredAIResponse
}

export interface WordMeaning {
  definition: string
  context?: string
  formality?: string
  usage_notes?: string
}

export interface WordDefinition {
  part_of_speech: string
  meanings: WordMeaning[]
}

export interface Etymology {
  origin: string
  root_analysis: string | Record<string, string>
  related_words: string[]
}

export interface Collocations {
  common_phrases: string[]
  verb_combinations: string[]
  adjective_combinations: string[]
  preposition_combinations: string[]
}

export interface ExampleSentence {
  sentence: string
  translation: string
  context: string
}

export interface EnhancedSynonym {
  word: string
  difference: string
}

export interface MemoryStrategies {
  visual: string
  association: string
  word_formation: string
  story: string
}

export interface BaseForm {
  word: string
  inflection_type: string
}

export interface StructuredAIResponse {
  word: string
  is_inflected?: boolean
  base_form?: BaseForm | null
  pronunciations: string[]
  definitions: WordDefinition[]
  examples: string[]
  synonyms: string[]
  antonyms: string[]
  memory_tips?: string
}

export interface DeepLearningAIResponse {
  word: string
  is_inflected?: boolean
  base_form?: BaseForm | null
  pronunciations: string[]
  etymology: Etymology
  definitions: WordDefinition[]
  collocations: Collocations
  examples: ExampleSentence[]
  synonyms: EnhancedSynonym[]
  antonyms: string[]
  memory_strategies: MemoryStrategies
  cultural_notes: string
  difficulty_level: string
  frequency: string
}

// Sentence Analysis Types
export interface GrammarComponent {
  component: string
  text: string
  explanation: string
}

export interface TenseAnalysis {
  tense_name: string
  tense_form: string
  usage_explanation: string
}

export interface VocabularyBreakdown {
  word: string
  part_of_speech: string
  meaning: string
  function: string
}

export interface SentenceAnalysisResponse {
  sentence: string
  sentence_type: string
  grammar_structure: GrammarComponent[]
  tense_analysis: TenseAnalysis
  key_grammar_points: string[]
  vocabulary_breakdown: VocabularyBreakdown[]
  rewrite_suggestions: string[]
  learning_tips: string
  difficulty_level: string
}

// Daily Discovery Types
export interface KnowledgePoint {
  id: string
  type: 'vocabulary' | 'grammar' | 'cultural' | 'expression'
  title: string
  content: string
  examples: string[]
  difficulty: string
}

export interface DailyDiscoveryArticle {
  title: string
  content: string
  word_count: number
  difficulty_level: string
  topic_category: string
}

export interface ConversationTurn {
  speaker: string
  text: string
  translation: string
  audio_notes?: string
}

export interface DailyConversation {
  title: string
  scenario: string
  participants: string[]
  conversation: ConversationTurn[]
  difficulty_level: string
  scenario_category: string
}

export interface DailyDiscoveryResponse {
  id: number
  content_date: string
  content_type: 'article' | 'conversation'
  article?: DailyDiscoveryArticle
  conversation?: DailyConversation
  knowledge_points: KnowledgePoint[]
  learning_objectives: string[]
  discussion_questions: string[]
  created_at: string
  expires_at: string
  is_bookmarked?: boolean
  bookmark_stats?: { [key: string]: number }
}

// Bookmark related types
export enum BookmarkType {
  FULL = 'full',
  KNOWLEDGE_POINT = 'knowledge_point',
  ARTICLE_SECTION = 'article_section',
  DISCUSSION = 'discussion'
}

export interface BookmarkRequest {
  discovery_id: number
  bookmark_type?: string
  knowledge_point_id?: string
  personal_notes?: string
}

export interface BookmarkResponse {
  id: number
  discovery_id: number
  bookmark_type: string
  knowledge_point_id?: string
  personal_notes?: string
  created_at: string
  discovery: DailyDiscoveryResponse
}

export interface BookmarkListResponse {
  bookmarks: BookmarkResponse[]
  total_count: number
  page: number
  page_size: number
}

export interface BookmarkTag {
  id: number
  tag_name: string
  tag_color: string
  created_at: string
}

export interface CreateTagRequest {
  tag_name: string
  tag_color?: string
}

export interface UpdateBookmarkNotesRequest {
  personal_notes?: string
}

// 輕量級收藏摘要
export interface BookmarkSummary {
  id: number
  discovery_id: number
  bookmark_type: string
  knowledge_point_id?: string
  personal_notes?: string
  created_at: string
  content_date: string
  article_title: string
  content_type: string
}

export interface BookmarkSummaryListResponse {
  bookmarks: BookmarkSummary[]
  total_count: number
  page: number
  page_size: number
}