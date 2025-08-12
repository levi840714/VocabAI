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
      className="space-y-6"
    >
      {/* 頁面標題 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-purple-200/30">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">智能複習</h1>
            <p className="text-slate-600">基於科學的間隔重複算法提升記憶效果</p>
          </div>
        </div>
        
        {/* 學習提示 */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200/30">
            <div className="flex items-center space-x-2 text-blue-700 mb-2">
              <Target className="w-5 h-5" />
              <span className="font-medium">學習策略</span>
            </div>
            <p className="text-sm text-blue-600">
              根據您的記憶曲線智能推薦最適合複習的單字
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200/30">
            <div className="flex items-center space-x-2 text-green-700 mb-2">
              <Zap className="w-5 h-5" />
              <span className="font-medium">效率提升</span>
            </div>
            <p className="text-sm text-green-600">
              專注於您最需要加強的單字，節省學習時間
            </p>
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