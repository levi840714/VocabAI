import React from 'react';
import { motion } from 'framer-motion';
import ProgressTracker from '@/components/progress-tracker';
import { TrendingUp, BarChart3, Calendar } from 'lucide-react';

const ProgressPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* 頁面標題 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-orange-200/30">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">學習進度</h1>
            <p className="text-slate-600">追蹤您的學習成果和進度統計</p>
          </div>
        </div>
        
        {/* 進度功能說明 */}
        <div className="mt-4 grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200/30">
            <div className="flex items-center space-x-2 text-blue-700 mb-2">
              <BarChart3 className="w-5 h-5" />
              <span className="font-medium">詳細統計</span>
            </div>
            <p className="text-sm text-blue-600">
              查看學習數據的圖表分析和趨勢變化
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200/30">
            <div className="flex items-center space-x-2 text-purple-700 mb-2">
              <Calendar className="w-5 h-5" />
              <span className="font-medium">歷史記錄</span>
            </div>
            <p className="text-sm text-purple-600">
              回顧您的學習歷程和成就里程碑
            </p>
          </div>
        </div>
      </div>

      {/* 進度追蹤器 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm ring-1 ring-slate-200/30 overflow-hidden">
        <ProgressTracker />
      </div>
    </motion.div>
  );
};

export default ProgressPage;