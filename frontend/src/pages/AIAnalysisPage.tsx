import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import TestStructuredDisplay from '@/components/TestStructuredDisplay';
import { Sparkles, Zap, Brain } from 'lucide-react';

const AIAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [initialWord, setInitialWord] = useState<string | null>(null);

  useEffect(() => {
    const word = searchParams.get('word');
    if (word) {
      setInitialWord(word);
    }
  }, [searchParams]);

  const handleAnalysisProcessed = () => {
    setInitialWord(null);
  };

  const handleAIAnalysisClick = (word: string) => {
    setInitialWord(word);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* 頁面標題 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-pink-200/30">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg">
            <Sparkles className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">AI 深度解析</h1>
            <p className="text-slate-600">使用人工智慧深度分析單字和提供學習建議</p>
          </div>
        </div>
        
        {/* AI 功能介紹 */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200/30">
            <div className="flex items-center space-x-2 text-blue-700 mb-2">
              <Brain className="w-5 h-5" />
              <span className="font-medium">智能分析</span>
            </div>
            <p className="text-sm text-blue-600">
              深入分析詞源、搭配用法、語境應用等進階資訊
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200/30">
            <div className="flex items-center space-x-2 text-green-700 mb-2">
              <Zap className="w-5 h-5" />
              <span className="font-medium">記憶策略</span>
            </div>
            <p className="text-sm text-green-600">
              個人化的記憶技巧和學習建議，提升學習效率
            </p>
          </div>
        </div>
      </div>

      {/* AI 解析組件 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm ring-1 ring-slate-200/30 overflow-hidden">
        <TestStructuredDisplay
          initialWord={initialWord}
          onAnalysisProcessed={handleAnalysisProcessed}
          onAIAnalysisClick={handleAIAnalysisClick}
        />
      </div>
    </motion.div>
  );
};

export default AIAnalysisPage;