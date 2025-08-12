import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import StudyMode from '@/components/study-mode';
import { Brain, Target, Zap } from 'lucide-react';

const StudyPage: React.FC = () => {
  const navigate = useNavigate();

  const handleAIAnalysis = (word: string) => {
    navigate(`/ai-analysis?word=${encodeURIComponent(word)}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-3 md:space-y-6"
    >
      {/* 頁面標題 - 精簡設計 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 md:p-4 shadow-sm ring-1 ring-purple-200/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="w-4 h-4 md:w-5 md:h-5 text-purple-600" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-bold text-slate-900">智能複習</h1>
            </div>
          </div>
          
          {/* 精簡學習提示 - 橫向排列 */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              <Target className="w-3 h-3" />
              <span className="whitespace-nowrap">智能推薦</span>
            </div>
            <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full">
              <Zap className="w-3 h-3" />
              <span className="whitespace-nowrap">高效學習</span>
            </div>
          </div>
        </div>
      </div>

      {/* 複習模式 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm ring-1 ring-slate-200/30 overflow-hidden">
        <StudyMode onAIAnalysisClick={handleAIAnalysis} />
      </div>
    </motion.div>
  );
};

export default StudyPage;