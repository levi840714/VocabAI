import React, { useState } from 'react';
import { useClickableText } from '../hooks/useClickableText';
import { useVocabulary } from '../hooks/use-vocabulary';
import { useToast } from '../hooks/use-toast';
import QuickWordPopup from './QuickWordPopup';

interface ClickableTextWrapperProps {
  children: React.ReactNode;
  onWordAdded?: (word: string) => void;
  onDeepAnalysis?: (word: string) => void;
  onAIAnalysisClick?: (word: string) => void;
  className?: string;
}

const ClickableTextWrapper: React.FC<ClickableTextWrapperProps> = ({
  children,
  onWordAdded,
  onDeepAnalysis,
  onAIAnalysisClick,
  className = ''
}) => {
  const { toast } = useToast();
  const { addWord } = useVocabulary();
  const [isAddingWord, setIsAddingWord] = useState(false);
  const {
    clickedWord,
    translation,
    isLoading,
    closePopup,
    makeTextClickable
  } = useClickableText();

  // 處理加入單字庫
  const handleAddWord = async (word: string) => {
    if (isAddingWord) return; // 防止重複提交
    
    setIsAddingWord(true);
    try {
      // 使用 vocabulary hook 的 addWord 方法，會自動刷新列表
      await addWord(word);
      toast({
        title: "成功加入單字庫",
        description: `「${word}」已加入您的學習清單，列表已自動更新`,
      });
      
      // 呼叫外部回調
      if (onWordAdded) {
        onWordAdded(word);
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

  // 處理深度解析
  const handleDeepAnalysis = (word: string) => {
    if (onAIAnalysisClick) {
      // 使用與現有單字詳情相同的 AI 解析跳轉邏輯
      onAIAnalysisClick(word);
    } else if (onDeepAnalysis) {
      onDeepAnalysis(word);
    } else {
      // 預設行為：提示用戶功能未設置
      toast({
        title: "深度解析功能",
        description: "請在應用主頁面中使用深度解析功能",
        variant: "destructive",
      });
    }
    closePopup();
  };

  return (
    <div className={className}>
      {makeTextClickable(children)}
      
      {/* 快速翻譯彈窗 */}
      {clickedWord && (
        <QuickWordPopup
          word={clickedWord.word}
          position={clickedWord.position}
          translation={translation}
          isLoading={isLoading}
          isAddingWord={isAddingWord}
          onClose={closePopup}
          onAddWord={handleAddWord}
          onDeepAnalysis={handleDeepAnalysis}
        />
      )}
    </div>
  );
};

export default ClickableTextWrapper;