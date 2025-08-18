import { useState, useEffect, useMemo } from "react"
import { useVoice } from '@/hooks/useVoice'
import { RefreshCw, Check, Clock, RotateCcw, Volume2, RotateCcwSquare, Square, Mic, MicOff, Activity } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { memWhizAPI, type WordDetail } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { parseStructuredResponse } from "@/lib/parseStructuredResponse"
import { motion } from "framer-motion"
import { useSpeechRecognitionV2 } from '@/hooks/useSpeechRecognitionV2'
import { useAudioRecorderV2 } from '@/hooks/useAudioRecorderV2'
import { stopSpeaking } from '@/lib/voiceService'

interface StudyModeProps {
  onAIAnalysisClick?: (word: string) => void;
}

// Helper component: word-by-word diff highlight
function WordDiffHighlight({ target, recognized }: { target: string, recognized: string }) {
  // LCS-based matching to avoid cascading red after first mismatch
  const parts = useMemo(() => {
    const toTokens = (s: string) => s
      .toLowerCase()
      .replace(/[^a-z\s']/g, ' ')
      .split(/\s+/)
      .filter(Boolean)

    const originalWords = target.split(/(\s+)/) // keep spaces

    // Build normalized tokens from original words (skip pure punctuation)
    const refTokens: string[] = []
    const refTokenIndexForWord: (number | null)[] = []
    for (const seg of originalWords) {
      if (/\s+/.test(seg)) {
        refTokenIndexForWord.push(null)
      } else {
        const norm = seg.toLowerCase().replace(/[^a-z']/g, '')
        if (norm) {
          refTokens.push(norm)
          refTokenIndexForWord.push(refTokens.length - 1)
        } else {
          refTokenIndexForWord.push(null)
        }
      }
    }

    const hypTokens = toTokens(recognized)

    // LCS DP
    const m = refTokens.length
    const n = hypTokens.length
    const dp: number[][] = Array(m + 1)
      .fill(0)
      .map(() => Array(n + 1).fill(0))
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (refTokens[i - 1] === hypTokens[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1
        else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
    // Backtrack to mark matches on ref side
    const matchedRef: boolean[] = Array(m).fill(false)
    let i = m, j = n
    while (i > 0 && j > 0) {
      if (refTokens[i - 1] === hypTokens[j - 1]) {
        matchedRef[i - 1] = true
        i--; j--
      } else if (dp[i - 1][j] >= dp[i][j - 1]) i--
      else j--
    }

    // Project back to original words incl. spaces
    const result: { word: string, matched: boolean }[] = []
    for (let w = 0; w < originalWords.length; w++) {
      const seg = originalWords[w]
      if (/\s+/.test(seg)) {
        result.push({ word: seg, matched: true })
      } else {
        const tokenIndex = refTokenIndexForWord[w]
        if (tokenIndex === null || tokenIndex === undefined) {
          // punctuation-only segment: keep neutral/treated as matched
          result.push({ word: seg, matched: true })
        } else {
          result.push({ word: seg, matched: !!matchedRef[tokenIndex] })
        }
      }
    }
    return result
  }, [target, recognized])
  if (!target) return null
  return (
    <div className="space-y-1 mt-2">
      <div className="text-xs uppercase tracking-wide text-slate-500">對照高亮</div>
      <div className="text-sm leading-6">
        {parts.map((p, i) => (
          /\s+/.test(p.word) ? (
            <span key={i}>{p.word}</span>
          ) : (
            <span
              key={i}
              className={
                (p.matched
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200'
                ) + ' px-1 rounded'}
            >
              {p.word}
            </span>
          )
        ))}
      </div>
    </div>
  )
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
    
    // 清除語音辨識和錄音狀態
    try {
      if (speech.listening) {
        speech.stop()
      }
      if (recorder.recording) {
        recorder.stop()
      }
      // 清除之前的辨識結果和錄音
      speech.reset()
      recorder.clear()
    } catch (error) {
      console.error('清除語音狀態失敗:', error)
    }
    
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

  const handleFlipCard = () => {
    setIsFlipped(!isFlipped)
    
    // 翻牌時也清除語音狀態，避免干擾
    try {
      if (speech.listening) {
        speech.stop()
      }
      if (recorder.recording) {
        recorder.stop()
      }
    } catch (error) {
      console.error('翻牌時清除語音狀態失敗:', error)
    }
  }

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

  // Enhanced speech recognition hook with better permission handling
  const speech = useSpeechRecognitionV2({ lang: 'en-US', interimResults: false, continuous: false })

  const practiceSentence = useMemo(() => {
    if (!currentWord) return ''
    const example = getExampleSentence(currentWord)
    if (example) return example
    // fallback: use the word itself
    return currentWord.word
  }, [currentWord])

  const practiceScore = useMemo(() => {
    if (!practiceSentence || !speech.transcript) return null as null | { percent: number, detail: string }
    const res = speech.score(practiceSentence)
    const percent = Math.round(res.score * 100)
    let detail = '再試一次吧'
    if (percent >= 85) detail = '很棒，幾乎完美！'
    else if (percent >= 65) detail = '不錯，還可以更清晰'
    else if (percent >= 40) detail = '有進步空間，加油！'
    return { percent, detail }
  }, [practiceSentence, speech])

  // Enhanced audio recorder with better permission handling
  const recorder = useAudioRecorderV2()

  // Auto-stop local recorder when speech recognition ends on its own
  useEffect(() => {
    if (!speech.listening && recorder.recording) {
      try { recorder.stop() } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.listening])

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
          {/* Speaking Practice (MVP) */}
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg">口說練習</CardTitle>
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge 
                    variant="outline" 
                    className={`text-xs whitespace-nowrap ${
                      speech.permissionState === 'granted' ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300' :
                      speech.permissionState === 'denied' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300' :
                      'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {speech.supported ? (
                      speech.permissionState === 'granted' ? '✓ 辨識就緒' :
                      speech.permissionState === 'denied' ? '✗ 權限被拒' :
                      '本機辨識'
                    ) : '不支援辨識'}
                  </Badge>
                  {recorder.permissionState && recorder.permissionState !== 'unknown' && (
                    <Badge 
                      variant="outline" 
                      className={`text-xs whitespace-nowrap ${
                        recorder.permissionState === 'granted' ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300' :
                        recorder.permissionState === 'denied' ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700 text-red-700 dark:text-red-300' :
                        'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {recorder.permissionState === 'granted' ? '✓ 錄音就緒' :
                       recorder.permissionState === 'denied' ? '✗ 錄音被拒' :
                       '錄音待授權'}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-600 dark:text-slate-300 italic">
                  "{practiceSentence}"
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => { e.stopPropagation(); handlePronunciation(practiceSentence) }}
                    className="text-sky-600 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30 w-full sm:w-auto"
                  >
                    {isPlaying ? <Square className="h-4 w-4 mr-1"/> : <Volume2 className="h-4 w-4 mr-1"/>}
                    播放句子
                  </Button>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {speech.supported ? (
                      <Button
                        variant={speech.listening ? 'destructive' : 'outline'}
                        size="sm"
                        disabled={speech.processing}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (speech.listening || speech.processing) {
                            speech.stop()
                            if (recorder.recording) recorder.stop()
                          } else {
                            // start both recognition and local recording (for replay)
                            try { stopSpeaking() } catch {}
                            recorder.clear()
                            speech.start()
                            if (recorder.supported) recorder.start()
                          }
                        }}
                        className={(speech.listening ? 'border-rose-300 dark:border-rose-600 ' : '') + 'w-full sm:w-auto'}
                      >
                        {speech.processing ? (
                          <>
                            <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            處理中
                          </>
                        ) : speech.listening ? (
                          <>
                            <MicOff className="h-4 w-4 mr-1"/>
                            停止
                          </>
                        ) : (
                          <>
                            <Mic className="h-4 w-4 mr-1"/>
                            開始錄音
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant={recorder.recording ? 'destructive' : 'outline'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (recorder.recording) {
                            recorder.stop()
                          } else {
                            try { stopSpeaking() } catch {}
                            recorder.clear()
                            if (recorder.supported) recorder.start()
                          }
                        }}
                        className={(recorder.recording ? 'border-rose-300 dark:border-rose-600 ' : '') + 'w-full sm:w-auto'}
                      >
                        {recorder.recording ? <MicOff className="h-4 w-4 mr-1"/> : <Mic className="h-4 w-4 mr-1"/>}
                        {recorder.recording ? '停止' : '開始錄音'}
                      </Button>
                    )}
                  </div>
                  {(!speech.supported) && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 w-full">
                      裝置不支援語音辨識，提供「錄音與重播」功能。
                    </div>
                  )}
                  {recorder.blobUrl ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); recorder.play() }}
                      className="bg-slate-100 dark:bg-slate-700 w-full sm:w-auto"
                    >
                      重播錄音
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Live volume meter and waveform */}
              {recorder.recording && (
                <div className="space-y-2">
                  <div className="text-xs text-slate-500">錄音中 · 音量</div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-sky-500 transition-all"
                      style={{ width: `${Math.min(100, Math.max(5, Math.round((recorder.volume || 0) * 120)))}%` }}
                    />
                  </div>
                  {recorder.waveform && recorder.waveform.length > 0 && (
                    <div className="flex items-end gap-0.5 h-14 bg-slate-50 dark:bg-slate-800/60 rounded-md p-2 border border-slate-200 dark:border-slate-700">
                      {recorder.waveform.map((v, i) => (
                        <div
                          key={i}
                          className="w-1.5 bg-sky-400/70 dark:bg-sky-500/70 rounded-sm"
                          style={{ height: `${Math.max(8, Math.min(100, Math.round(v * 100)))}%` }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {(speech.error || recorder.error) && (
                <div className="text-xs text-rose-600 dark:text-rose-400 p-2 bg-rose-50 dark:bg-rose-900/30 rounded-md border border-rose-200 dark:border-rose-700">
                  {speech.error && <div>語音辨識：{speech.errorMessage || speech.error}</div>}
                  {recorder.error && <div>音頻錄製：{recorder.errorMessage || recorder.error}</div>}
                </div>
              )}

              {speech.transcript && (
                <div className="space-y-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">辨識結果</div>
                  <div className="rounded-md border border-slate-200 dark:border-slate-700 p-2 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-200">
                    {speech.transcript}
                  </div>
                  {/* Word-by-word diff highlight */}
                  <WordDiffHighlight target={practiceSentence} recognized={speech.transcript} />
                  {practiceScore && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Activity className="h-4 w-4"/>
                          分數：{practiceScore.percent}%
                        </div>
                        <div className="text-xs text-slate-500">{practiceScore.detail}</div>
                      </div>
                      <Progress value={practiceScore.percent} className="h-2" />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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
