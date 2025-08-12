import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import VocabularyList from '@/components/vocabulary-list';

const VocabularyPage: React.FC = () => {
  const navigate = useNavigate();

  const handleAIAnalysis = (word: string) => {
    navigate(`/ai-analysis?word=${encodeURIComponent(word)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* 頁面標題 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-blue-200/30">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">我的單字庫</h1>
          <p className="text-slate-600 mt-1">管理和瀏覽您的個人單字收藏</p>
        </div>
      </div>

      {/* 單字列表 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm ring-1 ring-slate-200/30 overflow-hidden">
        <VocabularyList 
          onAIAnalysisClick={handleAIAnalysis}
        />
      </div>
    </motion.div>
  );
};

export default VocabularyPage;