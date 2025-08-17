import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { memWhizAPI, Word as APIWord, WordsResponse, StatsResponse } from "@/lib/api"
import { parseStructuredResponse, cleanStructuredResponse } from "@/lib/parseStructuredResponse"
import { useTelegramContext } from "@/contexts/TelegramContext"

// Convert API Word to frontend Word format
const convertAPIWordToWord = (apiWord: APIWord) => {
  // Try to parse structured data from AI explanation
  const structuredData = apiWord.initial_ai_explanation 
    ? parseStructuredResponse(apiWord.initial_ai_explanation) 
    : null;
  
  const cleanedData = structuredData ? cleanStructuredResponse(structuredData) : null;
  
  // If we have structured data, use it to populate fields
  if (cleanedData) {
    return {
      id: apiWord.id.toString(),
      term: apiWord.word,
      pronunciation: cleanedData.pronunciations?.[0] || "",
      definition: cleanedData.definitions?.[0]?.meanings?.[0]?.definition || "No definition available",
      example: cleanedData.examples?.[0] || "",
      learned: apiWord.learned || false, // Use API's learned status
      dateAdded: new Date().toISOString(),
      structured_data: cleanedData, // Add structured data for detailed view
      raw_explanation: apiWord.initial_ai_explanation, // Keep raw for fallback
      user_notes: apiWord.user_notes, // Add user notes
    };
  }
  
  // Fallback to original format
  return {
    id: apiWord.id.toString(),
    term: apiWord.word,
    pronunciation: "",
    definition: apiWord.initial_ai_explanation || "No definition available",
    example: "",
    learned: apiWord.learned || false, // Use API's learned status
    dateAdded: new Date().toISOString(),
    raw_explanation: apiWord.initial_ai_explanation,
    user_notes: apiWord.user_notes, // Add user notes
  };
}

interface VocabularyContextType {
  words: ReturnType<typeof convertAPIWordToWord>[]
  stats: StatsResponse | null
  loading: boolean
  error: string | null
  addWord: (word: string, userNotes?: string) => Promise<void>
  deleteWord: (id: string) => Promise<void>
  toggleLearned: (id: string) => Promise<void>
  refreshWords: () => Promise<void>
  silentRefreshWords: () => Promise<void>
  getAIExplanation: (word: string, type?: 'simple' | 'deep') => Promise<string>
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined)

export function VocabularyProvider({ children }: { children: ReactNode }) {
  const [words, setWords] = useState<ReturnType<typeof convertAPIWordToWord>[]>([])
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshWords = async () => {
    try {
      setLoading(true)
      setError(null)
      const response: WordsResponse = await memWhizAPI.getWords()
      const convertedWords = response.words.map(convertAPIWordToWord)
      setWords(convertedWords)
      
      // Also fetch stats
      const statsResponse = await memWhizAPI.getStats()
      setStats(statsResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch words')
      console.error('Error fetching words:', err)
    } finally {
      setLoading(false)
    }
  }

  const silentRefreshWords = async () => {
    try {
      setError(null)
      const response: WordsResponse = await memWhizAPI.getWords()
      const convertedWords = response.words.map(convertAPIWordToWord)
      setWords(convertedWords)
      
      // Also fetch stats
      const statsResponse = await memWhizAPI.getStats()
      setStats(statsResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch words')
      console.error('Error fetching words:', err)
    }
  }

  const addWord = async (word: string, userNotes?: string) => {
    console.log('useVocabulary addWord called with:', { word, userNotes })
    
    try {
      setError(null)
      console.log('Calling memWhizAPI.addWord...')
      const result = await memWhizAPI.addWord(word, userNotes)
      console.log('API addWord result:', result)
      
      console.log('Refreshing words...')
      await refreshWords() // Refresh to get the new word with correct ID
      console.log('Words refreshed successfully')
    } catch (err) {
      console.error('Error in addWord:', err)
      setError(err instanceof Error ? err.message : 'Failed to add word')
      throw err
    }
  }

  const deleteWord = async (id: string) => {
    try {
      setError(null)
      await memWhizAPI.deleteWord(parseInt(id))
      // Remove from local state immediately for better UX
      setWords(prev => prev.filter(word => word.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete word')
      console.error('Error deleting word:', err)
      throw err
    }
  }

  const toggleLearned = async (id: string) => {
    try {
      setError(null)
      const response = await memWhizAPI.toggleWordLearned(parseInt(id))
      // Update local state based on server response
      setWords(prev => 
        prev.map(word => 
          word.id === id ? { ...word, learned: response.new_status === 'learned' } : word
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update word status')
      console.error('Error updating word status:', err)
      throw err
    }
  }

  const getAIExplanation = async (word: string, type: 'simple' | 'deep' = 'simple'): Promise<string> => {
    try {
      const response = await memWhizAPI.getAIExplanation(word, type)
      
      // Try to parse structured data and return a clean summary
      const structuredData = parseStructuredResponse(response.explanation)
      if (structuredData) {
        const cleanedData = cleanStructuredResponse(structuredData)
        
        // Create a clean summary from structured data
        let summary = `📖 ${cleanedData.word}\n`
        
        if (cleanedData.pronunciations.length > 0) {
          summary += `🔊 ${cleanedData.pronunciations.join(', ')}\n`
        }
        
        cleanedData.definitions.forEach((def, index) => {
          summary += `\n${index + 1}. [${def.part_of_speech}]\n`
          def.meanings.forEach((meaning, meaningIndex) => {
            summary += `   • ${meaning.definition}\n`
          })
        })
        
        if (cleanedData.examples.length > 0) {
          summary += `\n📝 例句：\n`
          cleanedData.examples.forEach((example, index) => {
            summary += `   ${index + 1}. ${example}\n`
          })
        }
        
        if (cleanedData.synonyms.length > 0) {
          summary += `\n🔄 同義詞：${cleanedData.synonyms.join(', ')}\n`
        }
        
        if (cleanedData.antonyms.length > 0) {
          summary += `\n↔️ 反義詞：${cleanedData.antonyms.join(', ')}\n`
        }
        
        if (cleanedData.memory_tips) {
          summary += `\n💡 記憶技巧：${cleanedData.memory_tips}\n`
        }
        
        return summary
      }
      
      // Fallback to raw explanation if parsing fails
      return response.explanation
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to get AI explanation')
    }
  }

  // Initial load — wait for Telegram auth to be ready to avoid missing Authorization header
  const telegram = useTelegramContext()
  useEffect(() => {
    if (!telegram.isReady) return
    if (telegram.isTelegramWebApp && !telegram.user) return
    refreshWords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telegram.isReady, telegram.isTelegramWebApp, telegram.user])

  return (
    <VocabularyContext.Provider value={{ 
      words, 
      stats,
      loading, 
      error, 
      addWord, 
      deleteWord, 
      toggleLearned, 
      refreshWords,
      silentRefreshWords,
      getAIExplanation
    }}>
      {children}
    </VocabularyContext.Provider>
  )
}

export function useVocabulary() {
  const context = useContext(VocabularyContext)
  if (context === undefined) {
    throw new Error("useVocabulary must be used within a VocabularyProvider")
  }
  return context
}
