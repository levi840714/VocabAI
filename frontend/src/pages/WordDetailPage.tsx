import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { useAnimation } from '@/hooks/useAnimation';
import { useVoice } from '@/hooks/useVoice';
import { useSettings } from '@/contexts/SettingsContext';
import { useClickableTextContext } from '@/contexts/ClickableTextContext';
import { ThemeCard, ThemeTitle, ThemeText, ThemeButton } from '@/components/ui/ThemeComponents';
import StructuredWordDisplay from '@/components/StructuredWordDisplay';
import { Brain, Edit, Trash2, Volume2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const WordDetailPage: React.FC = () => {
  const { wordId } = useParams<{ wordId: string }>();
  const navigate = useNavigate();
  const { words, toggleLearned, deleteWord } = useVocabulary();
  const animation = useAnimation();
  const { autoSpeakWord } = useVoice();
  const { isVoiceAutoPlay, shouldShowPronunciation } = useSettings();
  const { setCallbacks } = useClickableTextContext();

  const word = words.find(w => w.id === wordId);

  // 確保頁面載入時滾動到頂部並自動播放語音
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 自動播放語音（如果啟用）
    if (word && word.term && isVoiceAutoPlay) {
      // 稍微延遲以確保頁面已渲染
      const timer = setTimeout(() => {
        autoSpeakWord(word.term);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [wordId, word, autoSpeakWord, isVoiceAutoPlay]);

  // 設置全域智能點擊回調
  useEffect(() => {
    setCallbacks({
      onWordAdded: (addedWord) => {
        console.log('✅ 單字詳情頁：單字已添加', addedWord);
        // 可以在這裡添加刷新邏輯或其他處理
      },
      onDeepAnalysis: (word) => {
        console.log('🧠 單字詳情頁：深度解析', word);
        navigate(`/ai-analysis?word=${encodeURIComponent(word)}`);
      },
      onAIAnalysisClick: (word) => {
        console.log('🔍 單字詳情頁：AI 解析點擊', word);
        navigate(`/ai-analysis?word=${encodeURIComponent(word)}`);
      }
    });
  }, [setCallbacks, navigate]);

  if (!word) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center h-64"
      >
        <div className="text-center">
          <ThemeTitle level={3} className="mb-2">找不到單字</ThemeTitle>
          <ThemeText variant="body" className="mb-4">此單字可能已被刪除或不存在</ThemeText>
          <ThemeButton onClick={() => navigate('/vocabulary')} variant="outline">
            返回單字列表
          </ThemeButton>
        </div>
      </motion.div>
    );
  }

  const handleDelete = async () => {
    if (window.confirm(`確定要刪除「${word.term}」嗎？`)) {
      try {
        await deleteWord(word.id);
        navigate('/vocabulary');
      } catch (error) {
        console.error('刪除單字失敗:', error);
      }
    }
  };

  const handleToggleLearned = async () => {
    try {
      await toggleLearned(word.id);
    } catch (error) {
      console.error('更新學習狀態失敗:', error);
    }
  };

  const handleAIAnalysis = () => {
    navigate(`/ai-analysis?word=${encodeURIComponent(word.term)}`);
  };

  const { speakWord } = useVoice();
  
  const handlePronunciation = async () => {
    await speakWord(word.term);
  };

  const handleDictionaryOpen = () => {
    const url = `https://www.vocabulary.com/dictionary/${encodeURIComponent(word.term)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={animation.pageTransition.initial}
      animate={animation.pageTransition.animate}
      exit={animation.pageTransition.exit}
      transition={animation.pageTransition.transition}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* 單字標題和基本資訊 */}
      <ThemeCard className="relative ring-blue-200/30 dark:ring-blue-700/30">
        {/* 操作按鈕 - 移到左上角 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={handleAIAnalysis}
            className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 border-purple-600 dark:border-purple-400 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
            title="AI 解析"
          >
            <Brain className="w-4 h-4 md:w-5 md:h-5 mb-0.5" />
            <span className="text-xs font-medium">AI 解析</span>
          </button>

          <button
            onClick={handleDictionaryOpen}
            className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 border-green-600 dark:border-green-400 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
            title="字典"
          >
            <ExternalLink className="w-4 h-4 md:w-5 md:h-5 mb-0.5" />
            <span className="text-xs font-medium">字典</span>
          </button>
          
          <button
            onClick={handleDelete}
            className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 border-red-600 dark:border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="刪除單字"
          >
            <Trash2 className="w-4 h-4 md:w-5 md:h-5 mb-0.5" />
            <span className="text-xs font-medium">刪除</span>
          </button>
        </div>

        {/* 單字標題和資訊 - 移到中下方並置中 */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <ThemeTitle level={1} className="text-2xl md:text-3xl">{word.term}</ThemeTitle>
            <ThemeButton
              variant="ghost"
              size="sm"
              onClick={handlePronunciation}
              className="p-2"
            >
              <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
            </ThemeButton>
          </div>
          
          {shouldShowPronunciation && word.pronunciation && (
            <ThemeText variant="body" className="text-lg mb-2 font-mono">/{word.pronunciation}/</ThemeText>
          )}
          
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Badge variant={word.learned ? "default" : "secondary"} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {word.learned ? "已掌握" : "學習中"}
            </Badge>
            {word.dateAdded && (
              <Badge variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                {new Date(word.dateAdded).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>
        
        {/* 右上角固定的標記掌握按鈕 - 相對於整個卡片定位 */}
        <button
          onClick={handleToggleLearned}
          className={`absolute top-4 right-4 flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 transition-colors z-10 ${
            word.learned 
              ? "border-orange-500 dark:border-orange-400 text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30" 
              : "border-blue-500 dark:border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          }`}
          title={word.learned ? "標記為學習中" : "標記為已掌握"}
        >
          <span className="text-xs font-medium leading-tight">
            {word.learned ? "重新" : "標記"}
          </span>
          <span className="text-xs font-medium leading-tight">
            {word.learned ? "學習" : "掌握"}
          </span>
        </button>
      </ThemeCard>

      {/* 詳細資訊 */}
      <ThemeCard variant="default" className="overflow-hidden">
        <ThemeTitle level={2} className="mb-4">詳細資訊</ThemeTitle>
          {word.structured_data ? (
            <StructuredWordDisplay
              data={word.structured_data}
              onAIAnalysisClick={handleAIAnalysis}
              onWordAdded={(addedWord) => {
                console.log('✅ 單字詳情頁：單字已添加', addedWord);
                // 可以在這裡添加刷新邏輯或其他處理
              }}
              showFullDetails={true}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <ThemeTitle level={3} className="mb-2">定義</ThemeTitle>
                <ThemeText variant="body">{word.definition}</ThemeText>
              </div>
              {word.example && (
                <div>
                  <ThemeTitle level={3} className="mb-2">例句</ThemeTitle>
                  <ThemeText variant="body" className="italic">"{word.example}"</ThemeText>
                </div>
              )}
              {word.raw_explanation && (
                <div>
                  <ThemeTitle level={3} className="mb-2">AI 解釋</ThemeTitle>
                  <ThemeText variant="body" className="whitespace-pre-wrap">{word.raw_explanation}</ThemeText>
                </div>
              )}
            </div>
          )}
      </ThemeCard>

      {/* 用戶備註 */}
      {word.user_notes && (
        <ThemeCard className="ring-amber-200/30 dark:ring-amber-700/30">
          <ThemeTitle level={3} className="mb-3 flex items-center">
            <Edit className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
            我的筆記
          </ThemeTitle>
          <ThemeText variant="body" className="leading-relaxed">{word.user_notes}</ThemeText>
        </ThemeCard>
      )}
    </motion.div>
  );
};

export default WordDetailPage;