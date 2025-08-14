import { useState, useEffect } from 'react';
import { DeepLearningAIResponse, SentenceAnalysisResponse } from '@/lib/types';

interface AnalysisState {
  mode: 'word' | 'sentence';
  inputText: string;
  lastProcessedText: string;
  wordResult: DeepLearningAIResponse | null;
  sentenceResult: SentenceAnalysisResponse | null;
  error: string | null;
  timestamp: number;
}

const CACHE_KEY = 'ai-analysis-cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小時

export const useAnalysisCache = () => {
  // 從 sessionStorage 加載緩存
  const loadCache = (): AnalysisState | null => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached) as AnalysisState;
      
      // 檢查是否過期
      if (Date.now() - parsed.timestamp > CACHE_EXPIRY) {
        sessionStorage.removeItem(CACHE_KEY);
        return null;
      }
      
      console.log('📦 從 SessionStorage 加載緩存:', parsed);
      return parsed;
    } catch (error) {
      console.error('❌ 加載緩存失敗:', error);
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
  };

  // 保存緩存到 sessionStorage
  const saveCache = (state: Omit<AnalysisState, 'timestamp'>) => {
    try {
      const cacheData: AnalysisState = {
        ...state,
        timestamp: Date.now()
      };
      
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 保存緩存到 SessionStorage:', cacheData);
    } catch (error) {
      console.error('❌ 保存緩存失敗:', error);
    }
  };

  // 清除緩存
  const clearCache = () => {
    sessionStorage.removeItem(CACHE_KEY);
    console.log('🗑️ 清除分析緩存');
  };

  return {
    loadCache,
    saveCache,
    clearCache
  };
};

// 緩存管理器 Hook
export const useAnalysisState = () => {
  const [analysisMode, setAnalysisMode] = useState<'word' | 'sentence'>('word');
  const [inputText, setInputText] = useState('');
  const [lastProcessedText, setLastProcessedText] = useState<string | null>(null);
  const [wordResult, setWordResult] = useState<DeepLearningAIResponse | null>(null);
  const [sentenceResult, setSentenceResult] = useState<SentenceAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRestored, setIsRestored] = useState(false);

  const { loadCache, saveCache, clearCache } = useAnalysisCache();

  // 組件掛載時嘗試恢復狀態
  useEffect(() => {
    const cached = loadCache();
    if (cached) {
      console.log('🔄 恢復分析狀態:', cached);
      setAnalysisMode(cached.mode);
      setInputText(cached.inputText);
      setLastProcessedText(cached.lastProcessedText);
      setWordResult(cached.wordResult);
      setSentenceResult(cached.sentenceResult);
      setError(cached.error);
      setIsRestored(true);
    }
  }, []);

  // 創建當前狀態快照
  const createSnapshot = () => {
    return {
      mode: analysisMode,
      inputText,
      lastProcessedText: lastProcessedText || '',
      wordResult,
      sentenceResult,
      error
    };
  };

  // 保存當前狀態到緩存
  const saveCurrentState = () => {
    const snapshot = createSnapshot();
    saveCache(snapshot);
  };

  // 手動更新狀態（不自動緩存）
  const updateState = (newState: Partial<AnalysisState>) => {
    if (newState.mode !== undefined) setAnalysisMode(newState.mode);
    if (newState.inputText !== undefined) setInputText(newState.inputText);
    if (newState.lastProcessedText !== undefined) setLastProcessedText(newState.lastProcessedText);
    if (newState.wordResult !== undefined) setWordResult(newState.wordResult);
    if (newState.sentenceResult !== undefined) setSentenceResult(newState.sentenceResult);
    if (newState.error !== undefined) setError(newState.error);
  };

  // 專門用於保存解析完成後的狀態
  const saveAnalysisResult = (processedText: string, result: DeepLearningAIResponse | SentenceAnalysisResponse, mode: 'word' | 'sentence') => {
    const cacheData: AnalysisState = {
      mode,
      inputText: processedText,
      lastProcessedText: processedText,
      wordResult: mode === 'word' ? result as DeepLearningAIResponse : null,
      sentenceResult: mode === 'sentence' ? result as SentenceAnalysisResponse : null,
      error: null,
      timestamp: Date.now()
    };
    
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
      console.log('💾 AI 解析完成，保存結果到緩存:', cacheData);
    } catch (error) {
      console.error('❌ 保存解析結果緩存失敗:', error);
    }
  };

  return {
    // 狀態
    analysisMode,
    inputText,
    lastProcessedText,
    wordResult,
    sentenceResult,
    error,
    isRestored,
    
    // 狀態設置器（不自動緩存）
    setAnalysisMode: (mode: 'word' | 'sentence') => updateState({ mode }),
    setInputText: (text: string) => updateState({ inputText: text }),
    setLastProcessedText: (text: string | null) => updateState({ lastProcessedText: text }),
    setWordResult: (result: DeepLearningAIResponse | null) => updateState({ wordResult: result }),
    setSentenceResult: (result: SentenceAnalysisResponse | null) => updateState({ sentenceResult: result }),
    setError: (error: string | null) => updateState({ error }),
    
    // 緩存管理
    createSnapshot,
    saveCurrentState,
    saveAnalysisResult, // 新增：保存解析結果
    clearCache
  };
};