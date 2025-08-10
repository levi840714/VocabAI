import { useState, useEffect } from 'react';

// Telegram Web App 類型聲明
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
            photo_url?: string;
          };
          auth_date?: number;
          start_param?: string;
          chat_instance?: string;
          chat_type?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          setText: (text: string) => void;
          onClick: (callback: () => void) => void;
          offClick: (callback: () => void) => void;
        };
      };
    };
  }
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

interface UseTelegramReturn {
  isReady: boolean;
  isTelegramWebApp: boolean;
  user: TelegramUser | null;
  authData: string | null;
  theme: Record<string, string>;
  expandApp: () => void;
  closeApp: () => void;
  showMainButton: (text: string, onClick: () => void) => void;
  hideMainButton: () => void;
}

export function useTelegram(): UseTelegramReturn {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [authData, setAuthData] = useState<string | null>(null);

  useEffect(() => {
    // 檢查是否在 Telegram Web App 環境中
    if (!window.Telegram?.WebApp) {
      console.log('Not running in Telegram Web App environment');
      setIsReady(true);
      return;
    }

    const webApp = window.Telegram.WebApp;
    
    try {
      // 初始化 Telegram Web App
      webApp.ready();
      webApp.expand();

      // 設置用戶資訊
      if (webApp.initDataUnsafe?.user) {
        setUser(webApp.initDataUnsafe.user);
      }

      // 設置驗證數據
      if (webApp.initData) {
        setAuthData(webApp.initData);
      }

      console.log('Telegram Web App initialized:', {
        user: webApp.initDataUnsafe?.user,
        hasInitData: !!webApp.initData
      });

    } catch (error) {
      console.error('Error initializing Telegram Web App:', error);
    } finally {
      setIsReady(true);
    }
  }, []);

  const isTelegramWebApp = !!window.Telegram?.WebApp && !!authData;

  const theme = window.Telegram?.WebApp?.themeParams || {};

  const expandApp = () => {
    window.Telegram?.WebApp?.expand();
  };

  const closeApp = () => {
    window.Telegram?.WebApp?.close();
  };

  const showMainButton = (text: string, onClick: () => void) => {
    const mainButton = window.Telegram?.WebApp?.MainButton;
    if (mainButton) {
      mainButton.setText(text);
      mainButton.show();
      mainButton.onClick(onClick);
    }
  };

  const hideMainButton = () => {
    const mainButton = window.Telegram?.WebApp?.MainButton;
    if (mainButton) {
      mainButton.hide();
    }
  };

  return {
    isReady,
    isTelegramWebApp,
    user,
    authData,
    theme,
    expandApp,
    closeApp,
    showMainButton,
    hideMainButton
  };
}

// 輔助函數：創建 Telegram 驗證標頭
export function createTelegramAuthHeader(initData: string | null): Record<string, string> {
  if (!initData) {
    return {};
  }
  
  return {
    'Authorization': `Bearer tma ${initData}`
  };
}

// 輔助函數：檢查是否在本地開發環境
export function isLocalDevelopment(): boolean {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('localhost');
}