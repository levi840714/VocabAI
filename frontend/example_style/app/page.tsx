import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import VocabularyList from "@/components/vocabulary-list"
import AddWordForm from "@/components/add-word-form"
import StudyMode from "@/components/study-mode"
import ProgressTracker from "@/components/progress-tracker"

export default function Home() {
  return (
    <main className="container mx-auto p-4 max-w-5xl">
      {/* Glass hero sitting on blended background */}
      <section className="relative overflow-hidden rounded-2xl bg-white/65 backdrop-blur-xl p-6 md:p-10 shadow-xl ring-1 ring-blue-200/50">
        <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">單字學習 App</h1>
            <p className="mt-3 text-slate-700">豐富多彩的學習體驗：建立清單、用閃卡練習，並追蹤你的學習進度。</p>
            <a
              href="#main-tabs"
              className="mt-6 inline-flex items-center rounded-full bg-blue-600 px-4 py-2 text-white font-medium shadow hover:bg-blue-700 transition-colors"
            >
              立即開始學習
            </a>
          </div>
          <div className="relative h-36 md:h-40 lg:h-48">
            <Image src="/illustrations/learn.png" alt="學習插畫" fill className="object-contain" priority />
          </div>
        </div>
      </section>

      {/* Tabs on soft glass surface */}
      <section id="main-tabs" className="mt-8">
        <div className="rounded-2xl bg-white/75 backdrop-blur-md p-3 ring-1 ring-blue-200/40 shadow-lg">
          <Tabs defaultValue="vocabulary" className="w-full">
            <TabsList className="grid grid-cols-4 mb-6 rounded-xl bg-blue-50/70 p-1">
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
                學習模式
              </TabsTrigger>
              <TabsTrigger
                value="progress"
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
              >
                學習進度
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
          </Tabs>
        </div>
      </section>
    </main>
  )
}
