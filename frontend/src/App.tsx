import React from "react"
import { ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import { VocabularyProvider } from "@/hooks/use-vocabulary"
import { Toaster } from "@/components/ui/toaster"
import { TelegramProvider, useAuth } from "@/contexts/TelegramContext"
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext"
import { createVocabotMuiTheme } from "@/theme/muiTheme"
import BackgroundScene from "@/components/background-scene"
import AppRouter from "@/router/AppRouter"
import { User } from "lucide-react"

// 應用程式內容組件（有設定 context）
function AppContent() {
  const { isAuthenticated } = useAuth();
  const { isDarkMode } = useSettings();

  // 創建 MUI 主題
  const muiTheme = createVocabotMuiTheme(isDarkMode);

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
        <AppRouter />
        <Toaster />
      </VocabularyProvider>
    </ThemeProvider>
  );
}

// 主要應用程式組件
function MainApp() {
  return (
    <SettingsProvider>
      <AppContent />
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