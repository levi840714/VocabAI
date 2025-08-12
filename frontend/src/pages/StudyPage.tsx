import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAnimation } from '@/hooks/useAnimation';
import { ThemeCard, ThemeTitle } from '@/components/ui/ThemeComponents';
import StudyMode from '@/components/study-mode';
import { Brain, Target, Zap } from 'lucide-react';

const StudyPage: React.FC = () => {
  const navigate = useNavigate();
  const animation = useAnimation();

  const handleAIAnalysis = (word: string) => {
    navigate(`/ai-analysis?word=${encodeURIComponent(word)}`);
  };

  return (
    <motion.div
      initial={animation.pageTransition.initial}
      animate={animation.pageTransition.animate}
      exit={animation.pageTransition.exit}
      transition={animation.pageTransition.transition}
      className="space-y-3 md:space-y-6"
    >
      {/* 頁面標題 - 精簡設計 */}
      <ThemeCard 
        variant="default" 
        className="p-3 md:p-4 ring-purple-200/30 dark:ring-purple-700/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Brain className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <ThemeTitle level={3} className="text-base md:text-xl">智能複習</ThemeTitle>
            </div>
          </div>
          
          {/* 精簡學習提示 - 橫向排列 */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
              <Target className="w-3 h-3" />
              <span className="whitespace-nowrap">智能推薦</span>
            </div>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
              <Zap className="w-3 h-3" />
              <span className="whitespace-nowrap">高效學習</span>
            </div>
          </div>
        </div>
      </ThemeCard>

      {/* 複習模式 */}
      <ThemeCard variant="default" className="overflow-hidden">
        <StudyMode onAIAnalysisClick={handleAIAnalysis} />
      </ThemeCard>
    </motion.div>
  );
};

export default StudyPage;