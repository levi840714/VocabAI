import React, { useState } from 'react';
import { useClickableTextContext } from '../contexts/ClickableTextContext';
import { useVocabulary } from '../hooks/use-vocabulary';
import { useToast } from '../hooks/use-toast';
import QuickWordPopup from './QuickWordPopup';
import { useNavigate } from 'react-router-dom';

const GlobalQuickWordPopup: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { addWord, deleteWord, words } = useVocabulary();
  const [isAddingWord, setIsAddingWord] = useState(false);
  const [isRemovingWord, setIsRemovingWord] = useState(false);
  const {
    clickedWord,
    translation,
    isLoading,
    closePopup,
    callbacks
  } = useClickableTextContext();

  // 處理加入單字庫
  const handleAddWord = async (word: string) => {
    if (isAddingWord) return; // 防止重複提交
    
    setIsAddingWord(true);
    try {
      // 使用 vocabulary hook 的 addWord 方法，會自動刷新列表
      await addWord(word);
      toast({
        title: "成功收藏",
        description: `「${word}」已收藏到您的單字庫，列表已自動更新`,
      });
      
      // 呼叫外部回調
      if (callbacks.onWordAdded) {
        callbacks.onWordAdded(word);
      }
      
      closePopup();
    } catch (error) {
      console.error('Failed to add word:', error);
      toast({
        title: "加入失敗",
        description: "請稍後再試或檢查網路連線",
        variant: "destructive",
      });
    } finally {
      setIsAddingWord(false);
    }
  };

  // 處理移除單字庫
  const handleRemoveWord = async (word: string) => {
    if (isRemovingWord) return; // 防止重複提交
    
    // 找到要移除的單字
    const existingWord = words.find(w => w.term.toLowerCase() === word.toLowerCase());
    if (!existingWord) {
      toast({
        title: "錯誤",
        description: "找不到要移除的單字",
        variant: "destructive",
      });
      return;
    }
    
    setIsRemovingWord(true);
    try {
      await deleteWord(existingWord.id);
      toast({
        title: "取消收藏",
        description: `「${word}」已從您的收藏中移除`,
      });
      
      // 呼叫外部回調
      if (callbacks.onWordAdded) {
        callbacks.onWordAdded(word);
      }
      
      closePopup();
    } catch (error) {
      console.error('移除單字失敗:', error);
      toast({
        title: "移除失敗",
        description: "無法移除單字，請稍後再試",
        variant: "destructive",
      });
    } finally {
      setIsRemovingWord(false);
    }
  };

  // 處理深度解析
  const handleDeepAnalysis = (word: string) => {
    if (callbacks.onAIAnalysisClick) {
      // 使用與現有單字詳情相同的 AI 解析跳轉邏輯
      callbacks.onAIAnalysisClick(word);
    } else if (callbacks.onDeepAnalysis) {
      callbacks.onDeepAnalysis(word);
    } else {
      // 預設行為：跳轉到 AI 分析頁面
      navigate(`/ai-analysis?word=${encodeURIComponent(word)}`);
    }
    closePopup();
  };

  if (!clickedWord) {
    return null;
  }

  console.log('🚀 GlobalQuickWordPopup 渲染:', {
    clickedWord,
    translation,
    isLoading,
    position: clickedWord.position
  });

  return (
    <QuickWordPopup
      word={clickedWord.word}
      position={clickedWord.position}
      translation={translation}
      isLoading={isLoading}
      isAddingWord={isAddingWord}
      isRemovingWord={isRemovingWord}
      isWordInVocabulary={words.some(w => w.term.toLowerCase() === clickedWord.word.toLowerCase())}
      onClose={closePopup}
      onAddWord={handleAddWord}
      onRemoveWord={handleRemoveWord}
      onDeepAnalysis={handleDeepAnalysis}
    />
  );
};

export default GlobalQuickWordPopup;