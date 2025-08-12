import React from 'react';
import { motion } from 'framer-motion';
import { useAnimation } from '@/hooks/useAnimation';
import { ThemeCard, ThemeTitle, ThemeText } from '@/components/ui/ThemeComponents';
import ProgressTracker from '@/components/progress-tracker';
import { TrendingUp, BarChart3, Calendar } from 'lucide-react';

const ProgressPage: React.FC = () => {
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
      <ThemeCard className="ring-orange-200/30 dark:ring-orange-700/30">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <ThemeTitle level={2}>學習進度</ThemeTitle>
            <ThemeText variant="body">追蹤您的學習成果和進度統計</ThemeText>
          </div>
        </div>
        
        {/* 進度功能說明 */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-blue-200/30 dark:border-blue-700/30">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300 mb-2">
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">詳細統計</span>
            </div>
            <ThemeText variant="small" className="text-blue-600 dark:text-blue-300">
              查看學習數據的圖表分析和趨勢變化
            </ThemeText>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200/30 dark:border-purple-700/30">
            <div className="flex items-center space-x-2 text-purple-700 dark:text-purple-300 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">歷史記錄</span>
            </div>
            <ThemeText variant="small" className="text-purple-600 dark:text-purple-300">
              回顧您的學習歷程和成就里程碑
            </ThemeText>
          </div>
        </div>
      </ThemeCard>

      {/* 進度追蹤器 */}
      <ThemeCard variant="default" className="overflow-hidden">
        <ProgressTracker />
      </ThemeCard>
    </motion.div>
  );
};

export default ProgressPage;