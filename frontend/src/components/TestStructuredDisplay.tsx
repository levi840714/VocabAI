import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import DeepLearningWordDisplay from './DeepLearningWordDisplay';
import { vocabotAPI, AIExplanationResponse } from '@/lib/api';
import { DeepLearningAIResponse } from '../lib/types';

interface TestStructuredDisplayProps {
  initialWord?: string | null;
  onAnalysisProcessed?: () => void;
}

const TestStructuredDisplay: React.FC<TestStructuredDisplayProps> = ({ initialWord, onAnalysisProcessed }) => {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DeepLearningAIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastProcessedWord, setLastProcessedWord] = useState<string | null>(null);

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
      const response: AIExplanationResponse = await vocabotAPI.getAIExplanation(targetWord.trim(), 'deep');
      
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-4">
        🧠 AI 深度解析
      </h1>
      <p className="text-center text-slate-600 mb-8">
        輸入任意英文單字，獲取專業級的詞源分析、搭配用法、記憶策略等深度學習內容
      </p>

      {/* Input Section */}
      <Card className="p-6 mb-6">
        <div className="flex gap-4">
          <Input
            type="text"
            placeholder="輸入英文單字..."
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            className="flex-1"
          />
          <Button 
            onClick={handleSubmit}
            disabled={loading || !word.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {loading ? '深度解析中...' : '🧠 開始深度解析'}
          </Button>
        </div>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="p-4 mb-6 border-red-300 bg-red-50">
          <h3 className="text-red-700 font-semibold mb-2">錯誤</h3>
          <p className="text-red-600 text-sm">{error}</p>
        </Card>
      )}

      {/* Deep Learning Display */}
      {result && (
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-purple-700">🧠 AI 深度解析結果：</h2>
          <DeepLearningWordDisplay data={result} />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600 font-medium">🧠 AI 正在進行深度解析...</p>
          <p className="text-gray-500 text-sm mt-2">這包括詞源分析、搭配用法、記憶策略等，可能需要幾秒鐘</p>
        </div>
      )}
    </div>
  );
};

export default TestStructuredDisplay;