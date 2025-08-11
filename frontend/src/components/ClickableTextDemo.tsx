import React from 'react';
import ClickableTextWrapper from './ClickableTextWrapper';
import { Card } from './ui/card';

interface ClickableTextDemoProps {
  onAIAnalysisClick?: (word: string) => void;
}

const ClickableTextDemo: React.FC<ClickableTextDemoProps> = ({ onAIAnalysisClick }) => {
  const handleWordAdded = (word: string) => {
    console.log('Word added to vocabulary:', word);
    // 這裡可以觸發重新載入單字列表或其他更新操作
  };

  const handleDeepAnalysis = (word: string) => {
    if (onAIAnalysisClick) {
      onAIAnalysisClick(word);
    } else {
      console.log('Deep analysis requested for:', word);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-4">
        🚀 智能單字點擊功能測試
      </h1>
      
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">📝 測試例句</h2>
        <ClickableTextWrapper 
          onWordAdded={handleWordAdded}
          onDeepAnalysis={handleDeepAnalysis}
          onAIAnalysisClick={onAIAnalysisClick}
        >
          <p className="text-slate-700 leading-relaxed">
            The magnificent sunset painted the sky in brilliant shades of orange and purple, 
            creating a breathtaking panorama that mesmerized every observer. 
            This extraordinary phenomenon occurs when sunlight scatters through atmospheric particles, 
            producing spectacular visual effects that inspire photographers worldwide.
          </p>
        </ClickableTextWrapper>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">🔬 科學文章測試</h2>
        <ClickableTextWrapper 
          onWordAdded={handleWordAdded}
          onDeepAnalysis={handleDeepAnalysis}
          onAIAnalysisClick={onAIAnalysisClick}
        >
          <p className="text-slate-700 leading-relaxed">
            Artificial intelligence algorithms utilize sophisticated neural networks to process 
            complex datasets and generate accurate predictions. These computational models 
            demonstrate remarkable capabilities in pattern recognition, natural language processing, 
            and autonomous decision-making systems.
          </p>
        </ClickableTextWrapper>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">📚 文學段落測試</h2>
        <ClickableTextWrapper 
          onWordAdded={handleWordAdded}
          onDeepAnalysis={handleDeepAnalysis}
          onAIAnalysisClick={onAIAnalysisClick}
        >
          <p className="text-slate-700 leading-relaxed italic">
            "The enchanted forest whispered ancient secrets through its emerald canopy, 
            where mysterious creatures dwelled in harmonious solitude. Each rustling leaf 
            conveyed timeless wisdom, while ethereal moonbeams illuminated the serpentine 
            pathways that meandered through this mystical realm."
          </p>
        </ClickableTextWrapper>
      </Card>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">💡 使用說明</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• <strong>方式1</strong>：直接點擊任何英文單字即可獲得快速翻譯</li>
          <li>• <strong>方式2</strong>：選取英文單字後再點擊，優先處理選中的文字</li>
          <li>• 彈窗內含發音、加入單字庫、深度解析功能</li>
          <li>• 加入單字庫後會自動重新載入列表，無需手動刷新</li>
          <li>• 深度解析會跳轉至 AI 分析頁面進行詳細解讀</li>
          <li>• 按 ESC 鍵或點擊外部關閉彈窗</li>
          <li>• 翻譯使用多重備援 API 確保服務穩定性</li>
        </ul>
      </div>
    </div>
  );
};

export default ClickableTextDemo;