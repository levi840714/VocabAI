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
}

export interface WordDefinition {
  part_of_speech: string
  meanings: WordMeaning[]
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