import { useState, useEffect } from "react"
import { useVoice } from '@/hooks/useVoice'
import { RefreshCw, Check, Clock, RotateCcw, Volume2, RotateCcwSquare, Square } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { memWhizAPI, type WordDetail } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { parseStructuredResponse } from "@/lib/parseStructuredResponse"
import { motion } from "framer-motion"

interface StudyModeProps {
  onAIAnalysisClick?: (word: string) => void;
}

export default function StudyMode({ onAIAnalysisClick }: StudyModeProps) {
  const { toggleSpeakWord, isPlaying } = useVoice()
  const [currentWord, setCurrentWord] = useState<WordDetail | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reviewCount, setReviewCount] = useState(0)
  const [stats, setStats] = useState({ total_words: 0, due_today: 0, reviewed_today: 0 })
  const [isTransitioning, setIsTransitioning] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadNextReview()
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const statsData = await memWhizAPI.getStats()
      setStats(statsData)
    } catch (error) {
      console.error('載入統計失敗:', error)
    }
  }

  const loadNextReview = async () => {
    setIsLoading(true)
    try {
      const result = await memWhizAPI.getNextReview()
      
      if ('message' in result) {
        setCurrentWord(null)
        toast({
          title: "太棒了！",
          description: result.message,
        })
      } else {
        setCurrentWord(result)
        setIsFlipped(false) // 重置翻牌狀態
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
    setIsTransitioning(true)
    
    try {
      const result = await memWhizAPI.submitReview(currentWord.id, response)
      
      toast({
        title: "複習完成",
        description: result.next_review_date ? 
          `下次複習時間：${new Date(result.next_review_date).toLocaleDateString()}` : 
          result.message,
      })
      
      setReviewCount(prev => prev + 1)
      await loadStats()
      
      // 等待退場動畫完成後再載入下一個單字
      setTimeout(async () => {
        await loadNextReview()
        setIsTransitioning(false)
      }, 400)
      
    } catch (error) {
      console.error('提交複習結果失敗:', error)
      toast({
        title: "提交失敗",
        description: "無法提交複習結果",
        variant: "destructive"
      })
      setIsTransitioning(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFlipCard = () => setIsFlipped(!isFlipped)

  const handlePronunciation = async (text: string) => {
    await toggleSpeakWord(text)
  }

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

  const getStructuredData = (word: WordDetail) => {
    if (!word.initial_ai_explanation) return null
    return parseStructuredResponse(word.initial_ai_explanation)
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
      {/* 統計資訊 - 四個標籤並排 */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        <span className="bg-sky-50 dark:bg-sky-900/30 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm text-sky-800 dark:text-sky-200">已複習: {reviewCount}</span>
        <span className="bg-orange-50 dark:bg-orange-900/30 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm text-orange-800 dark:text-orange-200">待複習: {stats.due_today}</span>
        <span className="bg-purple-50 dark:bg-purple-900/30 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm text-purple-800 dark:text-purple-200">總詞庫: {stats.total_words}</span>
        <span className={`${getDifficultyColor(currentWord.difficulty)} px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm`}>
          難度: {getDifficultyText(currentWord.difficulty)}
        </span>
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

      {/* 翻轉卡片容器 */}
      <div className="relative w-full h-[320px] sm:h-[350px] perspective-1000">
        <motion.div
          className="relative w-full h-full preserve-3d cursor-pointer"
          animate={{ 
            rotateY: isFlipped ? 180 : 0,
            scale: isTransitioning ? 0.95 : 1,
            opacity: isTransitioning ? 0.7 : 1
          }}
          transition={{ 
            rotateY: { duration: 0.6, ease: "easeInOut" },
            scale: { duration: 0.4, ease: "easeInOut" },
            opacity: { duration: 0.4, ease: "easeInOut" }
          }}
          onClick={handleFlipCard}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* 正面 - 單字卡片 */}
          <Card className="absolute inset-0 w-full h-full flex flex-col ring-1 ring-slate-200/50 dark:ring-slate-700/50 bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-800 dark:to-slate-800/70 backdrop-blur-sm shadow-lg"
                style={{ backfaceVisibility: 'hidden' }}>
            <CardHeader className="text-center pb-1 px-4 sm:px-6">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="text-xs bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-700">
                  <Clock className="h-3 w-3 mr-1" />
                  {new Date(currentWord.next_review).toLocaleDateString()}
                </Badge>
                <Badge variant="outline" className="text-xs bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600">
                  #{currentWord.id}
                </Badge>
              </div>
              <div className="mt-3 mb-3">
                <div className="relative mb-2">
                  {/* 單字標題 - 完全置中 */}
                  <CardTitle className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 dark:text-white text-center">
                    {currentWord.word}
                  </CardTitle>
                  {/* 喇叭按鈕 - 絕對定位於右側 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePronunciation(currentWord.word)
                    }}
                    className="absolute right-0 top-1/2 transform -translate-y-1/2 p-2 h-auto text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30"
                  >
                    {isPlaying ? <Square className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                </div>
                <div className="w-16 h-1 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full mx-auto"></div>
              </div>
              {(() => {
                const exampleSentence = getExampleSentence(currentWord)
                return exampleSentence ? (
                  <div className="text-sm mt-2 text-slate-600 dark:text-slate-300 italic line-clamp-2 px-2">
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-2 border-l-4 border-sky-300 dark:border-sky-600">
                      "{exampleSentence}"
                    </div>
                  </div>
                ) : null
              })()}
            </CardHeader>

            <CardContent className="flex items-center justify-center px-4 sm:px-6 py-4">
              <div className="text-center opacity-60">
                <RotateCcwSquare className="h-5 w-5 mx-auto mb-1 text-slate-400 dark:text-slate-500" />
                <p className="text-xs text-slate-500 dark:text-slate-400">點擊查看解釋</p>
              </div>
            </CardContent>
          </Card>

          {/* 背面 - 解釋內容 */}
          <Card 
            className="absolute inset-0 w-full h-full flex flex-col ring-1 ring-slate-200/50 dark:ring-slate-700/50 bg-gradient-to-br from-emerald-50 to-teal-50/30 dark:from-emerald-900/20 dark:to-teal-900/20 backdrop-blur-sm shadow-lg"
            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
          >
            <CardHeader className="text-center pb-1 px-4 sm:px-6">
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700">
                  解釋
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFlipCard()
                  }}
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  <RotateCcwSquare className="h-4 w-4 mr-1" />
                  返回
                </Button>
              </div>
              <CardTitle className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {currentWord.word}
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-grow overflow-y-auto px-4 sm:px-6">
              {(() => {
                const structuredData = getStructuredData(currentWord)
                if (structuredData) {
                  return (
                    <div className="space-y-3 text-sm leading-relaxed">
                      {/* 音標 */}
                      {structuredData.phonetic && (
                        <div className="text-center">
                          <span className="text-xl text-slate-600 dark:text-slate-300 font-mono tracking-wide">
                            {structuredData.phonetic}
                          </span>
                        </div>
                      )}

                      {/* 定義 */}
                      {structuredData.definitions && structuredData.definitions.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">定義：</h4>
                          <ul className="space-y-2">
                            {structuredData.definitions.slice(0, 3).map((def, index) => (
                              <li key={index} className="text-slate-800 dark:text-slate-200">
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                                  {def.part_of_speech}
                                </span>
                                <ul className="mt-1 ml-4 space-y-1">
                                  {def.meanings.slice(0, 2).map((meaning, mIndex) => (
                                    <li key={mIndex} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                      • {meaning.definition}
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 例句 */}
                      {structuredData.examples && structuredData.examples.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">例句：</h4>
                          <div className="space-y-2">
                            {structuredData.examples.slice(0, 2).map((example, index) => (
                              <div key={index} className="bg-white/60 dark:bg-slate-700/60 rounded-lg p-3 italic text-slate-800 dark:text-slate-200 text-sm leading-relaxed">
                                "{example}"
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handlePronunciation(example)
                                  }}
                                  className="ml-2 p-1 h-auto text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300"
                                >
                                  {isPlaying ? <Square className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 同義詞 */}
                      {structuredData.synonyms && structuredData.synonyms.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">同義詞：</h4>
                          <div className="flex flex-wrap gap-2">
                            {structuredData.synonyms.slice(0, 6).map((synonym, index) => (
                              <Badge key={index} variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-900/30 font-medium">
                                {synonym}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                } else {
                  return (
                    <div className="text-center text-slate-600 dark:text-slate-400">
                      <p>解釋內容載入中...</p>
                    </div>
                  )
                }
              })()}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 複習評估按鈕 - 始終顯示 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: isTransitioning ? 0.5 : 1, 
          y: isTransitioning ? 10 : 0,
          scale: isTransitioning ? 0.98 : 1
        }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
          <Card className="mt-6">
            <CardFooter className="pt-4 pb-4 sm:pt-6 sm:pb-6 border-t bg-gradient-to-r from-emerald-50/60 to-teal-50/40 dark:from-emerald-900/20 dark:to-teal-900/20 px-3 sm:px-6">
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
      </motion.div>
    </div>
  )
}
