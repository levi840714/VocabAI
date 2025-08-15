import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookmarkCheck, Calendar, Edit3, Save, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { memWhizAPI } from '../lib/api';
import { BookmarkResponse } from '../lib/types';
import { ThemeCard, ThemeTitle, ThemeText, ThemeButton } from '../components/ui/ThemeComponents';
import { useAnimation } from '../hooks/useAnimation';
import { useClickableTextContext } from '../contexts/ClickableTextContext';
import DailyDiscoveryContent from '../components/DailyDiscoveryContent';


export default function BookmarkDetailPage() {
  const navigate = useNavigate();
  const { bookmarkId } = useParams<{ bookmarkId: string }>();
  const animation = useAnimation();
  const { setCallbacks } = useClickableTextContext();
  
  const [bookmarkData, setBookmarkData] = useState<BookmarkResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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


  // 獲取特定收藏的詳細信息
  const fetchBookmarkDetail = useCallback(async () => {
    if (!bookmarkId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // 直接獲取收藏詳情
      const bookmark = await memWhizAPI.getBookmarkDetail(parseInt(bookmarkId));
      
      if (!bookmark) {
        setError('找不到該收藏內容');
        return;
      }
      
      setBookmarkData(bookmark);
      setNotesValue(bookmark.personal_notes || '');
    } catch (err) {
      console.error('獲取收藏詳情失敗:', err);
      setError(err instanceof Error ? err.message : '獲取收藏詳情失敗');
    } finally {
      setLoading(false);
    }
  }, [bookmarkId]);

  useEffect(() => {
    fetchBookmarkDetail();
  }, [fetchBookmarkDetail]);

  // 保存筆記
  const handleSaveNotes = async () => {
    if (!bookmarkData) return;
    
    setSavingNotes(true);
    try {
      await memWhizAPI.updateBookmarkNotes(bookmarkData.id, notesValue);
      setBookmarkData({
        ...bookmarkData,
        personal_notes: notesValue
      });
      setEditingNotes(false);
    } catch (error) {
      console.error('保存筆記失敗:', error);
    } finally {
      setSavingNotes(false);
    }
  };

  // 取消編輯筆記
  const handleCancelEdit = () => {
    setNotesValue(bookmarkData?.personal_notes || '');
    setEditingNotes(false);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <ThemeCard className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <ThemeText>正在載入收藏內容...</ThemeText>
        </ThemeCard>
      </div>
    );
  }

  if (error || !bookmarkData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <ThemeCard className="text-center">
          <ThemeText className="text-red-500 dark:text-red-400 mb-4">
            {error || '收藏內容不存在'}
          </ThemeText>
          <ThemeButton 
            onClick={() => navigate('/bookmarks')}
            variant="primary"
          >
            返回收藏列表
          </ThemeButton>
        </ThemeCard>
      </div>
    );
  }

  const { discovery } = bookmarkData;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-b sticky top-0 z-10">
        <div className="flex items-center p-4">
          <motion.button
            onClick={() => navigate('/bookmarks')}
            className="mr-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex-1">
            <ThemeTitle level={3}>收藏內容</ThemeTitle>
            <ThemeText variant="caption" size="sm">
              <Calendar className="inline h-3 w-3 mr-1" />
              {formatDate(discovery.content_date)}
            </ThemeText>
          </div>
          <div className="flex items-center gap-2">
            <BookmarkCheck className="h-5 w-5 text-yellow-500" />
            <ThemeText variant="caption" size="sm">
              已收藏
            </ThemeText>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Daily Discovery Content */}
        <DailyDiscoveryContent 
          discoveryData={discovery}
          showBookmarkButton={false}
        />

        {/* Personal Notes Section */}
        <ThemeCard variant="solid">
          <div className="flex items-center justify-between mb-4">
            <ThemeTitle level={3}>個人筆記</ThemeTitle>
            {!editingNotes && (
              <ThemeButton
                onClick={() => setEditingNotes(true)}
                variant="outline"
                size="sm"
              >
                <Edit3 className="h-4 w-4 mr-1" />
                編輯
              </ThemeButton>
            )}
          </div>
          
          {editingNotes ? (
            <div className="space-y-4">
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="在此添加您的學習筆記..."
                className="w-full h-32 p-3 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex items-center gap-2">
                <ThemeButton
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  variant="primary"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-1" />
                  {savingNotes ? '保存中...' : '保存'}
                </ThemeButton>
                <ThemeButton
                  onClick={handleCancelEdit}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  取消
                </ThemeButton>
              </div>
            </div>
          ) : (
            <div>
              {bookmarkData.personal_notes ? (
                <ThemeText className="whitespace-pre-line">
                  {bookmarkData.personal_notes}
                </ThemeText>
              ) : (
                <ThemeText variant="caption" className="italic text-slate-500 dark:text-slate-400">
                  還沒有添加筆記，點擊「編輯」開始記錄您的想法...
                </ThemeText>
              )}
            </div>
          )}
        </ThemeCard>

        {/* Meta Information */}
        <ThemeCard variant="outline" className="text-center">
          <ThemeText variant="caption">
            收藏於 {formatDate(bookmarkData.created_at)} • 
            來源日期 {formatDate(discovery.content_date)}
          </ThemeText>
        </ThemeCard>
      </div>
    </div>
  );
}