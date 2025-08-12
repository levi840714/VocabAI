import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/TelegramContext';
import { Bot, Smartphone, ArrowLeft } from 'lucide-react';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isLocalTestMode, user } = useAuth();
  const isHomePage = location.pathname === '/';

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <motion.div 
      className="container mx-auto p-4 max-w-5xl"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* 用戶狀態指示器 */}
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
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-500">已連接</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Header;