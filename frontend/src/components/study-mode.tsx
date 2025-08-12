import { useState, useEffect } from "react"
import { RefreshCw, Check, Clock, RotateCcw } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { vocabotAPI, type WordDetail } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import StructuredWordDetailsDialog from "./StructuredWordDetailsDialog"
import { parseStructuredResponse } from "@/lib/parseStructuredResponse"

interface StudyModeProps {
  onAIAnalysisClick?: (word: string) => void;
}

export default function StudyMode({ onAIAnalysisClick }: StudyModeProps) {
  const [currentWord, setCurrentWord] = useState<WordDetail | null>(null)
  const [showDefinitionDialog, setShowDefinitionDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reviewCount, setReviewCount] = useState(0)
  const [stats, setStats] = useState({ total_words: 0, due_today: 0, reviewed_today: 0 })
  const { toast } = useToast()

  useEffect(() => {
    loadNextReview()
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const statsData = await vocabotAPI.getStats()
      setStats(statsData)
    } catch (error) {
      console.error('載入統計失敗:', error)
    }
  }

  const loadNextReview = async () => {
    setIsLoading(true)
    try {
      const result = await vocabotAPI.getNextReview()
      
      if ('message' in result) {
        setCurrentWord(null)
        toast({
          title: "太棒了！",
          description: result.message,
        })
      } else {
        setCurrentWord(result)
        setShowDefinitionDialog(false)
      }
    } catch (error) {
      console.error('載入複習單字失敗:', error)
      toast({
        title: "載入失敗",
        description: "無法載入下一個複習單字",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitReview = async (response: 'easy' | 'hard' | 'again' | 'mastered') => {
    if (!currentWord) return
    
    setIsLoading(true)
    try {
      const result = await vocabotAPI.submitReview(currentWord.id, response)
      
      toast({
        title: "複習完成",
        description: result.next_review_date ? 
          `下次複習時間：${new Date(result.next_review_date).toLocaleDateString()}` : 
          result.message,
      })
      
      setReviewCount(prev => prev + 1)
      await loadStats()
      await loadNextReview()
      
    } catch (error) {
      console.error('提交複習結果失敗:', error)
      toast({
        title: "提交失敗",
        description: "無法提交複習結果",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleDefinition = () => setShowDefinitionDialog(true)

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 1.5) return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
    if (difficulty <= 2.5) return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
    return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
  }

  const getDifficultyText = (difficulty: number) => {
    if (difficulty <= 1.5) return "困難"
    if (difficulty <= 2.5) return "中等"
    return "容易"
  }

  const getExampleSentence = (word: WordDetail): string | null => {
    if (!word.initial_ai_explanation) return null
    
    // Try to parse structured data and extract first example
    const structuredData = parseStructuredResponse(word.initial_ai_explanation)
    if (structuredData && structuredData.examples && structuredData.examples.length > 0) {
      return structuredData.examples[0]
    }
    
    return null
  }

  if (isLoading && !currentWord) {
    return (
      <div className="text-center py-10">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-sky-600" />
        <h3 className="text-xl font-medium mb-2 text-slate-900 dark:text-white">載入中...</h3>
        <p className="text-slate-600 dark:text-slate-300">正在為您準備複習內容</p>
      </div>
    )
  }

  if (!currentWord) {
    return (
      <div className="text-center py-10">
        <div className="mb-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-medium mb-2 text-slate-900 dark:text-white">今日複習完成！</h3>
          <p className="text-slate-600 dark:text-slate-300 mb-4">您已經完成了今天的所有複習</p>
          <div className="flex justify-center gap-4 text-sm text-slate-600 dark:text-slate-300">
            <span>今日已複習: {reviewCount} 個單字</span>
            <span>•</span>
            <span>待複習: {stats.due_today} 個</span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadNextReview}
          className="border-sky-300 dark:border-sky-600 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/30"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          重新檢查
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* 統計資訊 - 修復間距問題 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div className="flex flex-wrap gap-2 md:gap-4 text-sm text-sky-800/80 dark:text-sky-200">
          <span className="bg-sky-50 dark:bg-sky-900/30 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">已複習: {reviewCount}</span>
          <span className="bg-orange-50 dark:bg-orange-900/30 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">待複習: {stats.due_today}</span>
          <span className="bg-purple-50 dark:bg-purple-900/30 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">總詞庫: {stats.total_words}</span>
        </div>
        <Badge className={`${getDifficultyColor(currentWord.difficulty)} px-3 py-1`}>
          難度: {getDifficultyText(currentWord.difficulty)}
        </Badge>
      </div>

      {/* 複習進度 - 美化設計 */}
      <div className="rounded-xl bg-gradient-to-r from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 p-4 mb-6 ring-1 ring-sky-200/60 dark:ring-sky-700/60 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-sky-800 dark:text-sky-200">本次複習進度</span>
          <div className="flex items-center space-x-2 text-sm text-sky-600 dark:text-sky-300">
            <span>間隔: {currentWord.interval} 天</span>
            <div className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></div>
          </div>
        </div>
        <Progress value={Math.min((reviewCount / Math.max(stats.due_today, 1)) * 100, 100)} className="h-3 bg-sky-100" />
        <div className="mt-2 text-xs text-sky-600 dark:text-sky-300 text-center">
          {Math.min((reviewCount / Math.max(stats.due_today, 1)) * 100, 100).toFixed(0)}% 完成
        </div>
      </div>

      {/* 單字卡片 - 美化設計 */}
      <Card className="w-full min-h-[380px] sm:h-[420px] flex flex-col ring-1 ring-slate-200/50 dark:ring-slate-700/50 bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-800 dark:to-slate-800/70 backdrop-blur-sm shadow-lg">
        <CardHeader className="text-center pb-2 px-4 sm:px-6">
          <div className="flex justify-between items-start mb-4">
            <Badge variant="outline" className="text-xs bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(currentWord.next_review).toLocaleDateString()}
            </Badge>
            <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600">
              #{currentWord.id}
            </Badge>
          </div>
          <div className="mt-6 mb-4">
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
              {currentWord.word}
            </CardTitle>
            <div className="w-16 h-1 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full mx-auto"></div>
          </div>
          {(() => {
            const exampleSentence = getExampleSentence(currentWord)
            return exampleSentence ? (
              <CardDescription className="text-sm mt-4 text-slate-600 dark:text-slate-300 italic line-clamp-2 px-2">
                <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 border-l-4 border-sky-300 dark:border-sky-600">
                  "{exampleSentence}"
                </div>
              </CardDescription>
            ) : null
          })()}
        </CardHeader>

        <CardContent className="flex-grow flex items-center justify-center px-4 sm:px-6">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleDefinition}
            className="w-16 h-16 p-0 rounded-xl bg-white/80 dark:bg-slate-700/80 border-2 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-200 shadow-md text-xs font-medium"
            disabled={isLoading}
          >
            <div className="flex flex-col items-center justify-center leading-tight">
              {isLoading ? (
                <span>載入中</span>
              ) : (
                <>
                  <span>顯示</span>
                  <span>解釋</span>
                </>
              )}
            </div>
          </Button>
        </CardContent>

        <CardFooter className="pt-4 pb-4 sm:pt-6 sm:pb-6 border-t bg-gradient-to-r from-sky-50/60 to-blue-50/40 dark:from-sky-900/20 dark:to-blue-900/20 px-3 sm:px-6">
          {/* Mobile layout - 美化手機版按鈕 */}
          <div className="w-full space-y-3 sm:hidden">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20 transition-all duration-200 shadow-sm font-medium py-3"
              onClick={() => handleSubmitReview('mastered')}
              disabled={isLoading}
            >
              <Check className="h-4 w-4 mr-2" />
              完全掌握
            </Button>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 dark:text-green-300 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 text-xs font-medium py-3 transition-all duration-200 shadow-sm"
                onClick={() => handleSubmitReview('easy')}
                disabled={isLoading}
              >
                <Check className="h-3 w-3 mr-1" />
                容易
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/20 text-xs font-medium py-3 transition-all duration-200 shadow-sm"
                onClick={() => handleSubmitReview('hard')}
                disabled={isLoading}
              >
                <Clock className="h-3 w-3 mr-1" />
                困難
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 dark:text-red-300 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-red-900/20 dark:to-rose-900/20 text-xs font-medium py-3 transition-all duration-200 shadow-sm"
                onClick={() => handleSubmitReview('again')}
                disabled={isLoading}
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                不熟再學
              </Button>
            </div>
          </div>
          
          {/* Desktop layout - 美化桌面版按鈕 */}
          <div className="hidden sm:flex justify-between w-full items-center">
            <Button
              variant="outline"
              size="sm"
              className="text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20 transition-all duration-200 shadow-sm font-medium px-6 py-2"
              onClick={() => handleSubmitReview('mastered')}
              disabled={isLoading}
            >
              <Check className="h-4 w-4 mr-2" />
              完全掌握
            </Button>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-green-600 dark:text-green-300 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 transition-all duration-200 shadow-sm font-medium px-4 py-2"
                onClick={() => handleSubmitReview('easy')}
                disabled={isLoading}
              >
                <Check className="h-4 w-4 mr-1" />
                容易
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/20 transition-all duration-200 shadow-sm font-medium px-4 py-2"
                onClick={() => handleSubmitReview('hard')}
                disabled={isLoading}
              >
                <Clock className="h-4 w-4 mr-1" />
                困難
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 dark:text-red-300 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-red-900/20 dark:to-rose-900/20 transition-all duration-200 shadow-sm font-medium px-4 py-2"
                onClick={() => handleSubmitReview('again')}
                disabled={isLoading}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                不熟再學
              </Button>
            </div>
          </div>
        </CardFooter>
      </Card>
      
      {/* Explanation Dialog */}
      <StructuredWordDetailsDialog
        open={showDefinitionDialog}
        onClose={() => setShowDefinitionDialog(false)}
        word={currentWord || undefined}
        onNotesUpdate={() => {
          // Refresh the current word data after notes update
          loadNextReview()
        }}
        onAIAnalysisClick={onAIAnalysisClick}
      />
    </div>
  )
}