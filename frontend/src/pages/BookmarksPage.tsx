import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookmarkCheck, Calendar, Filter, Search, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { memWhizAPI } from '../lib/api';
import { BookmarkSummaryListResponse, BookmarkSummary } from '../lib/types';
import { ThemeCard, ThemeTitle, ThemeText, ThemeButton } from '../components/ui/ThemeComponents';
import { useAnimation } from '../hooks/useAnimation';
import { useClickableText } from '../hooks/useClickableText';
import { useClickableTextContext } from '../contexts/ClickableTextContext';

// 類型顏色（保留於卡片顯示，不作為篩選）
const TYPE_BADGE_COLORS: Record<string, string> = {
  full: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
  knowledge_point: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
  article_section: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
  discussion: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400'
};

// 類型中文標籤（顯示用途）
const TYPE_BADGE_LABELS: Record<string, string> = {
  full: '完整文章',
  knowledge_point: '知識重點',
  article_section: '文章段落',
  discussion: '討論問題'
};

export default function BookmarksPage() {
  const navigate = useNavigate();
  const animation = useAnimation();
  const { makeTextClickable } = useClickableText();
  const { setCallbacks } = useClickableTextContext();
  
  const [bookmarks, setBookmarks] = useState<BookmarkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 內容類型篩選：all/article/conversation
  const [contentFilter, setContentFilter] = useState<'all' | 'article' | 'conversation'>('all');
  // 時間篩選：以內容日期 content_date 為準
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const pageSize = 10;

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

  const fetchBookmarks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 後端篩選 + 分頁
      const data = await memWhizAPI.getBookmarks({
        contentType: contentFilter === 'all' ? undefined : contentFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page: currentPage,
        pageSize,
      });
      
      setBookmarks(data.bookmarks);
      setTotalCount(data.total_count);
    } catch (err) {
      console.error('獲取收藏失敗:', err);
      setError(err instanceof Error ? err.message : '獲取收藏失敗');
    } finally {
      setLoading(false);
    }
  }, [contentFilter, startDate, endDate, currentPage, pageSize]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handleContentFilter = (type: 'all' | 'article' | 'conversation') => {
    setContentFilter(type);
    setCurrentPage(0);
  };

  const handleRemoveBookmark = async (bookmarkId: number, discoveryId: number, bookmarkType: string) => {
    try {
      await memWhizAPI.deleteBookmark(discoveryId, bookmarkType);
      // 重新獲取收藏列表
      fetchBookmarks();
    } catch (error) {
      console.error('移除收藏失敗:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredBookmarks = bookmarks.filter(bookmark => {
    if (!searchTerm) return true;
    return bookmark.article_title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <ThemeCard className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <ThemeText>正在載入收藏...</ThemeText>
        </ThemeCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <ThemeCard className="text-center">
          <ThemeText className="text-red-500 dark:text-red-400 mb-4">載入失敗: {error}</ThemeText>
          <ThemeButton 
            onClick={() => window.location.reload()}
            variant="primary"
          >
            重新載入
          </ThemeButton>
        </ThemeCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-b sticky top-0 z-10">
        <div className="flex items-center p-4">
          <motion.button
            onClick={() => navigate('/')}
            className="mr-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex-1">
            <ThemeTitle level={3}>我的收藏</ThemeTitle>
            <ThemeText variant="caption" size="sm">
              {totalCount} 項收藏
            </ThemeText>
          </div>
          <motion.button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
            aria-expanded={showFilters}
            aria-label="開啟/關閉篩選"
          >
            <Filter className="h-5 w-5" />
          </motion.button>
        </div>
        
        {/* Filters */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-200 dark:border-slate-700 p-4"
          >
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋收藏內容..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* 內容類型篩選 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {([
                ['all', '全部'], 
                ['article', '精選文章'], 
                ['conversation', '實用對話']
              ] as const).map(([key, label]) => (
                <motion.button
                  key={key}
                  onClick={() => handleContentFilter(key)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    contentFilter === key 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                  }`}
                  whileHover={animation.hover}
                  whileTap={animation.tap}
                >
                  {label}
                </motion.button>
              ))}
            </div>

            {/* 日期範圍（依內容日期） */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              {/* 起始日期 */}
              <div className="flex flex-col">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" /> 起始日期
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setCurrentPage(0); }}
                    className="h-9 w-full sm:w-56 pl-9 pr-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              {/* 結束日期 */}
              <div className="flex flex-col">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">結束日期</label>
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setCurrentPage(0); }}
                    className="h-9 w-full sm:w-56 pl-3 pr-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="flex items-end">
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); setCurrentPage(0); }}
                    className="h-9 px-3 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 transition-colors"
                  >
                    清除日期
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {filteredBookmarks.length === 0 ? (
          <ThemeCard className="text-center py-12">
            <Archive className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <ThemeTitle level={4} className="mb-2">沒有收藏內容</ThemeTitle>
            <ThemeText variant="caption">
              {searchTerm ? '沒有符合搜尋條件的收藏' : '開始收藏您感興趣的每日探索內容吧！'}
            </ThemeText>
            {!searchTerm && (
              <ThemeButton 
                onClick={() => navigate('/daily-discovery')}
                variant="primary"
                className="mt-4"
              >
                探索今日內容
              </ThemeButton>
            )}
          </ThemeCard>
        ) : (
          <>
            {filteredBookmarks.map((bookmark, index) => (
              <motion.div
                key={bookmark.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <ThemeCard variant="solid" className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            TYPE_BADGE_COLORS[bookmark.bookmark_type] ||
                            'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                          title={bookmark.bookmark_type}
                        >
                          {TYPE_BADGE_LABELS[bookmark.bookmark_type] || bookmark.bookmark_type}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bookmark.content_type === 'conversation' 
                            ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
                            : 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400'
                        }`}>
                          {bookmark.content_type === 'conversation' ? '實用對話' : '精選文章'}
                        </span>
                        <ThemeText variant="caption" size="sm">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {formatDate(bookmark.content_date)}
                        </ThemeText>
                      </div>
                      
                      {makeTextClickable(
                        <ThemeTitle level={4} className="mb-3 clickable-text-content">
                          {bookmark.article_title}
                        </ThemeTitle>
                      )}
                      
                      {bookmark.personal_notes && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
                          <ThemeText size="sm" className="text-yellow-800 dark:text-yellow-200">
                            📝 {bookmark.personal_notes}
                          </ThemeText>
                        </div>
                      )}
                      
                      <ThemeText variant="body" className="line-clamp-2 text-slate-600 dark:text-slate-400">
                        點擊「查看完整內容」以查看詳細的文章內容、知識點和學習目標...
                      </ThemeText>
                    </div>
                    
                    <motion.button
                      onClick={() => handleRemoveBookmark(bookmark.id, bookmark.discovery_id, bookmark.bookmark_type)}
                      className="ml-4 p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      whileHover={animation.hover}
                      whileTap={animation.tap}
                      title="移除收藏"
                    >
                      <BookmarkCheck className="h-5 w-5" />
                    </motion.button>
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                    <ThemeText variant="caption" size="sm">
                      收藏於 {formatDate(bookmark.created_at)}
                    </ThemeText>
                    <ThemeButton
                      onClick={() => navigate(`/bookmarks/${bookmark.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      查看完整內容
                    </ThemeButton>
                  </div>
                </ThemeCard>
              </motion.div>
            ))}
            
            {/* Pagination */}
            {totalPages > 1 && (
              <ThemeCard className="flex items-center justify-center gap-4 py-4">
                <ThemeButton
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  variant="outline"
                  size="sm"
                >
                  上一頁
                </ThemeButton>
                
                <ThemeText variant="caption">
                  第 {currentPage + 1} 頁，共 {totalPages} 頁
                </ThemeText>
                
                <ThemeButton
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1}
                  variant="outline"
                  size="sm"
                >
                  下一頁
                </ThemeButton>
              </ThemeCard>
            )}
          </>
        )}
      </div>
    </div>
  );
}
