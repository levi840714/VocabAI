import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAnimation } from '@/hooks/useAnimation';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { useToast } from '@/hooks/use-toast';
import { ThemeCard, ThemeTitle, ThemeText } from '@/components/ui/ThemeComponents';
import VocabularyList from '@/components/vocabulary-list';
import PullToRefresh from '@/components/PullToRefresh';

const VocabularyPage: React.FC = () => {
  const navigate = useNavigate();
  const animation = useAnimation();
  const { refreshWords } = useVocabulary();
  const { toast } = useToast();

  const handleAIAnalysis = (word: string) => {
    navigate(`/ai-analysis?word=${encodeURIComponent(word)}`);
  };

  const handleRefresh = async () => {
    try {
      await refreshWords();
      toast({
        title: "刷新成功",
        description: "單字列表已更新",
      });
    } catch (error) {
      toast({
        title: "刷新失敗",
        description: "無法更新單字列表，請稍後再試",
        variant: "destructive"
      });
    }
  };

  return (
    <PullToRefresh
      onRefresh={handleRefresh}
      enabled={true}
      threshold={80}
      className="min-h-screen"
    >
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
    </PullToRefresh>
  );
};

export default VocabularyPage;