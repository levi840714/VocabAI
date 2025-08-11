import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, TextField } from '@mui/material';
import { ExternalLink, Volume2, Edit, Save, X, Brain } from 'lucide-react';
import StructuredWordDisplay from './StructuredWordDisplay';
import { parseStructuredResponse, cleanStructuredResponse } from '../lib/parseStructuredResponse';
import { vocabotAPI } from '@/lib/api';

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

  // Initialize notes value when word changes
  React.useEffect(() => {
    if (word) {
      setNotesValue(word.user_notes || '');
      setIsEditingNotes(false);
    }
  }, [word?.user_notes]);

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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 'bold', fontSize: '1.5rem', display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { xs: 'flex-start', sm: 'center' }, gap: { xs: 1, sm: 2 } }}>
        <span>{word.word}</span>
        <Box sx={{ 
          display: 'flex', 
          gap: { xs: 0.5, sm: 1 },
          flexWrap: { xs: 'wrap', sm: 'nowrap' },
          width: { xs: '100%', sm: 'auto' }
        }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Volume2 size={16} />}
            onClick={handlePronunciation}
            sx={{ 
              minWidth: 'auto', 
              px: { xs: 0.5, sm: 1 },
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              flex: { xs: '1', sm: 'none' },
              '& .MuiButton-startIcon': {
                margin: { xs: '0 2px 0 0', sm: '0 4px 0 0' }
              }
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>發音</Box>
            <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>🔊</Box>
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Brain size={16} />}
            onClick={handleAIAnalysisClick}
            sx={{ 
              minWidth: 'auto', 
              px: { xs: 0.5, sm: 1 },
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              color: 'purple', 
              borderColor: 'purple',
              flex: { xs: '1', sm: 'none' },
              '& .MuiButton-startIcon': {
                margin: { xs: '0 2px 0 0', sm: '0 4px 0 0' }
              }
            }}
          >
            🧠 AI 解析
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ExternalLink size={16} />}
            onClick={handleDictionaryOpen}
            sx={{ 
              minWidth: 'auto', 
              px: { xs: 0.5, sm: 1 },
              fontSize: { xs: '0.7rem', sm: '0.875rem' },
              flex: { xs: '1', sm: 'none' },
              '& .MuiButton-startIcon': {
                margin: { xs: '0 2px 0 0', sm: '0 4px 0 0' }
              }
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>字典</Box>
            <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>📚</Box>
          </Button>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {cleanedData ? (
          <StructuredWordDisplay data={cleanedData} onAIAnalysisClick={onAIAnalysisClick} onWordAdded={handleWordAddedInDialog} />
        ) : (
          <Box>
            <Typography variant="subtitle1" component="h3" gutterBottom sx={{ fontWeight: 'bold' }}>
              解釋：
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
              {word.initial_ai_explanation || '無可用解釋'}
            </Typography>
          </Box>
        )}
        
        {/* User Notes Section */}
        <Box sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              📝 我的備註：
            </Typography>
            {!isEditingNotes && (
              <Button
                size="small"
                startIcon={<Edit size={16} />}
                onClick={() => setIsEditingNotes(true)}
                sx={{ minWidth: 'auto', px: 1 }}
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
                sx={{ mb: 2 }}
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  startIcon={<X size={16} />}
                  onClick={handleCancelEdit}
                  disabled={isUpdating}
                >
                  取消
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Save size={16} />}
                  onClick={handleSaveNotes}
                  disabled={isUpdating}
                >
                  {isUpdating ? '儲存中...' : '儲存'}
                </Button>
              </Box>
            </Box>
          ) : (
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {word.user_notes || '點擊「編輯」按鈕添加您的備註...'}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          關閉
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StructuredWordDetailsDialog;