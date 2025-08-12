import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { useAnimation } from '@/hooks/useAnimation';
import { ThemeCard, ThemeTitle, ThemeText } from '@/components/ui/ThemeComponents';
import TestStructuredDisplay from '@/components/TestStructuredDisplay';
import { Sparkles, Zap, Brain } from 'lucide-react';

const AIAnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [initialWord, setInitialWord] = useState<string | null>(null);
  const animation = useAnimation();

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
      initial={animation.pageTransition.initial}
      animate={animation.pageTransition.animate}
      exit={animation.pageTransition.exit}
      transition={animation.pageTransition.transition}
      className="space-y-6"
    >
      {/* 頁面標題 */}
      <ThemeCard className="ring-pink-200/30 dark:ring-pink-700/30">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/40 dark:to-purple-900/40 rounded-lg">
            <Sparkles className="w-6 h-6 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <ThemeTitle level={2}>AI 深度解析</ThemeTitle>
            <ThemeText variant="body">使用人工智慧深度分析單字和提供學習建議</ThemeText>
          </div>
        </div>
        
        {/* AI 功能介紹 */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-blue-200/30 dark:border-blue-700/30">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300 mb-2">
              <Brain className="w-5 h-5" />
              <span className="font-medium">智能分析</span>
            </div>
            <ThemeText variant="small" className="text-blue-600 dark:text-blue-300">
              深入分析詞源、搭配用法、語境應用等進階資訊
            </ThemeText>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200/30 dark:border-green-700/30">
            <div className="flex items-center space-x-2 text-green-700 dark:text-green-300 mb-2">
              <Zap className="w-5 h-5" />
              <span className="font-medium">記憶策略</span>
            </div>
            <ThemeText variant="small" className="text-green-600 dark:text-green-300">
              個人化的記憶技巧和學習建議，提升學習效率
            </ThemeText>
          </div>
        </div>
      </ThemeCard>

      {/* AI 解析組件 */}
      <ThemeCard variant="default" className="overflow-hidden">
        <TestStructuredDisplay
          initialWord={initialWord}
          onAnalysisProcessed={handleAnalysisProcessed}
          onAIAnalysisClick={handleAIAnalysisClick}
        />
      </ThemeCard>
    </motion.div>
  );
};

export default AIAnalysisPage;