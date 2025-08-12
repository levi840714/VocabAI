import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/TelegramContext';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { useToast } from '@/hooks/use-toast';
import { Bot, Smartphone, ArrowLeft, Home, BookOpen, Plus, Brain, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLocalTestMode, user } = useAuth();
  const { isMobile } = useDeviceDetection();
  const { addWord } = useVocabulary();
  const { toast } = useToast();
  const [showAddWord, setShowAddWord] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  
  const isHomePage = location.pathname === '/';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
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

  const navItems = [
    { id: 'home', label: '首頁', icon: Home, path: '/' },
    { id: 'vocabulary', label: '單字庫', icon: BookOpen, path: '/vocabulary' },
    { id: 'add', label: '加入單字', icon: Plus, action: () => setShowAddWord(true) },
    { id: 'ai-analysis', label: 'AI 解析', icon: Brain, path: '/ai-analysis' },
    { id: 'progress', label: '學習進度', icon: BarChart, path: '/progress' }
  ];

  if (!isAuthenticated) return null;

  return (
    <>
      {/* 加入單字浮動彈窗 - 桌面版 */}
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

      <motion.div 
        className="container mx-auto p-4 max-w-5xl"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* 用戶狀態指示器和導航 */}
        <div className="rounded-lg bg-white/60 backdrop-blur-sm p-3 shadow-sm ring-1 ring-blue-200/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {!isHomePage && (
                <motion.button
                  onClick={handleBack}
                  className="p-2 rounded-lg bg-blue-100/50 hover:bg-blue-100 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft className="w-4 h-4 text-blue-600" />
                </motion.button>
              )}
              
              {isLocalTestMode ? (
                <>
                  <Smartphone className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-medium text-slate-700">
                    本地測試模式 - {user?.first_name}
                  </span>
                </>
              ) : (
                <>
                  <Bot className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Telegram 用戶 - {user?.first_name}
                  </span>
                </>
              )}
            </div>

            <div className="flex items-center space-x-4">
              {/* 桌面版導航連結 */}
              {!isMobile && (
                <div className="hidden lg:flex items-center space-x-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.path === location.pathname;
                    return (
                      <motion.button
                        key={item.id}
                        onClick={() => item.action ? item.action() : navigate(item.path!)}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-blue-100 text-blue-700'
                            : item.id === 'add'
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={item.label}
                      >
                        <Icon size={16} />
                        <span className="hidden xl:inline">{item.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              )}

              {/* 連接狀態 */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-500">已連接</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default Header;