import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, Star, BookOpen, X, Loader2, Brain } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { Translation } from '../hooks/useClickableText';
import { voiceService } from '@/lib/voiceService';

interface QuickWordPopupProps {
  word: string;
  position: { x: number; y: number };
  translation: Translation | null;
  isLoading: boolean;
  isAddingWord?: boolean;
  isRemovingWord?: boolean;
  isWordInVocabulary?: boolean;
  onClose: () => void;
  onAddWord: (word: string) => void;
  onRemoveWord?: (word: string) => void;
  onDeepAnalysis: (word: string) => void;
}

const QuickWordPopup: React.FC<QuickWordPopupProps> = ({
  word,
  position,
  translation,
  isLoading,
  isAddingWord = false,
  isRemovingWord = false,
  isWordInVocabulary = false,
  onClose,
  onAddWord,
  onRemoveWord,
  onDeepAnalysis
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const [popupStyle, setPopupStyle] = useState<React.CSSProperties>({});

  // 處理 TTS 發音
  const handlePronunciation = async (text: string, event?: React.MouseEvent) => {
    // 阻止事件冒泡，避免觸發彈窗關閉
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    try {
      await voiceService.speak(text);
    } catch (error) {
      console.error('發音播放失敗:', error);
      alert('發音功能暫時不可用，請檢查瀏覽器設定或網路連線');
    }
  };

  // 改進的彈窗位置計算（平衡簡單性和正確性）
  const calculatePopupStyle = useCallback((): React.CSSProperties => {
    const padding = 16;
    const popupHeight = 300;
    const popupWidth = 280;
    const offset = 12;
    
    // 獲取視窗資訊
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 檢測設備類型
    const isMobile = viewportWidth <= 768;
    
    console.log('🎯 改進彈窗位置計算:', {
      click: { x: position.x, y: position.y },
      viewport: { width: viewportWidth, height: viewportHeight },
      device: isMobile ? 'mobile' : 'desktop'
    });
    
    // 水平位置：居中對齊點擊位置，但避開邊界
    let x = position.x - popupWidth / 2;
    x = Math.max(padding, Math.min(x, viewportWidth - popupWidth - padding));
    
    // 垂直位置：更智能的計算
    let y: number;
    
    if (isMobile) {
      // 手機版：考慮安全區域
      const safeTop = 80;  // 頂部安全區域（狀態欄+導航）
      const safeBottom = 100; // 底部安全區域（導航欄+手勢區）
      const availableHeight = viewportHeight - safeTop - safeBottom;
      
      // 嘗試在點擊位置上方
      const aboveY = position.y - popupHeight - offset;
      // 嘗試在點擊位置下方
      const belowY = position.y + offset;
      
      if (aboveY >= safeTop) {
        // 上方空間足夠
        y = aboveY;
      } else if (belowY + popupHeight <= viewportHeight - safeBottom) {
        // 下方空間足夠
        y = belowY;
      } else {
        // 上下都不夠，放在可用區域中央
        y = safeTop + Math.max(0, (availableHeight - popupHeight) / 2);
      }
      
      // 手機版最終邊界檢查
      y = Math.max(safeTop, Math.min(y, viewportHeight - popupHeight - safeBottom));
      
    } else {
      // 桌面版：保持原有的合理邏輯
      y = position.y - popupHeight - offset;
      
      if (y < padding) {
        // 上方空間不夠，嘗試下方
        y = position.y + offset;
        
        if (y + popupHeight > viewportHeight - padding) {
          // 下方也不夠，居中顯示
          y = Math.max(padding, (viewportHeight - popupHeight) / 2);
        }
      }
      
      // 桌面版邊界檢查
      y = Math.max(padding, Math.min(y, viewportHeight - popupHeight - padding));
    }
    
    console.log('✅ 最終位置:', { x, y, device: isMobile ? 'mobile' : 'desktop' });
    
    return {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: 10100,
      pointerEvents: 'auto'
    };
  }, [position.x, position.y]);

  // 彈窗位置初始化與簡單滾動更新
  useEffect(() => {
    // 初始化位置
    setPopupStyle(calculatePopupStyle());
    console.log('🎯 彈窗初始化完成');

    // 簡單的滾動處理：只在滾動距離較大時更新
    let lastScrollY = window.pageYOffset;
    let updateTimeout: NodeJS.Timeout | null = null;
    
    const handleScroll = () => {
      // 清除之前的定時器
      if (updateTimeout) clearTimeout(updateTimeout);
      
      // 延遲更新，避免頻繁計算
      updateTimeout = setTimeout(() => {
        const currentScrollY = window.pageYOffset;
        const scrollDelta = Math.abs(currentScrollY - lastScrollY);
        
        // 只有在滾動距離超過50px時才更新（減少不必要更新）
        if (scrollDelta > 50) {
          setPopupStyle(calculatePopupStyle());
          lastScrollY = currentScrollY;
          console.log('🔄 滾動更新彈窗位置，滾動距離:', scrollDelta);
        }
      }, 100); // 100ms 延遲
    };

    const handleResize = () => {
      setPopupStyle(calculatePopupStyle());
      console.log('📏 視窗大小變化，更新彈窗位置');
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    
    return () => {
      if (updateTimeout) clearTimeout(updateTimeout);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [position.x, position.y, calculatePopupStyle]);

  // 優化點擊外部關閉彈窗（防止立即關閉）
  useEffect(() => {
    // 延遲設置事件監聽器，避免彈窗剛出現就被關閉
    const setupTimer = setTimeout(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
          console.log('🚪 點擊外部，關閉彈窗');
          onClose();
        }
      };

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          console.log('⌨️ ESC按鍵，關閉彈窗');
          onClose();
        }
      };

      // 使用延遲避免立即觸發關閉
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      
      // 儲存清理函數
      (window as any).__popupCleanup = () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }, 100); // 100ms 延遲

    return () => {
      clearTimeout(setupTimer);
      if ((window as any).__popupCleanup) {
        (window as any).__popupCleanup();
        delete (window as any).__popupCleanup;
      }
    };
  }, [onClose]);

  return (
    <div 
      style={popupStyle}
      className="animate-in fade-in-50 zoom-in-95 duration-200"
    >
      <Card 
        ref={popupRef}
        className="w-[280px] max-w-[calc(100vw-32px)] p-3 sm:p-4 shadow-2xl border-2 border-blue-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl sm:w-[280px] touch-manipulation"
        style={{ 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', 
          zIndex: 10101  // 確保在最上層
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              {word}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => handlePronunciation(word, e)}
              className="h-8 w-8 p-0 hover:bg-blue-50"
              title="發音"
            >
              <Volume2 size={16} className="text-blue-600" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClose();
            }}
            className="h-8 w-8 p-0 hover:bg-slate-100"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin mr-2" size={20} />
              <span className="text-slate-600">翻譯中...</span>
            </div>
          ) : translation ? (
            <>
              {/* 詞性 */}
              {translation.partOfSpeech && (
                <Badge variant="secondary" className="mb-2">
                  {translation.partOfSpeech}
                </Badge>
              )}
              
              {/* 翻譯 */}
              <div className="bg-gradient-to-r from-slate-50/80 to-slate-100/80 dark:from-slate-700/80 dark:to-slate-600/80 p-3 rounded-lg border border-slate-200/50 dark:border-slate-600/50">
                <p className="text-slate-800 dark:text-slate-100 font-medium">
                  {translation.translation}
                </p>
              </div>
              
              {/* 發音標示 */}
              {translation.pronunciation && (
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  <span className="font-mono">/{translation.pronunciation}/</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 py-4">
              翻譯載入失敗
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              isWordInVocabulary ? onRemoveWord?.(word) : onAddWord(word);
            }}
            disabled={isAddingWord || isRemovingWord}
            size="sm"
            variant="outline"
            className={`flex-1 min-h-[44px] disabled:opacity-50 border-2 transition-all duration-200 touch-manipulation ${
              isWordInVocabulary 
                ? 'border-yellow-400 text-yellow-600 hover:bg-yellow-50 disabled:border-yellow-300' 
                : 'border-amber-400 text-amber-600 hover:bg-amber-50 disabled:border-amber-300'
            }`}
          >
            {isAddingWord ? (
              <>
                <Loader2 className="animate-spin mr-1" size={16} />
                加入中...
              </>
            ) : isRemovingWord ? (
              <>
                <Loader2 className="animate-spin mr-1" size={16} />
                移除中...
              </>
            ) : (
              <>
                <Star 
                  size={16} 
                  className={`mr-1 ${isWordInVocabulary ? 'fill-yellow-400' : ''}`} 
                />
                {isWordInVocabulary ? '取消收藏' : '加入單字庫'}
              </>
            )}
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onDeepAnalysis(word);
            }}
            variant="outline"
            size="sm"
            className="flex-1 min-h-[44px] border-purple-600 text-purple-600 hover:bg-purple-50 flex items-center justify-center space-x-1 touch-manipulation"
          >
            <Brain className="w-4 h-4" />
            <span>AI 解析</span>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default QuickWordPopup;