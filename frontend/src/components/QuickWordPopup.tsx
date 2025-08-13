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
  const handlePronunciation = (text: string) => {
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

  // 計算彈窗位置（避免超出螢幕邊界，盡量靠近點擊位置）
  const getPopupStyle = (): React.CSSProperties => {
    const padding = 12;
    const popupWidth = 280;
    const popupHeight = 240;
    const headerHeight = 80; // Header 高度
    const navBarHeight = 80; // 底部導航欄高度
    const verticalOffset = 8; // 與點擊位置的垂直距離
    
    // 計算可用螢幕空間
    const viewportWidth = window.innerWidth;
    const availableHeight = window.innerHeight - headerHeight - navBarHeight;
    const scrollY = window.scrollY;
    
    // 將點擊位置轉換為相對於可視區域的座標
    const relativeY = position.y - scrollY - headerHeight;
    
    // 計算水平位置 - 優先居中，但確保不超出邊界
    let x = Math.max(padding, Math.min(
      position.x - popupWidth / 2,
      viewportWidth - popupWidth - padding
    ));
    
    // 計算垂直位置 - 優先在上方，距離點擊位置較近
    let y: number;
    const spaceAbove = relativeY - verticalOffset;
    const spaceBelow = availableHeight - relativeY - verticalOffset;
    
    if (spaceAbove >= popupHeight) {
      // 上方空間足夠，顯示在上方
      y = headerHeight + scrollY + relativeY - popupHeight - verticalOffset;
    } else if (spaceBelow >= popupHeight) {
      // 下方空間足夠，顯示在下方
      y = headerHeight + scrollY + relativeY + verticalOffset;
    } else {
      // 上下都不夠，選擇空間較大的一側，但調整彈窗大小適應
      if (spaceAbove > spaceBelow) {
        y = headerHeight + scrollY + padding;
      } else {
        y = headerHeight + scrollY + availableHeight - popupHeight - padding;
      }
    }
    
    // 最終邊界檢查
    const minY = headerHeight + scrollY + padding;
    const maxY = headerHeight + scrollY + availableHeight - popupHeight - padding;
    y = Math.max(minY, Math.min(y, maxY));
    
    return {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: 9999,
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
        className="w-[280px] p-4 shadow-lg border-2 border-blue-100 bg-white dark:bg-slate-800"
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
              onClick={() => handlePronunciation(word)}
              className="h-8 w-8 p-0 hover:bg-blue-50"
              title="發音"
            >
              <Volume2 size={16} className="text-blue-600" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
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
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-slate-800 font-medium">
                  {translation.translation}
                </p>
              </div>
              
              {/* 發音標示 */}
              {translation.pronunciation && (
                <div className="text-sm text-slate-600">
                  <span className="font-mono">/{translation.pronunciation}/</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-slate-500 py-4">
              翻譯載入失敗
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4 pt-3 border-t">
          <Button
            onClick={() => isWordInVocabulary ? onRemoveWord?.(word) : onAddWord(word)}
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
            onClick={() => onDeepAnalysis(word)}
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