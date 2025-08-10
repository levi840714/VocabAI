import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VocabularyProvider } from "@/hooks/use-vocabulary"
import { Toaster } from "@/components/ui/toaster"
import { TelegramProvider, useAuth } from "@/contexts/TelegramContext"
import BackgroundScene from "@/components/background-scene"
import VocabularyList from "@/components/vocabulary-list"
import AddWordForm from "@/components/add-word-form"
import StudyMode from "@/components/study-mode"
import ProgressTracker from "@/components/progress-tracker"
import TestStructuredDisplay from "@/components/TestStructuredDisplay"
import { Bot, User, Smartphone } from "lucide-react"

// 主要應用程式組件
function MainApp() {
  const { isAuthenticated, isLocalTestMode, user } = useAuth();

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
    <div className="min-h-screen">
      <BackgroundScene />
      <VocabularyProvider>
        <main className="container mx-auto p-4 max-w-5xl">
          {/* 用戶狀態指示器 */}
          <div className="mb-4">
            <div className="rounded-lg bg-white/60 backdrop-blur-sm p-3 shadow-sm ring-1 ring-blue-200/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
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
          </div>

          {/* Glass hero section */}
          <section className="relative overflow-hidden rounded-2xl bg-white/65 backdrop-blur-xl p-6 md:p-10 shadow-xl ring-1 ring-blue-200/50 mb-8">
            <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                  Vocabot 單字學習
                </h1>
                <p className="mt-3 text-slate-700">
                  豐富多彩的學習體驗：建立清單、用閃卡練習，並追蹤你的學習進度。
                </p>
                <a
                  href="#main-tabs"
                  className="mt-6 inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-white font-medium shadow hover:bg-blue-700 transition-colors"
                >
                  立即開始學習
                </a>
              </div>
              <div className="relative h-36 md:h-40 lg:h-48 flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center shadow-2xl">
                  <div className="text-white text-4xl font-bold">📚</div>
                </div>
              </div>
            </div>
          </section>

          {/* Tabs on soft glass surface */}
          <section id="main-tabs">
            <div className="rounded-2xl bg-white/75 backdrop-blur-md p-3 ring-1 ring-blue-200/40 shadow-lg">
              <Tabs defaultValue="vocabulary" className="w-full">
                <TabsList className="grid grid-cols-5 mb-6 rounded-xl bg-blue-50/70 p-1">
                  <TabsTrigger
                    value="vocabulary"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                  >
                    單字列表
                  </TabsTrigger>
                  <TabsTrigger
                    value="add"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                  >
                    新增單字
                  </TabsTrigger>
                  <TabsTrigger
                    value="study"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                  >
                    間隔複習
                  </TabsTrigger>
                  <TabsTrigger
                    value="progress"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                  >
                    學習進度
                  </TabsTrigger>
                  <TabsTrigger
                    value="test"
                    className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
                  >
                    <Bot className="w-4 h-4 mr-1" />
                    AI 解釋
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="vocabulary" className="mt-6">
                  <VocabularyList />
                </TabsContent>

                <TabsContent value="add" className="mt-6">
                  <AddWordForm />
                </TabsContent>

                <TabsContent value="study" className="mt-6">
                  <StudyMode />
                </TabsContent>

                <TabsContent value="progress" className="mt-6">
                  <ProgressTracker />
                </TabsContent>

                <TabsContent value="test" className="mt-6">
                  <TestStructuredDisplay />
                </TabsContent>
              </Tabs>
            </div>
          </section>
        </main>
        <Toaster />
      </VocabularyProvider>
    </div>
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