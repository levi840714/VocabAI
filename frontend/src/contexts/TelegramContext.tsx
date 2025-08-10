import React, { createContext, useContext, useEffect } from 'react';
import { useTelegram } from '../hooks/use-telegram';
import { vocabotAPI } from '@/lib/api';

interface TelegramContextType {
  isReady: boolean;
  isTelegramWebApp: boolean;
  user: {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
  } | null;
  theme: Record<string, string>;
  expandApp: () => void;
  closeApp: () => void;
  showMainButton: (text: string, onClick: () => void) => void;
  hideMainButton: () => void;
}

const TelegramContext = createContext<TelegramContextType | null>(null);

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const telegram = useTelegram();

  // 當 Telegram 驗證數據變化時，更新 API 客戶端
  useEffect(() => {
    if (telegram.isReady) {
      vocabotAPI.setTelegramAuth(telegram.authData);
      
      console.log('Telegram context initialized:', {
        isTelegramWebApp: telegram.isTelegramWebApp,
        hasUser: !!telegram.user,
        hasAuthData: !!telegram.authData
      });
    }
  }, [telegram.isReady, telegram.authData]);

  return (
    <TelegramContext.Provider value={telegram}>
      {children}
    </TelegramContext.Provider>
  );
}

export function useTelegramContext() {
  const context = useContext(TelegramContext);
  if (!context) {
    throw new Error('useTelegramContext must be used within a TelegramProvider');
  }
  return context;
}

// 便利的 Hook：獲取當前用戶資訊
export function useCurrentUser() {
  const { user, isTelegramWebApp } = useTelegramContext();
  
  // 在本地開發環境下，如果沒有 Telegram 用戶，返回測試用戶
  if (!user && !isTelegramWebApp) {
    const isLocal = window.location.hostname === 'localhost' || 
                   window.location.hostname === '127.0.0.1';
    
    if (isLocal) {
      return {
        id: 613170570,
        first_name: 'Local Test User',
        username: 'test_user',
        language_code: 'zh-TW'
      };
    }
  }
  
  return user;
}

// 便利的 Hook：檢查用戶是否已認證
export function useAuth() {
  const { isTelegramWebApp, user } = useTelegramContext();
  const currentUser = useCurrentUser();
  
  const isAuthenticated = isTelegramWebApp ? !!user : !!currentUser;
  const isLocalTestMode = !isTelegramWebApp && !!currentUser;
  
  return {
    isAuthenticated,
    isLocalTestMode,
    user: currentUser
  };
}