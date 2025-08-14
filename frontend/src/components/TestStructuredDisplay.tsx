import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import DeepLearningWordDisplay from './DeepLearningWordDisplay';
import { memWhizAPI, AIExplanationResponse } from '@/lib/api';
import { DeepLearningAIResponse } from '../lib/types';
import { useToast } from '@/hooks/use-toast';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { useSettings } from '@/contexts/SettingsContext';
import { Plus } from 'lucide-react';

interface TestStructuredDisplayProps {
  initialWord?: string | null;
  onAnalysisProcessed?: () => void;
  onAIAnalysisClick?: (word: string) => void;
}

const TestStructuredDisplay: React.FC<TestStructuredDisplayProps> = ({ initialWord, onAnalysisProcessed, onAIAnalysisClick }) => {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeepLearningAIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedWord, setLastProcessedWord] = useState<string | null>(null);
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [isRemovingWord, setIsRemovingWord] = useState(false);
  const { toast } = useToast();
  const { isDarkMode } = useSettings();
  const { words, addWord, deleteWord } = useVocabulary();

  // 當有新的 initialWord 時自動設置並分析（但避免重複請求）
  useEffect(() => {
    if (initialWord && initialWord.trim() && initialWord !== lastProcessedWord) {
      setWord(initialWord);
      // 清除之前的結果並自動發送請求
      setResult(null);
      setError(null);
      handleSubmitForWord(initialWord);
      // 通知父組件已處理完成
      if (onAnalysisProcessed) {
        onAnalysisProcessed();
      }
    }
  }, [initialWord, onAnalysisProcessed]);

  const handleSubmitForWord = async (targetWord: string) => {
    if (!targetWord.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setLastProcessedWord(targetWord.trim());

    try {
      const response: AIExplanationResponse = await memWhizAPI.getAIExplanation(targetWord.trim(), 'deep');
      
      if (response.structured_data && response.explanation_type === 'deep') {
        setResult(response.structured_data as DeepLearningAIResponse);
      } else {
        setError('無法獲得深度學習解析資料。原始回應: ' + response.explanation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生未知錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    await handleSubmitForWord(word);
  };

  // 檢查單字是否已存在於詞彙庫中
  const isWordInVocabulary = lastProcessedWord 
    ? words.some(w => w.term.toLowerCase() === lastProcessedWord.toLowerCase())
    : false;

  // 獲取詞彙庫中的單字ID（用於刪除）
  const existingWord = lastProcessedWord 
    ? words.find(w => w.term.toLowerCase() === lastProcessedWord.toLowerCase())
    : null;

  const handleAddWord = async () => {
    if (!lastProcessedWord || !result) {
      return;
    }

    setIsAddingWord(true);
    try {
      // 使用 vocabulary hook 的 addWord 方法
      await addWord(lastProcessedWord);
      
      toast({
        title: "成功收藏！",
        description: `單字 "${lastProcessedWord}" 已收藏到您的詞彙庫中`,
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
        description: `單字 "${lastProcessedWord}" 已從您的收藏中移除`,
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className={`text-3xl font-bold text-center mb-4 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
        🧠 AI 深度解析
      </h1>
      <p className={`text-center mb-8 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
        輸入任意英文單字，獲取專業級的詞源分析、搭配用法、記憶策略等深度學習內容
      </p>

      {/* Input Section */}
      <Card className={`p-6 mb-6 ${isDarkMode ? 'bg-slate-800/80 border-slate-600' : 'bg-white border-slate-200'}`}>
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="輸入英文單字..."
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className={`flex-1 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 focus-visible:ring-purple-400' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus-visible:ring-purple-500'}`}
          />
          <Button 
            onClick={handleSubmit}
            disabled={loading || !word.trim()}
            className={`${isDarkMode ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600' : 'bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300'} text-white`}
          >
            {loading ? '深度解析中...' : '🧠 開始深度解析'}
          </Button>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className={`p-4 mb-6 ${isDarkMode ? 'border-red-600 bg-red-900/20' : 'border-red-300 bg-red-50'}`}>
          <h3 className={`font-semibold mb-2 ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>錯誤</h3>
          <p className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-600'}`}>{error}</p>
        </Card>
      )}

      {/* Deep Learning Display */}
      {result && (
        <div>
          <h2 className={`text-2xl font-semibold mb-4 ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>🧠 AI 深度解析結果：</h2>
          <DeepLearningWordDisplay 
            data={result} 
            onAIAnalysisClick={onAIAnalysisClick}
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
          />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4 ${isDarkMode ? 'border-purple-400' : 'border-purple-600'}`}></div>
          <p className={`font-medium ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>🧠 AI 正在進行深度解析...</p>
          <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>這包括詞源分析、搭配用法、記憶策略等，可能需要幾秒鐘</p>
        </div>
      )}
    </div>
  );
};

export default TestStructuredDisplay;