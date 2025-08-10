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

export default function StudyMode() {
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
    if (difficulty <= 1.5) return "bg-red-100 text-red-800"
    if (difficulty <= 2.5) return "bg-yellow-100 text-yellow-800"
    return "bg-green-100 text-green-800"
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
        <h3 className="text-xl font-medium mb-2">載入中...</h3>
        <p className="text-slate-600">正在為您準備複習內容</p>
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
          <h3 className="text-xl font-medium mb-2">今日複習完成！</h3>
          <p className="text-slate-600 mb-4">您已經完成了今天的所有複習</p>
          <div className="flex justify-center gap-4 text-sm text-slate-600">
            <span>今日已複習: {reviewCount} 個單字</span>
            <span>•</span>
            <span>待複習: {stats.due_today} 個</span>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={loadNextReview}
          className="border-sky-300 text-sky-700 hover:bg-sky-100"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          重新檢查
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* 統計資訊 */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 text-sm text-sky-800/80">
          <span>今日已複習: {reviewCount}</span>
          <span>待複習: {stats.due_today}</span>
          <span>總詞庫: {stats.total_words}</span>
        </div>
        <Badge className={getDifficultyColor(currentWord.difficulty)}>
          難度: {getDifficultyText(currentWord.difficulty)}
        </Badge>
      </div>

      {/* 複習進度 */}
      <div className="rounded-xl bg-sky-50/70 p-3 mb-4 ring-1 ring-sky-200/60">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-sky-800">複習進度</span>
          <span className="text-sm text-sky-600">間隔: {currentWord.interval} 天</span>
        </div>
        <Progress value={Math.min((reviewCount / Math.max(stats.due_today, 1)) * 100, 100)} className="h-2" />
      </div>

      {/* 單字卡片 */}
      <Card className="w-full h-[420px] flex flex-col ring-1 ring-white/60 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-between items-start mb-4">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(currentWord.next_review).toLocaleDateString()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              ID: {currentWord.id}
            </Badge>
          </div>
          <CardTitle className="text-3xl mt-4">{currentWord.word}</CardTitle>
          {(() => {
            const exampleSentence = getExampleSentence(currentWord)
            return exampleSentence ? (
              <CardDescription className="text-sm mt-2 text-slate-600 italic line-clamp-2">
                "{exampleSentence}"
              </CardDescription>
            ) : null
          })()}
        </CardHeader>

        <CardContent className="flex-grow flex items-center justify-center px-6">
          <Button
            variant="outline"
            size="lg"
            onClick={handleToggleDefinition}
            className="px-8 bg-transparent border-sky-300 text-sky-700 hover:bg-sky-100"
            disabled={isLoading}
          >
            顯示解釋
          </Button>
        </CardContent>

        <CardFooter className="flex justify-between pt-6 pb-6 border-t bg-sky-50/60">
          {/* Left side - Mastered button */}
          <Button
            variant="outline"
            size="sm"
            className="text-purple-600 border-purple-200 hover:bg-purple-50 bg-transparent"
            onClick={() => handleSubmitReview('mastered')}
            disabled={isLoading}
          >
            <Check className="h-4 w-4 mr-1" />
            完全掌握
          </Button>
          
          {/* Right side - Other buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="text-green-600 border-green-200 hover:bg-green-50 bg-transparent"
              onClick={() => handleSubmitReview('easy')}
              disabled={isLoading}
            >
              <Check className="h-4 w-4 mr-1" />
              容易
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 bg-transparent"
              onClick={() => handleSubmitReview('hard')}
              disabled={isLoading}
            >
              <Clock className="h-4 w-4 mr-1" />
              困難
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 border-red-200 hover:bg-red-50 bg-transparent"
              onClick={() => handleSubmitReview('again')}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              重新開始
            </Button>
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
      />
    </div>
  )
}