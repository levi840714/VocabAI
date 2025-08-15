import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { memWhizAPI } from '../lib/api';
import { DailyDiscoveryResponse } from '../lib/types';
import { ThemeCard, ThemeTitle, ThemeText } from '../components/ui/ThemeComponents';
import { useAnimation } from '../hooks/useAnimation';
import { useClickableTextContext } from '../contexts/ClickableTextContext';
import DailyDiscoveryContent from '../components/DailyDiscoveryContent';

export default function DailyDiscoveryPage() {
  const navigate = useNavigate();
  const animation = useAnimation();
  const { setCallbacks } = useClickableTextContext();
  
  const [discoveryData, setDiscoveryData] = useState<DailyDiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<'article' | 'conversation' | null>(null);

  // 處理深度分析
  const handleDeepAnalysis = useCallback((word: string) => {
    console.log(`🧠 開始深度分析: ${word}`);
    navigate('/ai-analysis', { 
      state: { 
        initialWord: word,
        analysisType: 'deep'
      }
    });
  }, [navigate]);

  // 註冊全域回調函數
  useEffect(() => {
    setCallbacks({
      onDeepAnalysis: handleDeepAnalysis,
      onAIAnalysisClick: handleDeepAnalysis
    });
  }, [setCallbacks, handleDeepAnalysis]);

  // 獲取每日探索內容
  const fetchDailyDiscovery = useCallback(async (type?: 'article' | 'conversation') => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await memWhizAPI.getDailyDiscovery(undefined, type);
      setDiscoveryData(data);
      if (type) {
        setContentType(type);
      }
    } catch (err) {
      console.error('獲取每日探索失敗:', err);
      setError(err instanceof Error ? err.message : '獲取每日探索失敗');
    } finally {
      setLoading(false);
    }
  }, []);

  // 收藏更新回調 - 只更新收藏狀態，不重新載入頁面
  const handleBookmarkUpdate = useCallback(() => {
    if (discoveryData) {
      // 直接切換收藏狀態，避免重新載入
      setDiscoveryData(prev => prev ? {
        ...prev,
        is_bookmarked: !prev.is_bookmarked
      } : null);
    }
  }, [discoveryData]);

  useEffect(() => {
    fetchDailyDiscovery();
  }, [fetchDailyDiscovery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <ThemeCard className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <ThemeText>正在載入今日探索...</ThemeText>
        </ThemeCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <ThemeCard className="text-center">
          <ThemeText className="text-red-500 dark:text-red-400 mb-4">載入失敗: {error}</ThemeText>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            重新載入
          </button>
        </ThemeCard>
      </div>
    );
  }

  if (!discoveryData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <ThemeCard className="text-center">
          <ThemeText>沒有可用的探索內容</ThemeText>
        </ThemeCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center">
            <motion.button
              onClick={() => navigate('/')}
              className="mr-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              whileHover={animation.hover}
              whileTap={animation.tap}
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
            <div>
              <ThemeTitle level={3}>每日探索</ThemeTitle>
              <ThemeText variant="caption" size="sm">
                {new Date(discoveryData.content_date).toLocaleDateString('zh-TW', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </ThemeText>
            </div>
          </div>
          
          {/* Content Type Switcher */}
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => fetchDailyDiscovery('article')}
              disabled={loading}
              className={`p-2 rounded-lg transition-colors ${
                discoveryData.content_type === 'article'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
              whileHover={!loading ? animation.hover : {}}
              whileTap={!loading ? animation.tap : {}}
              title="精選文章"
            >
              <BookOpen className="h-4 w-4" />
            </motion.button>
            <motion.button
              onClick={() => fetchDailyDiscovery('conversation')}
              disabled={loading}
              className={`p-2 rounded-lg transition-colors ${
                discoveryData.content_type === 'conversation'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
              whileHover={!loading ? animation.hover : {}}
              whileTap={!loading ? animation.tap : {}}
              title="實用對話"
            >
              <MessageCircle className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4">
        <DailyDiscoveryContent 
          discoveryData={discoveryData} 
          showBookmarkButton={true}
          onBookmarkUpdate={handleBookmarkUpdate}
        />
      </div>
    </div>
  );
}