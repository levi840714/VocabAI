import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVocabulary } from '@/hooks/use-vocabulary';
import StructuredWordDisplay from '@/components/StructuredWordDisplay';
import { ArrowLeft, Brain, Edit, Trash2, Volume2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const WordDetailPage: React.FC = () => {
  const { wordId } = useParams<{ wordId: string }>();
  const navigate = useNavigate();
  const { words, toggleLearned, deleteWord } = useVocabulary();

  const word = words.find(w => w.id === wordId);

  // 確保頁面載入時滾動到頂部
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [wordId]);

  if (!word) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center h-64"
      >
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-700 mb-2">找不到單字</h2>
          <p className="text-slate-500 mb-4">此單字可能已被刪除或不存在</p>
          <Button onClick={() => navigate('/vocabulary')} variant="outline">
            返回單字列表
          </Button>
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

  const handlePronunciation = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.term);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    } else {
      window.open(`https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word.term)}`, '_blank');
    }
  };

  const handleDictionaryOpen = () => {
    const url = `https://www.vocabulary.com/dictionary/${encodeURIComponent(word.term)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* 單字標題和基本資訊 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-blue-200/30">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-3xl font-bold text-slate-900">{word.term}</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePronunciation}
                className="p-2 hover:bg-blue-100"
              >
                <Volume2 className="w-5 h-5 text-blue-600" />
              </Button>
            </div>
            
            {word.pronunciation && (
              <p className="text-slate-600 text-lg mb-2">/{word.pronunciation}/</p>
            )}
            
            <div className="flex items-center space-x-2 mb-3">
              <Badge variant={word.learned ? "default" : "secondary"}>
                {word.learned ? "已掌握" : "學習中"}
              </Badge>
              {word.dateAdded && (
                <Badge variant="outline">
                  {new Date(word.dateAdded).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </div>
          
          {/* 右上角標記掌握按鈕 */}
          <button
            onClick={handleToggleLearned}
            className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 transition-colors ${
              word.learned 
                ? "border-orange-500 text-orange-600 bg-orange-50 hover:bg-orange-100" 
                : "border-blue-500 text-blue-600 bg-blue-50 hover:bg-blue-100"
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
        </div>

        {/* 操作按鈕 */}
        <div className="space-y-3">
          
          {/* 小方框按鈕組 */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={handleAIAnalysis}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-purple-600 text-purple-600 hover:bg-purple-50 transition-colors"
              title="AI 解析"
            >
              <Brain className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">AI 解析</span>
            </button>

            <button
              onClick={handleDictionaryOpen}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-green-600 text-green-600 hover:bg-green-50 transition-colors"
              title="字典"
            >
              <ExternalLink className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">字典</span>
            </button>
            
            <button
              onClick={handleDelete}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-red-600 text-red-600 hover:bg-red-50 transition-colors"
              title="刪除單字"
            >
              <Trash2 className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">刪除</span>
            </button>
          </div>
        </div>
      </div>

      {/* 詳細資訊 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm ring-1 ring-slate-200/30 overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">詳細資訊</h2>
          {word.structured_data ? (
            <StructuredWordDisplay
              data={word.structured_data}
              onAIAnalysisClick={handleAIAnalysis}
              showFullDetails={true}
            />
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">定義</h3>
                <p className="text-slate-700">{word.definition}</p>
              </div>
              {word.example && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">例句</h3>
                  <p className="text-slate-700 italic">"{word.example}"</p>
                </div>
              )}
              {word.raw_explanation && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">AI 解釋</h3>
                  <p className="text-slate-700 whitespace-pre-wrap">{word.raw_explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 用戶備註 */}
      {word.user_notes && (
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-amber-200/30">
          <h3 className="text-lg font-semibold text-slate-900 mb-3 flex items-center">
            <Edit className="w-5 h-5 mr-2 text-amber-600" />
            我的筆記
          </h3>
          <p className="text-slate-700 leading-relaxed">{word.user_notes}</p>
        </div>
      )}
    </motion.div>
  );
};

export default WordDetailPage;