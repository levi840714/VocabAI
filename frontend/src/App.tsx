import React from "react"
import { VocabularyProvider } from "@/hooks/use-vocabulary"
import { Toaster } from "@/components/ui/toaster"
import { TelegramProvider, useAuth } from "@/contexts/TelegramContext"
import BackgroundScene from "@/components/background-scene"
import AppRouter from "@/router/AppRouter"
import { User } from "lucide-react"

// 主要應用程式組件
function MainApp() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <BackgroundScene />
        <div className="relative z-10 text-center">
          <div className="rounded-2xl bg-white/80 backdrop-blur-xl p-8 shadow-xl ring-1 ring-red-200/50 max-w-md mx-auto">
            <User className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">需要授權</h2>
            <p className="text-slate-600 mb-4">
              請通過 Telegram Mini App 訪問此應用程式
            </p>
            <p className="text-sm text-slate-500">
              此應用程式僅支援授權用戶使用
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <VocabularyProvider>
      <AppRouter />
      <Toaster />
    </VocabularyProvider>
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