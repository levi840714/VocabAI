import React from 'react';
import { useClickableText } from '../hooks/useClickableText';

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
  const { makeTextClickable } = useClickableText();

  // 注意：回調現在由頁面級別的 useEffect 在全域設置
  // 這些 props 保留是為了向後兼容，但實際使用全域回調
  
  return (
    <div className={className}>
      {makeTextClickable(children)}
    </div>
  );
};

export default ClickableTextWrapper;