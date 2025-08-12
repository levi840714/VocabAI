import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAnimation } from '@/hooks/useAnimation';
import { ThemeCard, ThemeTitle, ThemeText } from '@/components/ui/ThemeComponents';
import VocabularyList from '@/components/vocabulary-list';

const VocabularyPage: React.FC = () => {
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
      className="space-y-6"
    >
      {/* 頁面標題 */}
      <ThemeCard>
        <div>
          <ThemeTitle level={2}>我的單字庫</ThemeTitle>
          <ThemeText variant="body" className="mt-1">管理和瀏覽您的個人單字收藏</ThemeText>
        </div>
      </ThemeCard>

      {/* 單字列表 */}
      <ThemeCard variant="default" className="overflow-hidden">
        <VocabularyList 
          onAIAnalysisClick={handleAIAnalysis}
        />
      </ThemeCard>
    </motion.div>
  );
};

export default VocabularyPage;