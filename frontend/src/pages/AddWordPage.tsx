import React from 'react';
import { motion } from 'framer-motion';
import { useAnimation } from '@/hooks/useAnimation';
import { ThemeCard, ThemeTitle, ThemeText } from '@/components/ui/ThemeComponents';
import AddWordForm from '@/components/add-word-form';
import { Plus, Sparkles } from 'lucide-react';

const AddWordPage: React.FC = () => {
  const animation = useAnimation();
  
  return (
    <motion.div
      initial={animation.pageTransition.initial}
      animate={animation.pageTransition.animate}
      exit={animation.pageTransition.exit}
      transition={animation.pageTransition.transition}
      className="space-y-6"
    >
      {/* 頁面標題 */}
      <ThemeCard variant="default" className="ring-green-200/30 dark:ring-green-700/30">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <Plus className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <ThemeTitle level={2}>新增單字</ThemeTitle>
            <ThemeText variant="body">新增單字到您的學習清單</ThemeText>
          </div>
        </div>
        
        {/* AI 功能提示 */}
        <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200/30 dark:border-purple-700/30">
          <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">AI 智能助手</span>
          </div>
          <ThemeText variant="small" className="mt-1 text-purple-600 dark:text-purple-300">
            我們的 AI 會自動為您的單字提供發音、定義、例句和同義詞等完整資訊
          </ThemeText>
        </div>
      </ThemeCard>

      {/* 新增單字表單 */}
      <ThemeCard>
        <AddWordForm />
      </ThemeCard>
    </motion.div>
  );
};

export default AddWordPage;