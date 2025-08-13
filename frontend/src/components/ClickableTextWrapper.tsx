import React from 'react';
import { useClickableText } from '../hooks/useClickableText';

interface ClickableTextWrapperProps {
  children: React.ReactNode;
  onWordAdded?: (word: string) => void;
  onDeepAnalysis?: (word: string) => void;
  onAIAnalysisClick?: (word: string) => void;
  className?: string;
  inline?: boolean; // 是否使用 span 而不是 div
}

const ClickableTextWrapper: React.FC<ClickableTextWrapperProps> = ({
  children,
  onWordAdded,
  onDeepAnalysis,
  onAIAnalysisClick,
  className = '',
  inline = false
}) => {
  const { makeTextClickable } = useClickableText();

  // 注意：回調現在由頁面級別的 useEffect 在全域設置
  // 這些 props 保留是為了向後兼容，但實際使用全域回調
  
  if (inline) {
    // 當 inline=true 時，直接返回可點擊元素，不額外包裝
    return <>{makeTextClickable(children, 'span')}</>;
  }
  
  return (
    <div className={className}>
      {makeTextClickable(children)}
    </div>
  );
};

export default ClickableTextWrapper;