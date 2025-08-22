import { useState, useEffect } from 'react';
import { memWhizAPI, WordsResponse } from '@/lib/api';
import { useTelegramContext } from '@/contexts/TelegramContext';

export interface VocabularyListState {
  words: any[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  hasNextPage: boolean;
  search: string;
  category: string;
}

export interface VocabularyListActions {
  setSearch: (search: string) => void;
  setCategory: (category: string) => void;
  loadPage: (page: number) => Promise<void>;
  refresh: () => Promise<void>;
  toggleLearned: (id: string) => Promise<void>;
  deleteWord: (id: string) => Promise<void>;
  updateWordCategory: (id: string, category: string) => Promise<void>;
}

export function useVocabularyList(pageSize: number = 20): VocabularyListState & VocabularyListActions {
  const [state, setState] = useState<VocabularyListState>({
    words: [],
    loading: false,
    error: null,
    totalCount: 0,
    currentPage: 0,
    pageSize,
    hasNextPage: false,
    search: '',
    category: 'all',
  });
  
  const telegram = useTelegramContext();

  const loadWords = async (page: number = 0, search?: string, category?: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const searchTerm = search !== undefined ? search : state.search;
      const categoryFilter = category !== undefined ? category : state.category;
      
      // 準備API參數
      const apiCategory = categoryFilter === 'all' ? undefined : categoryFilter;
      const apiSearch = searchTerm.trim() || undefined;
      
      const response: WordsResponse = await memWhizAPI.getWords(
        page, 
        pageSize,
        'all',
        apiSearch,
        apiCategory
      );
      
      // 轉換API數據為前端格式（簡化版）
      const convertedWords = response.words.map(apiWord => ({
        id: apiWord.id.toString(),
        term: apiWord.word,
        definition: apiWord.chinese_meaning || 'No definition available',
        pronunciation: '', // 暫時留空，如需要可以從AI解釋中解析
        example: '', // 暫時留空
        learned: (apiWord as any).learned || false,
        category: (apiWord as any).category || 'uncategorized',
        user_notes: (apiWord as any).user_notes,
      }));
      
      setState(prev => ({
        ...prev,
        words: convertedWords,
        totalCount: response.total_count,
        currentPage: page,
        hasNextPage: (page + 1) * pageSize < response.total_count,
        search: searchTerm,
        category: categoryFilter,
        loading: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load words',
        loading: false,
      }));
    }
  };

  const setSearch = (search: string) => {
    loadWords(0, search, undefined);
  };

  const setCategory = (category: string) => {
    loadWords(0, undefined, category);
  };

  const loadPage = async (page: number) => {
    await loadWords(page);
  };

  const refresh = async () => {
    await loadWords(state.currentPage);
  };

  const toggleLearned = async (id: string) => {
    try {
      await memWhizAPI.toggleWordLearned(parseInt(id));
      // 更新本地狀態
      setState(prev => ({
        ...prev,
        words: prev.words.map(word => 
          word.id === id ? { ...word, learned: !word.learned } : word
        )
      }));
    } catch (error) {
      throw new Error('Failed to toggle word status');
    }
  };

  const deleteWord = async (id: string) => {
    try {
      await memWhizAPI.deleteWord(parseInt(id));
      // 重新載入當前頁面
      await loadWords(state.currentPage);
    } catch (error) {
      throw new Error('Failed to delete word');
    }
  };

  const updateWordCategory = async (id: string, category: string) => {
    try {
      await memWhizAPI.updateWordCategory(parseInt(id), category);
      // 更新本地狀態
      setState(prev => ({
        ...prev,
        words: prev.words.map(word => 
          word.id === id ? { ...word, category } : word
        )
      }));
    } catch (error) {
      throw new Error('Failed to update word category');
    }
  };

  // 初始載入
  useEffect(() => {
    // 等待 Telegram 準備就緒
    if (telegram.isTelegramWebApp && (!telegram.isReady || !telegram.user)) {
      return;
    }
    
    loadWords();
  }, [telegram.isReady, telegram.isTelegramWebApp, telegram.user]);

  return {
    ...state,
    setSearch,
    setCategory,
    loadPage,
    refresh,
    toggleLearned,
    deleteWord,
    updateWordCategory,
  };
}