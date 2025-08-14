import React, { useEffect, useRef } from 'react';
import { Volume2, Star, BookOpen, X, Loader2, Brain } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import type { Translation } from '../hooks/useClickableText';

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

  // 處理 TTS 發音
  const handlePronunciation = (text: string, event?: React.MouseEvent) => {
    // 阻止事件冒泡，避免觸發彈窗關閉
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if ('speechSynthesis' in window) {
      // 停止當前播放
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    } else {
      // 備選方案：Google Translate TTS
      const audio = new Audio(
        `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`
      );
      audio.play().catch(() => {
        alert('發音功能暫時不可用');
      });
    }
  };

  // 計算彈窗位置（簡化邏輯，確保在螢幕範圍內）
  const getPopupStyle = (): React.CSSProperties => {
    const padding = 16;
    const popupWidth = 280;
    const popupHeight = 300; // 增加一點高度以容納所有內容
    const offset = 12; // 與點擊位置的距離
    
    // 獲取視窗尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 計算水平位置（優先置中，但確保不超出邊界）
    let x = position.x - popupWidth / 2;
    x = Math.max(padding, Math.min(x, viewportWidth - popupWidth - padding));
    
    // 計算垂直位置（優先在上方，空間不夠則下方）
    let y = position.y - popupHeight - offset;
    
    // 如果上方空間不夠，嘗試下方
    if (y < padding) {
      y = position.y + offset;
      
      // 如果下方也不夠，則居中顯示
      if (y + popupHeight > viewportHeight - padding) {
        y = Math.max(padding, (viewportHeight - popupHeight) / 2);
      }
    }
    
    // 最終邊界檢查
    y = Math.max(padding, Math.min(y, viewportHeight - popupHeight - padding));
    x = Math.max(padding, Math.min(x, viewportWidth - popupWidth - padding));
    
    console.log('🎯 彈窗位置計算:', {
      click: { x: position.x, y: position.y },
      popup: { x, y, width: popupWidth, height: popupHeight },
      viewport: { width: viewportWidth, height: viewportHeight }
    });
    
    return {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: 10100,  // 確保在單字詳情彈窗(9999)之上
      // 確保彈窗不會被其他元素遮擋
      pointerEvents: 'auto'
    };
  };

  // 點擊外部關閉彈窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div style={getPopupStyle()}>
      <Card 
        ref={popupRef}
        className="w-[280px] p-4 shadow-2xl border-2 border-blue-200/50 dark:border-slate-600/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl"
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
            className={`flex-1 disabled:opacity-50 border-2 transition-all duration-200 ${
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
            className="flex-1 border-purple-600 text-purple-600 hover:bg-purple-50 flex items-center justify-center space-x-1"
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