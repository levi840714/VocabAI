import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Textarea } from './ui/textarea';
import DeepLearningWordDisplay from './DeepLearningWordDisplay';
import SentenceAnalysisDisplay from './SentenceAnalysisDisplay';
import { memWhizAPI, AIExplanationResponse } from '@/lib/api';
import { DeepLearningAIResponse, SentenceAnalysisResponse } from '../lib/types';
import { useToast } from '@/hooks/use-toast';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { useSettings } from '@/contexts/SettingsContext';
import { useAnalysisState } from '@/hooks/useAnalysisCache';
import { Plus, BookOpen, MessageSquare } from 'lucide-react';

interface TestStructuredDisplayProps {
  initialWord?: string | null;
  initialSentence?: string | null;
  cachedState?: any;
  onAnalysisProcessed?: () => void;
  onAIAnalysisClick?: (word: string) => void;
}

const TestStructuredDisplay: React.FC<TestStructuredDisplayProps> = ({ initialWord, initialSentence, cachedState, onAnalysisProcessed, onAIAnalysisClick }) => {
  // 使用新的緩存狀態管理
  const {
    analysisMode,
    inputText,
    lastProcessedText,
    wordResult,
    sentenceResult,
    error,
    isRestored,
    setAnalysisMode,
    setInputText,
    setLastProcessedText,
    setWordResult,
    setSentenceResult,
    setError,
    createSnapshot,
    saveCurrentState,
    saveAnalysisResult, // 新增：保存解析結果的函數
    clearCache
  } = useAnalysisState();
  
  const [loading, setLoading] = useState(false);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [isRemovingWord, setIsRemovingWord] = useState(false);
  const { toast } = useToast();
  const { isDarkMode } = useSettings();
  const { words, addWord, deleteWord } = useVocabulary();
  const navigate = useNavigate();

  // 處理新的分析請求（initialWord 或 initialSentence）
  useEffect(() => {
    // 如果是緩存恢復狀態，跳過初始請求處理
    if (isRestored && !initialWord && !initialSentence) {
      console.log('🔄 使用緩存恢復的狀態，跳過初始請求');
      return;
    }

    if (initialWord && initialWord.trim() && initialWord !== lastProcessedText) {
      console.log('🎯 處理初始單字請求:', initialWord);
      // 清除緩存狀態，開始新分析
      clearCache();
      setAnalysisMode('word');
      setInputText(initialWord);
      setWordResult(null);
      setSentenceResult(null);
      setError(null);
      handleSubmitForText(initialWord, 'word');
      
      if (onAnalysisProcessed) {
        onAnalysisProcessed();
      }
    } else if (initialSentence && initialSentence.trim() && initialSentence !== lastProcessedText) {
      console.log('🎯 處理初始句子請求:', initialSentence);
      // 清除緩存狀態，開始新分析
      clearCache();
      setAnalysisMode('sentence');
      setInputText(initialSentence);
      setWordResult(null);
      setSentenceResult(null);
      setError(null);
      handleSubmitForText(initialSentence, 'sentence');
      
      if (onAnalysisProcessed) {
        onAnalysisProcessed();
      }
    }
  }, [initialWord, initialSentence, isRestored, lastProcessedText]);

  const handleSubmitForText = async (targetText: string, mode: 'word' | 'sentence') => {
    if (!targetText.trim()) return;
    
    setLoading(true);
    setError(null);
    setWordResult(null);
    setSentenceResult(null);
    setLastProcessedText(targetText.trim());

    try {
      const explanationType = mode === 'word' ? 'deep' : 'sentence';
      const response: AIExplanationResponse = await memWhizAPI.getAIExplanation(targetText.trim(), explanationType);
      
      if (response.structured_data) {
        if (mode === 'word' && response.explanation_type === 'deep') {
          const result = response.structured_data as DeepLearningAIResponse;
          setWordResult(result);
          setSentenceResult(null);
          // ✅ AI 解析完成，保存完整結果到緩存
          saveAnalysisResult(targetText.trim(), result, 'word');
        } else if (mode === 'sentence' && response.explanation_type === 'sentence') {
          const result = response.structured_data as SentenceAnalysisResponse;
          setSentenceResult(result);
          setWordResult(null);
          // ✅ AI 解析完成，保存完整結果到緩存
          saveAnalysisResult(targetText.trim(), result, 'sentence');
        } else {
          setError('無法獲得正確的解析資料。原始回應: ' + response.explanation);
        }
      } else {
        setError('無法獲得結構化解析資料。原始回應: ' + response.explanation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    await handleSubmitForText(inputText, analysisMode);
  };

  // 檢查單字是否已存在於詞彙庫中（只有在單字模式下才檢查）
  const isWordInVocabulary = (analysisMode === 'word' && lastProcessedText)
    ? words.some(w => w.term.toLowerCase() === lastProcessedText.toLowerCase())
    : false;

  // 獲取詞彙庫中的單字ID（用於刪除）
  const existingWord = (analysisMode === 'word' && lastProcessedText)
    ? words.find(w => w.term.toLowerCase() === lastProcessedText.toLowerCase())
    : null;

  const handleAddWord = async () => {
    if (!lastProcessedText || !wordResult || analysisMode !== 'word') {
      return;
    }

    setIsAddingWord(true);
    try {
      // 使用 vocabulary hook 的 addWord 方法
      await addWord(lastProcessedText);
      
      toast({
        title: "成功收藏！",
        description: `單字 "${lastProcessedText}" 已收藏到您的詞彙庫中`,
      });
    } catch (error) {
      console.error('加入單字失敗:', error);
      toast({
        title: "錯誤",
        description: "加入單字失敗，請稍後重試",
        variant: "destructive",
      });
    } finally {
      setIsAddingWord(false);
    }
  };

  const handleRemoveWord = async () => {
    if (!existingWord) {
      return;
    }

    setIsRemovingWord(true);
    try {
      await deleteWord(existingWord.id);
      
      toast({
        title: "取消收藏",
        description: `單字 "${lastProcessedText}" 已從您的收藏中移除`,
      });
    } catch (error) {
      console.error('移除單字失敗:', error);
      toast({
        title: "錯誤",
        description: "移除單字失敗，請稍後重試",
        variant: "destructive",
      });
    } finally {
      setIsRemovingWord(false);
    }
  };

  const handleSentenceAnalysis = async (sentence: string) => {
    // 切換到句子分析模式並自動分析
    setAnalysisMode('sentence');
    setInputText(sentence);
    // 清除當前結果
    setWordResult(null);
    setSentenceResult(null);
    setError(null);
    
    toast({
      title: "✨ 句子分析",
      description: `正在分析句子的語法結構...`,
    });
    
    // 自動發送句子分析請求
    await handleSubmitForText(sentence, 'sentence');
  };

  // 處理智能點擊，自動保存當前狀態並跳轉
  const handleAIAnalysisClickWithCache = (word: string) => {
    console.log('💾 保存當前狀態到緩存，跳轉分析單字:', word);
    
    // 保存當前狀態到 sessionStorage
    saveCurrentState();
    
    // 跳轉到新的單字分析
    navigate(`/ai-analysis?word=${encodeURIComponent(word)}`);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className={`text-3xl font-bold text-center mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        🧠 AI 智能解析
      </h1>
      <p className={`text-center mb-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
        {analysisMode === 'word' 
          ? '輸入任意英文單字，獲取專業級的詞源分析、搭配用法、記憶策略等深度學習內容' 
          : '輸入任意英語句子，獲取詳細的語法結構分析、時態解釋和學習建議'}
      </p>

      {/* Mode Switcher */}
      <div className="flex justify-center mb-6">
        <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1">
          <button
            onClick={() => {
              clearCache(); // 清除緩存
              setAnalysisMode('word');
              setInputText('');
              setWordResult(null);
              setSentenceResult(null);
              setError(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
              analysisMode === 'word'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen size={18} />
            單字解析
          </button>
          <button
            onClick={() => {
              clearCache(); // 清除緩存
              setAnalysisMode('sentence');
              setInputText('');
              setWordResult(null);
              setSentenceResult(null);
              setError(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all duration-200 ${
              analysisMode === 'sentence'
                ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare size={18} />
            句子分析
          </button>
        </div>
      </div>

      {/* Input Section */}
      <Card className={`p-6 mb-6 ${isDarkMode ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
        <div className="space-y-4">
          {analysisMode === 'word' ? (
            <div className="flex gap-4">
              <Input
                type="text"
                placeholder="輸入英文單字..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                className={`flex-1 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-purple-400' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:ring-purple-500'}`}
              />
              <Button 
                onClick={handleSubmit}
                disabled={loading || !inputText.trim()}
                className={`${isDarkMode ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300'} text-white`}
              >
                {loading ? '深度解析中...' : '🧠 開始深度解析'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                placeholder="輸入英語句子進行語法分析..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className={`resize-none ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-green-400' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:ring-green-500'}`}
                rows={3}
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmit}
                  disabled={loading || !inputText.trim()}
                  className={`${isDarkMode ? 'bg-green-600 hover:bg-green-700 disabled:bg-slate-600' : 'bg-green-600 hover:bg-green-700 disabled:bg-slate-300'} text-white`}
                >
                  {loading ? '語法分析中...' : '🔍 開始句子分析'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className={`p-4 mb-6 ${isDarkMode ? 'border-red-600 bg-red-900/20' : 'border-red-300 bg-red-50'}`}>
          <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>錯誤</h3>
          <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
        </Card>
      )}

      {/* Results Display */}
      {wordResult && analysisMode === 'word' && (
        <div>
          <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>🧠 AI 深度解析結果：</h2>
          <DeepLearningWordDisplay 
            data={wordResult} 
            onAIAnalysisClick={handleAIAnalysisClickWithCache}
            onWordAdded={(word) => {
              console.log(`✅ TestStructuredDisplay：單字 "${word}" 智能點擊觸發`);
              // 這個回調會被 ClickableTextWrapper 內部調用，不需要額外處理
              // 因為全域回調已經在 AIAnalysisPage 中設置了
            }}
            onAddWordClick={handleAddWord}
            onRemoveWordClick={handleRemoveWord}
            isAddingWord={isAddingWord}
            isRemovingWord={isRemovingWord}
            isWordInVocabulary={isWordInVocabulary}
            onSentenceAnalysis={handleSentenceAnalysis}
          />
        </div>
      )}

      {sentenceResult && analysisMode === 'sentence' && (
        <div>
          <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-green-300' : 'text-green-700'}`}>🔍 句子語法分析結果：</h2>
          <SentenceAnalysisDisplay 
            data={sentenceResult} 
            onAIAnalysisClick={handleAIAnalysisClickWithCache}
            onWordAdded={(word) => {
              console.log(`✅ TestStructuredDisplay：句子中單字 "${word}" 智能點擊觸發`);
              // 這個回調會被 ClickableTextWrapper 內部調用，不需要額外處理
            }}
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4 ${
            analysisMode === 'word' 
              ? (isDarkMode ? 'border-purple-400' : 'border-purple-600')
              : (isDarkMode ? 'border-green-400' : 'border-green-600')
          }`}></div>
          <p className={`font-medium ${
            analysisMode === 'word' 
              ? (isDarkMode ? 'text-purple-400' : 'text-purple-600')
              : (isDarkMode ? 'text-green-400' : 'text-green-600')
          }`}>
            {analysisMode === 'word' ? '🧠 AI 正在進行深度解析...' : '🔍 AI 正在分析語法結構...'}
          </p>
          <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {analysisMode === 'word' 
              ? '這包括詞源分析、搭配用法、記憶策略等，可能需要幾秒鐘'
              : '這包括語法分析、時態解釋、詞彙分解等，可能需要幾秒鐘'}
          </p>
        </div>
      )}
    </div>
  );
};

export default TestStructuredDisplay;