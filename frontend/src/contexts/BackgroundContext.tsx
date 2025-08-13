import React, { createContext, useContext, useState, useEffect } from 'react';
import { BackgroundThemeType } from '@/components/background-themes';

interface BackgroundContextType {
  currentTheme: BackgroundThemeType;
  setTheme: (theme: BackgroundThemeType) => void;
  availableThemes: { key: BackgroundThemeType; name: string; description: string }[];
}

const BackgroundContext = createContext<BackgroundContextType | undefined>(undefined);

export const useBackground = () => {
  const context = useContext(BackgroundContext);
  if (!context) {
    throw new Error('useBackground must be used within a BackgroundProvider');
  }
  return context;
};

interface BackgroundProviderProps {
  children: React.ReactNode;
}

export const BackgroundProvider: React.FC<BackgroundProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<BackgroundThemeType>(() => {
    // 從 localStorage 讀取保存的主題，默認為 modern（適合新首頁）
    const saved = localStorage.getItem('vocabot-background-theme');
    return (saved as BackgroundThemeType) || 'modern';
  });

  const availableThemes = [
    {
      key: 'modern' as BackgroundThemeType,
      name: '現代漸變',
      description: '適合新版首頁的現代化漸變背景'
    },
    {
      key: 'ocean' as BackgroundThemeType,
      name: '海洋深藍',
      description: '經典的海洋主題背景'
    },
    {
      key: 'study' as BackgroundThemeType,
      name: '學習專注',
      description: '溫暖的學習氛圍背景'
    },
    {
      key: 'starry' as BackgroundThemeType,
      name: '星空夜景',
      description: '夢幻的星空主題背景'
    },
    {
      key: 'minimal' as BackgroundThemeType,
      name: '簡潔商務',
      description: '簡潔專業的商務風格'
    }
  ];

  const setTheme = (theme: BackgroundThemeType) => {
    setCurrentTheme(theme);
    localStorage.setItem('vocabot-background-theme', theme);
  };

  useEffect(() => {
    // 當主題變更時，可以觸發一些額外的效果
    document.documentElement.style.setProperty('--current-bg-theme', currentTheme);
  }, [currentTheme]);

  return (
    <BackgroundContext.Provider 
      value={{ 
        currentTheme, 
        setTheme, 
        availableThemes 
      }}
    >
      {children}
    </BackgroundContext.Provider>
  );
};