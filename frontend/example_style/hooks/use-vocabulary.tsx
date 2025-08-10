"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import type { Word } from "@/lib/types"

// Sample initial data
const initialWords: Word[] = [
  {
    id: "1",
    term: "學習",
    pronunciation: "ㄒㄩㄝˊ ㄒㄧˊ",
    definition: "學習知識或技能",
    example: "我喜歡學習新語言。",
    learned: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: "2",
    term: "單字",
    pronunciation: "ㄉㄢ ㄗˋ",
    definition: "詞彙中的個別詞語",
    example: "這本書有很多新單字。",
    learned: false,
    dateAdded: new Date().toISOString(),
  },
  {
    id: "3",
    term: "記憶",
    pronunciation: "ㄐㄧˋ ㄧˋ",
    definition: "儲存和回憶信息的能力",
    example: "我的記憶力很好。",
    learned: false,
    dateAdded: new Date().toISOString(),
  },
]

type VocabularyContextType = {
  words: Word[]
  addWord: (word: Word) => void
  deleteWord: (id: string) => void
  toggleLearned: (id: string) => void
}

const VocabularyContext = createContext<VocabularyContextType | undefined>(undefined)

export function VocabularyProvider({ children }: { children: ReactNode }) {
  const [words, setWords] = useState<Word[]>([])

  useEffect(() => {
    // Load from localStorage if available
    const savedWords = localStorage.getItem("vocabulary")
    if (savedWords) {
      setWords(JSON.parse(savedWords))
    } else {
      // Use initial data if nothing in localStorage
      setWords(initialWords)
    }
  }, [])

  useEffect(() => {
    // Save to localStorage whenever words change
    if (words.length > 0) {
      localStorage.setItem("vocabulary", JSON.stringify(words))
    }
  }, [words])

  const addWord = (word: Word) => {
    setWords((prev) => [...prev, word])
  }

  const deleteWord = (id: string) => {
    setWords((prev) => prev.filter((word) => word.id !== id))
  }

  const toggleLearned = (id: string) => {
    setWords((prev) => prev.map((word) => (word.id === id ? { ...word, learned: !word.learned } : word)))
  }

  return (
    <VocabularyContext.Provider value={{ words, addWord, deleteWord, toggleLearned }}>
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
