import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, TextField } from '@mui/material';
import { ExternalLink, Volume2, Edit, Save, X, Brain } from 'lucide-react';
import StructuredWordDisplay from './StructuredWordDisplay';
import { parseStructuredResponse, cleanStructuredResponse } from '../lib/parseStructuredResponse';
import { vocabotAPI } from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';

interface WordDetailsDialogProps {
  open: boolean;
  onClose: () => void;
  word?: {
    id?: number;
    word: string;
    initial_ai_explanation?: string;
    user_notes?: string;
    [key: string]: any;
  };
  onNotesUpdate?: () => void; // Callback to refresh data after notes update
  onAIAnalysisClick?: (word: string) => void; // Callback to navigate to AI analysis page
}

const StructuredWordDetailsDialog: React.FC<WordDetailsDialogProps> = ({ open, onClose, word, onNotesUpdate, onAIAnalysisClick }) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const { isVoiceAutoPlay, isDarkMode } = useSettings();

  // Initialize notes value when word changes
  React.useEffect(() => {
    if (word) {
      setNotesValue(word.user_notes || '');
      setIsEditingNotes(false);
    }
  }, [word?.user_notes]);

  // 確保彈窗打開時滾動到頂部並自動播放語音
  React.useEffect(() => {
    if (open && word) {
      // 延遲滾動，確保彈窗已渲染
      setTimeout(() => {
        const dialogContent = document.querySelector('[role="dialog"] .MuiDialogContent-root');
        if (dialogContent) {
          dialogContent.scrollTop = 0;
        }
        
        // 自動播放語音（如果啟用）
        if (isVoiceAutoPlay) {
          handlePronunciation();
        }
      }, 300);
    }
  }, [open, word?.id, isVoiceAutoPlay]);

  if (!word) {
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
    // Use Web Speech API for pronunciation
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    } else {
      // Fallback: try Google Translate TTS
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
        onNotesUpdate(); // Refresh the word list data
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

  // 處理在詳情對話框中加入單字，但不關閉對話框
  const handleWordAddedInDialog = (addedWord: string) => {
    console.log(`單字 "${addedWord}" 已在詳情對話框中加入`);
    // 不觸發父級的 refreshWords，避免關閉對話框
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: isDarkMode ? '#1e293b !important' : '#ffffff !important',
          color: isDarkMode ? '#f1f5f9 !important' : '#1e293b !important',
          backgroundImage: 'none !important',
          '& *': {
            color: isDarkMode ? '#f1f5f9 !important' : '#1e293b !important',
          },
          '& .MuiDialogTitle-root': {
            backgroundColor: isDarkMode ? '#1e293b !important' : '#ffffff !important',
            color: isDarkMode ? '#f1f5f9 !important' : '#1e293b !important',
          },
          '& .MuiDialogContent-root': {
            backgroundColor: isDarkMode ? '#1e293b !important' : '#ffffff !important',
            color: isDarkMode ? '#f1f5f9 !important' : '#1e293b !important',
          },
          '& .MuiDialogActions-root': {
            backgroundColor: isDarkMode ? '#1e293b !important' : '#ffffff !important',
          }
        }
      }}
    >
      <DialogTitle sx={{ 
        fontWeight: 'bold', 
        fontSize: '1.5rem', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        backgroundColor: isDarkMode ? '#1e293b !important' : '#ffffff !important',
        color: isDarkMode ? '#f1f5f9 !important' : '#1e293b !important',
      }}>
        <span style={{ textAlign: 'center' }}>{word.word}</span>
        <Box sx={{ 
          display: 'flex',
          justifyContent: 'center',
          gap: 1,
          width: '100%'
        }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handlePronunciation}
            sx={{ 
              width: 40,
              height: 40,
              minWidth: 40,
              minHeight: 40,
              padding: 0,
              borderRadius: '8px',
              borderColor: isDarkMode ? '#64748b !important' : '#d1d5db !important',
              color: isDarkMode ? '#e2e8f0 !important' : '#374151 !important',
              backgroundColor: isDarkMode ? '#334155 !important' : '#ffffff !important',
              '&:hover': {
                backgroundColor: isDarkMode ? '#475569 !important' : '#f3f4f6 !important',
                borderColor: isDarkMode ? '#94a3b8 !important' : '#9ca3af !important',
                color: isDarkMode ? '#f1f5f9 !important' : '#1f2937 !important',
              },
            }}
          >
            <Volume2 size={16} />
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleAIAnalysisClick}
            sx={{ 
              width: 40,
              height: 40,
              minWidth: 40,
              minHeight: 40,
              padding: 0,
              borderRadius: '8px',
              color: isDarkMode ? '#c084fc !important' : '#7c3aed !important', 
              borderColor: isDarkMode ? '#7c3aed !important' : '#a855f7 !important',
              backgroundColor: isDarkMode ? '#4c1d95 !important' : '#faf5ff !important',
              '&:hover': {
                backgroundColor: isDarkMode ? '#5b21b6 !important' : '#f3e8ff !important',
                borderColor: isDarkMode ? '#a855f7 !important' : '#8b5cf6 !important',
                color: isDarkMode ? '#ddd6fe !important' : '#6d28d9 !important',
              },
            }}
          >
            <Brain size={16} />
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleDictionaryOpen}
            sx={{ 
              width: 40,
              height: 40,
              minWidth: 40,
              minHeight: 40,
              padding: 0,
              borderRadius: '8px',
              borderColor: isDarkMode ? '#64748b !important' : '#d1d5db !important',
              color: isDarkMode ? '#e2e8f0 !important' : '#374151 !important',
              backgroundColor: isDarkMode ? '#334155 !important' : '#ffffff !important',
              '&:hover': {
                backgroundColor: isDarkMode ? '#475569 !important' : '#f3f4f6 !important',
                borderColor: isDarkMode ? '#94a3b8 !important' : '#9ca3af !important',
                color: isDarkMode ? '#f1f5f9 !important' : '#1f2937 !important',
              },
            }}
          >
            <ExternalLink size={16} />
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent 
        dividers
        sx={{
          backgroundColor: isDarkMode ? '#1e293b !important' : '#ffffff !important',
          color: isDarkMode ? '#f1f5f9 !important' : '#1e293b !important',
        }}
      >
        {cleanedData ? (
          <StructuredWordDisplay data={cleanedData} onAIAnalysisClick={onAIAnalysisClick} onWordAdded={handleWordAddedInDialog} />
        ) : (
          <Box>
            <Typography variant="subtitle1" component="h3" gutterBottom sx={{ 
              fontWeight: 'bold',
              color: isDarkMode ? '#f1f5f9' : '#1e293b'
            }}>
              解釋：
            </Typography>
            <Typography variant="body1" sx={{ 
              whiteSpace: 'pre-wrap', 
              mb: 2,
              color: isDarkMode ? '#cbd5e1' : '#475569'
            }}>
              {word.initial_ai_explanation || '無可用解釋'}
            </Typography>
          </Box>
        )}
        
        {/* User Notes Section */}
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          backgroundColor: isDarkMode ? '#374151' : '#f5f5f5', 
          borderRadius: 1 
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" component="h3" sx={{ 
              fontWeight: 'bold', 
              color: isDarkMode ? '#60a5fa' : '#1976d2' 
            }}>
              📝 我的備註：
            </Typography>
            {!isEditingNotes && (
              <Button
                size="small"
                startIcon={<Edit size={16} />}
                onClick={() => setIsEditingNotes(true)}
                sx={{ 
                  minWidth: 'auto', 
                  px: 1,
                  color: isDarkMode ? '#94a3b8' : '#6b7280',
                  '&:hover': {
                    backgroundColor: isDarkMode ? '#4b5563' : '#f3f4f6',
                  }
                }}
              >
                編輯
              </Button>
            )}
          </Box>
          
          {isEditingNotes ? (
            <Box>
              <TextField
                multiline
                rows={3}
                fullWidth
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                placeholder="在此添加您的備註..."
                sx={{ 
                  mb: 2,
                  '& .MuiInputBase-root': {
                    backgroundColor: isDarkMode ? '#4b5563' : '#ffffff',
                    color: isDarkMode ? '#f1f5f9' : '#1e293b',
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: isDarkMode ? '#9ca3af' : '#6b7280',
                    opacity: 1,
                  },
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDarkMode ? '#6b7280' : '#d1d5db',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDarkMode ? '#9ca3af' : '#9ca3af',
                  },
                  '& .Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: isDarkMode ? '#60a5fa' : '#2563eb',
                  },
                }}
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  startIcon={<X size={16} />}
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                  sx={{
                    color: isDarkMode ? '#94a3b8' : '#6b7280',
                    '&:hover': {
                      backgroundColor: isDarkMode ? '#4b5563' : '#f3f4f6',
                    }
                  }}
                >
                  取消
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Save size={16} />}
                  onClick={handleSaveNotes}
                  disabled={isUpdating}
                  sx={{
                    backgroundColor: isDarkMode ? '#3b82f6' : '#2563eb',
                    color: '#ffffff',
                    '&:hover': {
                      backgroundColor: isDarkMode ? '#2563eb' : '#1d4ed8',
                    },
                    '&:disabled': {
                      backgroundColor: isDarkMode ? '#6b7280' : '#9ca3af',
                      color: isDarkMode ? '#d1d5db' : '#ffffff',
                    }
                  }}
                >
                  {isUpdating ? '儲存中...' : '儲存'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography variant="body1" sx={{ 
              whiteSpace: 'pre-wrap',
              color: isDarkMode ? '#cbd5e1' : '#374151'
            }}>
              {word.user_notes || '點擊「編輯」按鈕添加您的備註...'}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{
        backgroundColor: isDarkMode ? '#1e293b !important' : '#ffffff !important',
      }}>
        <Button 
          onClick={onClose} 
          variant="outlined"
          sx={{
            borderColor: isDarkMode ? '#64748b !important' : '#d1d5db !important',
            color: isDarkMode ? '#e2e8f0 !important' : '#374151 !important',
            backgroundColor: isDarkMode ? '#334155 !important' : '#ffffff !important',
            '&:hover': {
              backgroundColor: isDarkMode ? '#475569 !important' : '#f3f4f6 !important',
              borderColor: isDarkMode ? '#94a3b8 !important' : '#9ca3af !important',
              color: isDarkMode ? '#f1f5f9 !important' : '#1f2937 !important',
            }
          }}
        >
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StructuredWordDetailsDialog;