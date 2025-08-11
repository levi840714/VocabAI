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

export interface StructuredAIResponse {
  word: string
  pronunciations: string[]
  definitions: WordDefinition[]
  examples: string[]
  synonyms: string[]
  antonyms: string[]
  memory_tips?: string
}

export interface DeepLearningAIResponse {
  word: string
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