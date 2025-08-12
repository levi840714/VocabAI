import React from 'react';
import { motion } from 'framer-motion';
import AddWordForm from '@/components/add-word-form';
import { Plus, Sparkles } from 'lucide-react';

const AddWordPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* 頁面標題 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-green-200/30">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Plus className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">新增單字</h1>
            <p className="text-slate-600">新增單字到您的學習清單</p>
          </div>
        </div>
        
        {/* AI 功能提示 */}
        <div className="mt-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200/30">
          <div className="flex items-center space-x-2 text-purple-700">
            <Sparkles className="w-5 h-5" />
            <span className="font-medium">AI 智能助手</span>
          </div>
          <p className="text-sm text-purple-600 mt-1">
            我們的 AI 會自動為您的單字提供發音、定義、例句和同義詞等完整資訊
          </p>
        </div>
      </div>

      {/* 新增單字表單 */}
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/30">
        <AddWordForm />
      </div>
    </motion.div>
  );
};

export default AddWordPage;