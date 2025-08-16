import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { useAnimation } from '@/hooks/useAnimation';
import { useVoice } from '@/hooks/useVoice';
import { useSettings } from '@/contexts/SettingsContext';
import { useClickableTextContext } from '@/contexts/ClickableTextContext';
import { ThemeCard, ThemeTitle, ThemeText, ThemeButton } from '@/components/ui/ThemeComponents';
import StructuredWordDisplay from '@/components/StructuredWordDisplay';
import { Brain, Edit, Trash2, Volume2, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { memWhizAPI, type WordDetail } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import PullToRefresh from '@/components/PullToRefresh';

const WordDetailPage: React.FC = () => {
  const { wordId } = useParams<{ wordId: string }>();
  const navigate = useNavigate();
  const { words, toggleLearned, deleteWord, refreshWords } = useVocabulary();
  const animation = useAnimation();
  const { autoSpeakWord, speakWord } = useVoice();
  const { isVoiceAutoPlay, shouldShowPronunciation } = useSettings();
  const { setCallbacks } = useClickableTextContext();
  const { toast } = useToast();

  // 本地狀態管理
  const [word, setWord] = useState<WordDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 首先嘗試從本地 words 列表獲取
  const localWord = words.find(w => w.id === wordId);

  // 獨立獲取單字詳情
  const fetchWordDetail = async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 如果本地有數據，先使用本地數據
      if (localWord) {
        setWord(localWord as WordDetail);
      }
      
      // 同時從 API 獲取最新數據
      const wordDetail = await memWhizAPI.getWordById(parseInt(id));
      setWord(wordDetail);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '獲取單字詳情失敗';
      setError(errorMessage);
      
      // 如果 API 失敗但有本地數據，使用本地數據
      if (localWord) {
        setWord(localWord as WordDetail);
        toast({
          title: "網路連接問題",
          description: "顯示本地快取數據，某些資訊可能不是最新的",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 主要數據獲取 Effect
  useEffect(() => {
    if (wordId) {
      fetchWordDetail(wordId);
    }
  }, [wordId]);

  // 確保頁面載入時滾動到頂部並自動播放語音
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 自動播放語音（如果啟用）
    if (word && word.word && isVoiceAutoPlay) {
      // 稍微延遲以確保頁面已渲染
      const timer = setTimeout(() => {
        autoSpeakWord(word.word);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [word, autoSpeakWord, isVoiceAutoPlay]);

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

  // 載入狀態
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center h-64"
      >
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600 dark:text-blue-400" />
          <ThemeTitle level={3} className="mb-2">載入中...</ThemeTitle>
          <ThemeText variant="body">正在獲取單字詳情</ThemeText>
        </div>
      </motion.div>
    );
  }

  // 錯誤狀態
  if (error && !word) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center h-64"
      >
        <div className="text-center">
          <AlertCircle className="h-8 w-8 mx-auto mb-4 text-red-600 dark:text-red-400" />
          <ThemeTitle level={3} className="mb-2">載入失敗</ThemeTitle>
          <ThemeText variant="body" className="mb-4">{error}</ThemeText>
          <div className="flex gap-2 justify-center">
            <ThemeButton onClick={() => fetchWordDetail(wordId!)} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              重試
            </ThemeButton>
            <ThemeButton onClick={() => navigate('/vocabulary')} variant="outline">
              返回單字列表
            </ThemeButton>
          </div>
        </div>
      </motion.div>
    );
  }

  // 找不到單字
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
    if (window.confirm(`確定要刪除「${word.word}」嗎？`)) {
      try {
        await deleteWord(word.id);
        navigate('/vocabulary');
      } catch (error) {
        console.error('刪除單字失敗:', error);
        toast({
          title: "刪除失敗",
          description: "無法刪除單字，請稍後再試",
          variant: "destructive"
        });
      }
    }
  };

  const handleToggleLearned = async () => {
    try {
      const result = await memWhizAPI.toggleWordLearned(word.id);
      
      // 更新本地狀態
      setWord(prev => prev ? { ...prev, learned: !prev.learned } : null);
      
      // 也刷新 vocabulary hook 中的數據
      await refreshWords();
      
      toast({
        title: "狀態更新成功",
        description: result.message,
      });
    } catch (error) {
      console.error('更新學習狀態失敗:', error);
      toast({
        title: "更新失敗",
        description: "無法更新學習狀態，請稍後再試",
        variant: "destructive"
      });
    }
  };

  const handleAIAnalysis = () => {
    navigate(`/ai-analysis?word=${encodeURIComponent(word.word)}`);
  };

  const handleSentenceAnalysis = (sentence: string) => {
    console.log('💾 詞彙詳情頁：跳轉句子分析', sentence);
    navigate('/ai-analysis', {
      replace: false,
      state: {
        directSentenceAnalysis: sentence
      }
    });
  };

  // 手動刷新功能
  const handleRefresh = async () => {
    if (wordId) {
      await fetchWordDetail(wordId);
      toast({
        title: "刷新成功",
        description: "單字詳情已更新",
      });
    }
  };

  const handlePronunciation = async () => {
    await speakWord(word.word);
  };

  const handleDictionaryOpen = () => {
    const url = `https://www.vocabulary.com/dictionary/${encodeURIComponent(word.word)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
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
        className="space-y-6 max-w-4xl mx-auto"
      >
      {/* 單字標題和基本資訊 */}
      <ThemeCard className="relative ring-blue-200/30 dark:ring-blue-700/30">
        {/* 操作按鈕 - 移到左上角 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={handleRefresh}
            className="flex flex-col items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="刷新"
          >
            <RefreshCw className="w-4 h-4 md:w-5 md:h-5 mb-0.5" />
            <span className="text-xs font-medium">刷新</span>
          </button>

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
          <div className="relative inline-block mb-2">
            <ThemeTitle level={1} className="text-2xl md:text-3xl text-center">{word.word}</ThemeTitle>
            <button
              onClick={handlePronunciation}
              className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-transparent hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-transparent"
              aria-label="聆聽單字發音"
              title="聆聽單字發音"
              type="button"
            >
              <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
            </button>
          </div>
          
          <div className="flex items-center justify-center space-x-2 mb-3">
            <Badge variant={word.learned ? "default" : "secondary"} className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
              {word.learned ? "已掌握" : "學習中"}
            </Badge>
            {word.created_at && (
              <Badge variant="outline" className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300">
                {new Date(word.created_at).toLocaleDateString()}
              </Badge>
            )}
            {word.next_review && (
              <Badge variant="outline" className="border-emerald-300 dark:border-emerald-600 text-emerald-600 dark:text-emerald-300">
                下次複習: {new Date(word.next_review).toLocaleDateString()}
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
          {word.initial_ai_explanation ? (() => {
            try {
              // 解析 JSON 字串為物件
              const parsedData = JSON.parse(word.initial_ai_explanation);
              return (
                <StructuredWordDisplay
                  data={parsedData}
                  onAIAnalysisClick={handleAIAnalysis}
                  onWordAdded={(addedWord) => {
                    console.log('✅ 單字詳情頁：單字已添加', addedWord);
                    // 可以在這裡添加刷新邏輯或其他處理
                  }}
                  showFullDetails={true}
                  onSentenceAnalysis={handleSentenceAnalysis}
                />
              );
            } catch (error) {
              console.error('解析 AI 解釋失敗:', error);
              return (
                <div className="text-center py-8">
                  <ThemeText variant="body" className="text-slate-600 dark:text-slate-400 mb-4">
                    解釋資料格式錯誤
                  </ThemeText>
                  <ThemeButton onClick={handleAIAnalysis} variant="outline">
                    <Brain className="h-4 w-4 mr-2" />
                    重新獲取 AI 解析
                  </ThemeButton>
                </div>
              );
            }
          })() : (
            <div className="text-center py-8">
              <ThemeText variant="body" className="text-slate-600 dark:text-slate-400 mb-4">
                暫無詳細解釋
              </ThemeText>
              <ThemeButton onClick={handleAIAnalysis} variant="outline">
                <Brain className="h-4 w-4 mr-2" />
                獲取 AI 解析
              </ThemeButton>
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
    </PullToRefresh>
  );
};

export default WordDetailPage;
