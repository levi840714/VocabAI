import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import StructuredWordDisplay from './StructuredWordDisplay';
import { vocabotAPI, AIExplanationResponse } from '../lib/api';
import { StructuredAIResponse } from '../lib/types';

const TestStructuredDisplay: React.FC = () => {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<StructuredAIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!word.trim()) return;
    
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response: AIExplanationResponse = await vocabotAPI.getAIExplanation(word.trim(), 'simple');
      
      if (response.structured_data) {
        setResult(response.structured_data);
      } else {
        setError('No structured data available. Raw response: ' + response.explanation);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-center mb-4">
        AI 智能單字解釋
      </h1>
      <p className="text-center text-slate-600 mb-8">
        輸入任意英文單字，獲取結構化的詳細解釋
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
          >
            {loading ? '查詢中...' : '查詢'}
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

      {/* Structured Display */}
      {result && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">AI 解釋結果：</h2>
          <StructuredWordDisplay data={result} />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-500">正在查詢中...</p>
        </div>
      )}
    </div>
  );
};

export default TestStructuredDisplay;