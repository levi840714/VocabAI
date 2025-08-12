import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useVocabulary } from "@/hooks/use-vocabulary"
import { BookOpen, CheckCircle, Clock, TrendingUp, Calendar, BarChart3, Brain, Target } from "lucide-react"
import { useState, useEffect } from "react"

export default function ProgressTracker() {
  const { words, stats, loading } = useVocabulary()
  const [dailyGoal, setDailyGoal] = useState(10) // Default daily review goal
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
      </div>
    )
  }
  
  const totalWords = stats?.total_words || words.length
  const dueToday = stats?.due_today || 0
  const reviewedToday = stats?.reviewed_today || 0
  const difficultyStats = stats?.difficulty_distribution || {}
  
  // Calculate progress metrics
  const dailyProgress = dailyGoal > 0 ? Math.min((reviewedToday / dailyGoal) * 100, 100) : 0
  const reviewProgress = dueToday > 0 ? (reviewedToday / dueToday) * 100 : 100
  
  // Difficulty distribution
  const easyWords = difficultyStats[1] || 0
  const mediumWords = difficultyStats[2] || 0
  const hardWords = difficultyStats[3] || 0
  
  // 最近添加的單字
  const recentWords = words
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, 5)

  return (
    <div className="space-y-6">
      {/* 今日複習進度卡片 */}
      <Card className="bg-gradient-to-r from-blue-50/80 to-sky-50/80 dark:from-blue-900/20 dark:to-sky-900/20 backdrop-blur-sm ring-1 ring-blue-200/40 dark:ring-blue-700/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            今日複習目標
          </CardTitle>
          <CardDescription>您的每日學習進度</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">今日複習進度</span>
            <span className="text-sm text-slate-600 dark:text-slate-300">{reviewedToday}/{dueToday}</span>
          </div>
          <Progress value={reviewProgress} className="h-3" />
          <div className="flex justify-between items-center mt-2">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              已完成 {reviewProgress.toFixed(1)}% 的今日複習
            </span>
            <Badge variant={reviewProgress >= 100 ? "default" : "secondary"}>
              {reviewProgress >= 100 ? "已完成！" : "進行中"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 總體學習統計 */}
      <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm ring-1 ring-white/60 dark:ring-slate-700/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            間隔複習系統統計
          </CardTitle>
          <CardDescription>基於記憶曲線的學習分析</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{easyWords}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">容易掌握</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{mediumWords}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">中等難度</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{hardWords}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">需要加強</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 統計卡片網格 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm ring-1 ring-white/60 dark:ring-slate-700/60">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalWords}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">總單字數</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm ring-1 ring-white/60 dark:ring-slate-700/60">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{dueToday}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">今日待複習</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm ring-1 ring-white/60 dark:ring-slate-700/60">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{reviewedToday}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">今日已複習</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm ring-1 ring-white/60 dark:ring-slate-700/60">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">{Math.max(0, dueToday - reviewedToday)}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">剩餘待複習</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近添加的單字 */}
      {recentWords.length > 0 && (
        <Card className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm ring-1 ring-white/60 dark:ring-slate-700/60">
          <CardHeader>
            <CardTitle>最近添加的單字</CardTitle>
            <CardDescription>您最新加入的學習單字</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentWords.map((word) => (
                <div key={word.id} className="flex items-center justify-between p-3 rounded-lg bg-sky-50/50 dark:bg-sky-900/20">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{word.term}</span>
                      <Badge
                        variant={word.learned ? "outline" : "secondary"}
                        className={
                          word.learned
                            ? "border-cyan-400 dark:border-cyan-500 text-cyan-700 dark:text-cyan-300"
                            : "bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100"
                        }
                      >
                        {word.learned ? "已學會" : "學習中"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{word.definition}</p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(word.dateAdded).toLocaleDateString('zh-TW')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 學習建議 */}
      <Card className="bg-gradient-to-r from-green-50/80 to-emerald-50/80 dark:from-green-900/20 dark:to-emerald-900/20 backdrop-blur-sm ring-1 ring-green-200/40 dark:ring-green-700/40">
        <CardHeader>
          <CardTitle className="text-green-800 dark:text-green-200">間隔複習建議</CardTitle>
          <CardDescription className="text-green-600 dark:text-green-300">基於科學記憶曲線的個人化建議</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-green-700 dark:text-green-200">
            {dueToday > reviewedToday && (
              <p>• 您還有 {dueToday - reviewedToday} 個單字需要今日複習，建議完成後休息</p>
            )}
            {reviewedToday >= dueToday && dueToday > 0 && (
              <p>• 🎉 太棒了！您已完成今日所有複習任務</p>
            )}
            {hardWords > 0 && (
              <p>• 注意：有 {hardWords} 個單字標記為困難，建議增加複習頻率</p>
            )}
            {totalWords < 10 && (
              <p>• 建議添加更多單字到詞庫，至少 20-30 個詞彙較為理想</p>
            )}
            {reviewedToday === 0 && dueToday > 0 && (
              <p>• 今天還沒有開始複習，立即前往「間隔複習」開始學習吧！</p>
            )}
            {totalWords >= 50 && reviewProgress >= 100 && (
              <p>• 優秀！您已建立良好的學習習慣，詞彙量不斷增長</p>
            )}
            {totalWords === 0 && (
              <p>• 開始您的科學記憶之旅！添加第一個單字體驗間隔重複演算法</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}