import React, { useEffect } from "react"
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { VocabularyProvider } from "@/hooks/use-vocabulary"
import { Toaster } from "@/components/ui/toaster"
import { TelegramProvider, useAuth } from "@/contexts/TelegramContext"
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext"
import { ClickableTextProvider } from "@/contexts/ClickableTextContext"
import { BackgroundProvider } from "@/contexts/BackgroundContext"
import { createMemWhizMuiTheme } from "@/theme/muiTheme"
import BackgroundScene from "@/components/background-scene"
import AppRouter from "@/router/AppRouter"
import { User } from "lucide-react"

// 早期主題應用函數
const applyEarlyTheme = () => {
  try {
    console.log('🚀 [Early Theme] 開始早期主題應用');
    const localSettings = localStorage.getItem('memwhiz_user_settings');
    if (localSettings) {
      const parsed = JSON.parse(localSettings);
      const themeMode = parsed.interface_settings?.theme_mode || 'light';
      console.log('📱 [Early Theme] 從本地儲存讀取主題:', themeMode);
      
      const root = document.documentElement;
      if (themeMode === 'dark') {
        root.classList.add('dark');
        console.log('🌙 [Early Theme] 應用深色模式');
      } else if (themeMode === 'light') {
        root.classList.remove('dark');
        console.log('☀️ [Early Theme] 應用淺色模式');
      } else if (themeMode === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          root.classList.add('dark');
          console.log('🌙 [Early Theme] 自動模式：應用深色模式');
        } else {
          root.classList.remove('dark');
          console.log('☀️ [Early Theme] 自動模式：應用淺色模式');
        }
      }
      
      console.log('✅ [Early Theme] 當前 HTML classes:', root.className);
    } else {
      console.log('❌ [Early Theme] 沒有找到本地設定');
    }
  } catch (err) {
    console.error('❌ [Early Theme] 早期主題應用失敗:', err);
  }
};

// 在模組載入時立即嘗試應用主題
applyEarlyTheme();

// 應用程式內容組件（有設定 context）
function AppContent() {
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useSettings();

  // 創建 MUI 主題
  const muiTheme = createMemWhizMuiTheme(isDarkMode);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BackgroundScene />
        <div className="relative z-10 text-center">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-8 shadow-xl ring-1 ring-red-200/50 dark:ring-red-700/50 max-w-md mx-auto">
            <User className="w-16 h-16 mx-auto text-red-500 dark:text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">需要授權</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              請通過 Telegram Mini App 訪問此應用程式
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              此應用程式僅支援授權用戶使用
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <VocabularyProvider>
        <ClickableTextProvider>
          <AppRouter />
          <Toaster />
        </ClickableTextProvider>
      </VocabularyProvider>
    </ThemeProvider>
  );
}

// 主要應用程式組件
function MainApp() {
  return (
    <SettingsProvider>
      <BackgroundProvider>
        <AppContent />
      </BackgroundProvider>
    </SettingsProvider>
  );
}

// 根組件
export default function App() {
  return (
    <TelegramProvider>
      <MainApp />
    </TelegramProvider>
  );
}