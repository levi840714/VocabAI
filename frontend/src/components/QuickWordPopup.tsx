import React, { useEffect, useRef } from 'react';
import { Volume2, Plus, BookOpen, X, Loader2 } from 'lucide-react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Translation } from '../hooks/useClickableText';

interface QuickWordPopupProps {
  word: string;
  position: { x: number; y: number };
  translation: Translation | null;
  isLoading: boolean;
  isAddingWord?: boolean;
  onClose: () => void;
  onAddWord: (word: string) => void;
  onDeepAnalysis: (word: string) => void;
}

const QuickWordPopup: React.FC<QuickWordPopupProps> = ({
  word,
  position,
  translation,
  isLoading,
  isAddingWord = false,
  onClose,
  onAddWord,
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

  // 計算彈窗位置（避免超出螢幕邊界）
  const getPopupStyle = (): React.CSSProperties => {
    const padding = 16;
    const popupWidth = 280;
    const popupHeight = 200;
    
    let x = position.x - popupWidth / 2;
    let y = position.y - popupHeight - 10; // 顯示在點擊位置上方
    
    // 避免超出左邊界
    if (x < padding) {
      x = padding;
    }
    
    // 避免超出右邊界
    if (x + popupWidth > window.innerWidth - padding) {
      x = window.innerWidth - popupWidth - padding;
    }
    
    // 避免超出上邊界，顯示在下方
    if (y < padding) {
      y = position.y + 10;
    }
    
    // 避免超出下邊界
    if (y + popupHeight > window.innerHeight - padding) {
      y = window.innerHeight - popupHeight - padding;
    }
    
    return {
      position: 'fixed',
      left: `${x}px`,
      top: `${y}px`,
      zIndex: 1000,
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
        className="w-[280px] p-4 shadow-lg border-2 border-blue-100 bg-white/95 backdrop-blur-sm"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">
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
            onClick={() => onAddWord(word)}
            disabled={isAddingWord}
            size="sm"
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
          >
            {isAddingWord ? (
              <>
                <Loader2 className="animate-spin mr-1" size={16} />
                加入中...
              </>
            ) : (
              <>
                <Plus size={16} className="mr-1" />
                加入單字庫
              </>
            )}
          </Button>
          <Button
            onClick={() => onDeepAnalysis(word)}
            variant="outline"
            size="sm"
            className="flex-1 border-purple-600 text-purple-600 hover:bg-purple-50"
          >
            🧠 AI 解析
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default QuickWordPopup;