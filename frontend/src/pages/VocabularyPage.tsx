import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import VocabularyList from '@/components/vocabulary-list';
import { Plus } from 'lucide-react';

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
      {/* 頁面標題和操作 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-blue-200/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">我的單字庫</h1>
            <p className="text-slate-600 mt-1">管理和瀏覽您的個人單字收藏</p>
          </div>
          
          <motion.button
            onClick={() => navigate('/add-word')}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-4 h-4" />
            <span>新增單字</span>
          </motion.button>
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