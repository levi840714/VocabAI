import React, { useState, useEffect } from 'react';
import { ExternalLink, Volume2, Edit, Save, X, Brain } from 'lucide-react';
import StructuredWordDisplay from './StructuredWordDisplay';
import { parseStructuredResponse, cleanStructuredResponse } from '../lib/parseStructuredResponse';
import { vocabotAPI } from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';
import { Button } from './ui/button';

interface CustomWordDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  word?: {
    id?: number;
    word: string;
    initial_ai_explanation?: string;
    user_notes?: string;
    [key: string]: any;
  };
  onNotesUpdate?: () => void;
  onAIAnalysisClick?: (word: string) => void;
}

const CustomWordDetailsDialog: React.FC<CustomWordDetailsDialogProps> = ({ 
  open, 
  onClose, 
  word, 
  onNotesUpdate, 
  onAIAnalysisClick 
}) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { isVoiceAutoPlay } = useSettings();

  // Initialize notes value when word changes
  useEffect(() => {
    if (word) {
      setNotesValue(word.user_notes || '');
      setIsEditingNotes(false);
    }
  }, [word?.user_notes]);

  // Auto scroll to top and play voice
  useEffect(() => {
    if (open && word) {
      setTimeout(() => {
        const dialogContent = document.querySelector('[data-dialog-content]');
        if (dialogContent) {
          dialogContent.scrollTop = 0;
        }
        
        if (isVoiceAutoPlay) {
          handlePronunciation();
        }
      }, 300);
    }
  }, [open, word?.id, isVoiceAutoPlay]);

  if (!open || !word) {
    return null;
  }

  // Try to parse structured data from the explanation
  const structuredData = word.initial_ai_explanation 
    ? parseStructuredResponse(word.initial_ai_explanation)
    : null;

  const cleanedData = structuredData ? cleanStructuredResponse(structuredData) : null;

  const handleDictionaryOpen = () => {
    const url = `https://www.vocabulary.com/dictionary/${encodeURIComponent(word.word)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handlePronunciation = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    } else {
      const audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(word.word)}`);
      audio.play().catch(() => {
        alert('發音功能暫時不可用，請檢查瀏覽器設定或網路連線');
      });
    }
  };

  const handleSaveNotes = async () => {
    if (!word.id) {
      alert('無法更新註記：缺少單字ID');
      return;
    }

    setIsUpdating(true);
    try {
      await vocabotAPI.updateWordNotes(word.id, notesValue);
      setIsEditingNotes(false);
      if (onNotesUpdate) {
        onNotesUpdate();
      }
    } catch (error) {
      console.error('更新註記失敗:', error);
      alert('更新註記失敗，請稍後再試');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelEdit = () => {
    setNotesValue(word.user_notes || '');
    setIsEditingNotes(false);
  };

  const handleAIAnalysisClick = () => {
    if (onAIAnalysisClick && word.word) {
      onAIAnalysisClick(word.word);
    }
  };

  const handleWordAddedInDialog = (addedWord: string) => {
    console.log(`單字 "${addedWord}" 已在詳情對話框中加入`);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex flex-col items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white text-center">
              {word.word}
            </h2>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePronunciation}
                className="p-2 h-10 w-10"
                title="聆聽單字發音"
              >
                <Volume2 size={16} />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleAIAnalysisClick}
                className="p-2 h-10 w-10 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                title="AI 深度分析"
              >
                <Brain size={16} />
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDictionaryOpen}
                className="p-2 h-10 w-10"
                title="開啟字典"
              >
                <ExternalLink size={16} />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div 
            className="flex-1 overflow-y-auto p-6 space-y-6"
            data-dialog-content
          >
            {cleanedData ? (
              <StructuredWordDisplay 
                data={cleanedData} 
                onAIAnalysisClick={onAIAnalysisClick} 
                onWordAdded={handleWordAddedInDialog} 
              />
            ) : (
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                  解釋：
                </h3>
                <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap mb-4">
                  {word.initial_ai_explanation || '無可用解釋'}
                </p>
              </div>
            )}
            
            {/* User Notes Section */}
            <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-semibold text-blue-700 dark:text-blue-400">
                  📝 我的備註：
                </h3>
                {!isEditingNotes && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingNotes(true)}
                    className="text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                  >
                    <Edit size={16} className="mr-1" />
                    編輯
                  </Button>
                )}
              </div>
              
              {isEditingNotes ? (
                <div>
                  <textarea
                    value={notesValue}
                    onChange={(e) => setNotesValue(e.target.value)}
                    placeholder="在此添加您的備註..."
                    className="w-full p-3 border border-slate-300 dark:border-slate-500 rounded-lg bg-white dark:bg-slate-600 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2 justify-end mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isUpdating}
                      className="text-slate-600 dark:text-slate-300"
                    >
                      <X size={16} className="mr-1" />
                      取消
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={isUpdating}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Save size={16} className="mr-1" />
                      {isUpdating ? '儲存中...' : '儲存'}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                  {word.user_notes || '點擊「編輯」按鈕添加您的備註...'}
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-600 flex justify-end">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="px-6"
            >
              關閉
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomWordDetailsDialog;