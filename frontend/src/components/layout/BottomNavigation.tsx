import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, BookOpen, Plus, Brain, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { useToast } from '@/hooks/use-toast';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { addWord } = useVocabulary();
  const { toast } = useToast();
  const { isMobile } = useDeviceDetection();
  const [showAddWord, setShowAddWord] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // 只在手機版顯示底部導航欄
  if (!isMobile) {
    return (
      <AnimatePresence>
        {showAddWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddWord(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-center">加入新單字</h2>
                <div className="space-y-4">
                  <Input
                    placeholder="輸入英文單字..."
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddWord()}
                    className="text-center"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddWord(false)}
                      className="flex-1"
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleAddWord}
                      disabled={isAdding || !newWord.trim()}
                      className="flex-1"
                    >
                      {isAdding ? '加入中...' : '確認加入'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const navItems = [
    {
      id: 'home',
      label: '首頁',
      icon: Home,
      path: '/',
      active: location.pathname === '/'
    },
    {
      id: 'vocabulary',
      label: '單字庫',
      icon: BookOpen,
      path: '/vocabulary',
      active: location.pathname === '/vocabulary'
    },
    {
      id: 'add',
      label: '加入單字',
      icon: Plus,
      path: null,
      active: false,
      action: () => setShowAddWord(true)
    },
    {
      id: 'ai-analysis',
      label: 'AI 解析',
      icon: Brain,
      path: '/ai-analysis',
      active: location.pathname === '/ai-analysis'
    },
    {
      id: 'progress',
      label: '學習進度',
      icon: BarChart,
      path: '/progress',
      active: location.pathname === '/progress'
    }
  ];

  const handleNavigation = (item: any) => {
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  const handleAddWord = async () => {
    if (!newWord.trim()) {
      toast({
        title: "錯誤",
        description: "請輸入要加入的單字",
        variant: "destructive",
      });
      return;
    }

    setIsAdding(true);
    try {
      await addWord(newWord.trim());
      toast({
        title: "成功",
        description: `單字 "${newWord.trim()}" 已加入您的詞彙庫`,
      });
      setNewWord('');
      setShowAddWord(false);
    } catch (error) {
      console.error('Failed to add word:', error);
      toast({
        title: "錯誤",
        description: "加入單字失敗，請稍後重試",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      {/* 加入單字浮動彈窗 */}
      <AnimatePresence>
        {showAddWord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowAddWord(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-md p-6">
                <h2 className="text-xl font-semibold mb-4 text-center">加入新單字</h2>
                <div className="space-y-4">
                  <Input
                    placeholder="輸入英文單字..."
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddWord()}
                    className="text-center"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddWord(false)}
                      className="flex-1"
                    >
                      取消
                    </Button>
                    <Button
                      onClick={handleAddWord}
                      disabled={isAdding || !newWord.trim()}
                      className="flex-1"
                    >
                      {isAdding ? '加入中...' : '確認加入'}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部導航欄 */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200"
      >
        <div className="container mx-auto max-w-5xl px-4">
          <div className="flex justify-center">
            <div className="flex items-center justify-between max-w-md w-full p-2 gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    onClick={() => handleNavigation(item)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200 min-w-0 flex-1 ${
                      item.active
                        ? 'bg-blue-100 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon 
                      size={18} 
                      className={item.id === 'add' ? 'text-green-600' : undefined}
                    />
                    <span className={`text-xs mt-1 truncate ${
                      item.id === 'add' ? 'text-green-600 font-medium' : ''
                    }`}>
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 底部留白，避免內容被導航欄遮擋 */}
      <div className="h-20"></div>
    </>
  );
};

export default BottomNavigation;