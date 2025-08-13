import React, { useEffect } from 'react';
import ClickableTextDemo from '../components/ClickableTextDemo';
import { useClickableTextContext } from '@/contexts/ClickableTextContext';
import { Card } from '../components/ui/card';

const DebugClickablePage: React.FC = () => {
  const { setCallbacks } = useClickableTextContext();

  // 設置全域智能點擊回調
  useEffect(() => {
    setCallbacks({
      onWordAdded: (addedWord) => {
        console.log('✅ 調試頁面：單字已添加', addedWord);
        alert(`單字已添加到詞彙庫：${addedWord}`);
      },
      onDeepAnalysis: (word) => {
        console.log('🧠 調試頁面：深度解析', word);
        alert(`AI 深度解析功能：${word}`);
      },
      onAIAnalysisClick: (word) => {
        console.log('🔍 調試頁面：AI 解析點擊', word);
        alert(`AI 解析功能：${word}`);
      }
    });
  }, [setCallbacks]);

  const handleAIAnalysisClick = (word: string) => {
    console.log('🧠 AI 分析請求:', word);
    alert(`AI 分析功能：${word}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="p-6 mb-6 bg-yellow-50 border-yellow-200">
          <h1 className="text-2xl font-bold text-slate-800 mb-4">
            🐛 智能點擊功能調試頁面
          </h1>
          <div className="text-sm text-slate-600 space-y-2">
            <p>• 打開瀏覽器開發者工具（F12）</p>
            <p>• 點擊下方任意英文單字</p>
            <p>• 查看 Console 中的日誌訊息</p>
            <p>• 檢查是否出現翻譯彈窗</p>
          </div>
        </Card>
        
        <ClickableTextDemo onAIAnalysisClick={handleAIAnalysisClick} />
        
        <Card className="p-4 mt-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">🔧 調試資訊</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p>• 檢查 Console 是否有 "🔍 智能點擊被觸發" 訊息</p>
            <p>• 檢查是否有 "✅ 檢測到單字" 訊息</p>
            <p>• 如果沒有彈窗，檢查翻譯 API 是否正常</p>
            <p>• 確認沒有 JavaScript 錯誤</p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DebugClickablePage;