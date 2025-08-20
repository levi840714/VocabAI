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
  const [isRecordingStarting, setIsRecordingStarting] = useState(false)
  // 新增：兩階段學習狀態 - 'test'(自我測試) 或 'review'(查看解釋)
  const [learningPhase, setLearningPhase] = useState<'test' | 'review'>('test')
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
    setLearningPhase('test') // 新單字從第一階段開始
    
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
    
    // 第一階段：只是保存評分並切換到查看解釋階段
    if (learningPhase === 'test') {
      setIsLoading(true)
      
      try {
        const result = await memWhizAPI.submitReview(currentWord.id, response)
        
        toast({
          title: "評估完成",
          description: result.next_review_date ? 
            `下次複習時間：${new Date(result.next_review_date).toLocaleDateString()}` : 
            result.message,
        })
        
        setReviewCount(prev => prev + 1)
        await loadStats()
        
        // 輕柔切換到第二階段
        setIsTransitioning(true)
        setTimeout(() => {
          setLearningPhase('review')
          setIsTransitioning(false)
        }, 300)
        
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
  }

  // 新增：從第二階段進入下一個單字
  const handleGoToNextWord = async () => {
    setIsLoading(true)
    setIsTransitioning(true)
    
    // 清除語音狀態
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
    
    // 等待退場動畫完成後再載入下一個單字
    setTimeout(async () => {
      await loadNextReview()
      setIsTransitioning(false)
    }, 400)
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

  // Smart recording startup with UI loading state and permission optimization
  const handleStartRecording = async () => {
    setIsRecordingStarting(true)
    
    try {
      // Stop any ongoing audio playback first
      try { stopSpeaking() } catch {}
      
      // Clear previous recording
      recorder.clear()
      
      console.log('[StudyMode] Starting recording systems...')
      
      // 優化：優先使用語音辨識系統，因為它處理麥克風權限更完善
      if (speech.supported) {
        console.log('[StudyMode] Starting speech recognition first...')
        await speech.start()
        // 同步啟動錄音器，不再依賴 speech.listening 狀態
        if (recorder.supported) {
          console.log('[StudyMode] Starting audio recorder in parallel...')
          try { await recorder.start() } catch {}
        }
      } else if (recorder.supported) {
        // 如果只有錄音器可用，直接啟動
        console.log('[StudyMode] Starting audio recorder only...')
        await recorder.start()
      }
      
      // Small delay to ensure streams are fully active before showing UI
      await new Promise(resolve => setTimeout(resolve, 200))
      
      console.log('[StudyMode] Recording systems ready!')
      
    } catch (error) {
      console.error('[StudyMode] Failed to start recording:', error)
      toast({
        title: "錄音啟動失敗",
        description: "請檢查麥克風權限設定",
        variant: "destructive"
      })
    } finally {
      setIsRecordingStarting(false)
    }
  }

  // Enhanced auto-stop logic for better speech processing coordination
  useEffect(() => {
    // 當語音辨識停止且不在處理狀態時，停止錄音器
    if (!speech.listening && !speech.processing && recorder.recording) {
      console.log('[StudyMode] Speech ended, stopping recorder')
      try { recorder.stop() } catch {}
    }
    
    // 如果語音辨識進入處理狀態，給予額外時間處理
    if (speech.processing && recorder.recording) {
      console.log('[StudyMode] Speech processing, keeping recorder active briefly')
      setTimeout(() => {
        if (recorder.recording && !speech.listening) {
          console.log('[StudyMode] Processing timeout, stopping recorder')
          try { recorder.stop() } catch {}
        }
      }, 1000) // 給予1秒處理時間
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.listening, speech.processing])

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
    <div className="max-w-2xl mx-auto p-2 space-y-3">
      {/* 統計資訊 - 保持不變 */}
      <div className="flex flex-wrap justify-center gap-1.5">
        <span className="bg-sky-50 dark:bg-sky-900/30 px-2 py-1 rounded-full text-xs text-sky-800 dark:text-sky-200">已復習: {reviewCount}</span>
        <span className="bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-full text-xs text-orange-800 dark:text-orange-200">待復習: {stats.due_today}</span>
        <span className="bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-full text-xs text-purple-800 dark:text-purple-200">總詞庫: {stats.total_words}</span>
        <span className={`${getDifficultyColor(currentWord.difficulty)} px-2 py-1 rounded-full text-xs`}>
          難度: {getDifficultyText(currentWord.difficulty)}
        </span>
      </div>

      {/* 進度時間 */}
      <div className="flex items-center justify-between bg-sky-50 dark:bg-sky-900/20 rounded-lg px-3 py-2 text-xs">
        <span className="text-sky-800 dark:text-sky-200">進度: {Math.min((reviewCount / Math.max(stats.due_today, 1)) * 100, 100).toFixed(0)}%</span>
        <span className="text-sky-600 dark:text-sky-300">間隔: {currentWord.interval} 天</span>
      </div>

      {/* 🎯 兩階段學習界面 */}
      <motion.div
        key={`${currentWord.word}-${learningPhase}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ 
          opacity: isTransitioning ? 0.7 : 1,
          scale: isTransitioning ? 0.95 : 1 
        }}
        transition={{ duration: 0.3 }}
        className="space-y-3"
      >
        
        {learningPhase === 'test' ? (
          // 🔸 第一階段：自我測試
          <>
            {/* 返回按鈕 */}
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onBack()
                }}
              >
                <RotateCcwSquare className="h-3 w-3 mr-1" />
                返回
              </Button>
            </div>

            {/* 單字展示區 - 大而簡潔 */}
            <Card className="bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-800 dark:to-slate-800/70 shadow-lg border border-slate-200/60 dark:border-slate-700/60">
              <CardContent className="text-center py-12">
                <div className="space-y-4">
                  {/* 單字標題 */}
                  <div className="relative">
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
                      {currentWord.word}
                    </h1>
                    {/* 發音按鈕 */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePronunciation(currentWord.word)
                      }}
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-8 h-8 p-0 rounded-full text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                    >
                      {isPlaying ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  {/* 提示文字 */}
                  <p className="text-slate-500 dark:text-slate-400 text-sm">
                    💭 回想一下這個單字的意思，然後選擇你的掌握程度
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 口說練習區 */}
            <Card>
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  🎙️ 口說練習
                  <Badge variant="outline" className="text-xs">
                    {speech.supported ? (
                      speech.permissionState === 'granted' ? '已授權' :
                      speech.permissionState === 'denied' ? '權限被拒' :
                      speech.permissionState === 'prompt' ? '需授權' : '支援'
                    ) : '不支援'}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-1 space-y-3">
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-md p-4 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-600 dark:text-slate-300 italic mb-3">
                    "{practiceSentence}"
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handlePronunciation(practiceSentence) }}
                      className="text-sky-600 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/30 text-xs px-2 py-1 h-7"
                    >
                      {isPlaying ? <Square className="h-3 w-3 mr-1"/> : <Volume2 className="h-3 w-3 mr-1"/>}
                      播放
                    </Button>
                    {speech.supported ? (
                      <Button
                        variant={speech.listening ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={speech.processing || isRecordingStarting || speech.listening}
                        onClick={(e) => {
                          e.stopPropagation()
                          // 只允許啟動錄音，不允許手動停止
                          if (!speech.listening && !speech.processing) {
                            handleStartRecording()
                          }
                        }}
                        className={`text-xs px-2 py-1 h-7 ${speech.listening ? 'pointer-events-none' : ''}`}
                      >
                        {isRecordingStarting ? (
                          <>
                            <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            啟動中
                          </>
                        ) : speech.processing ? (
                          <>
                            <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            處理中
                          </>
                        ) : speech.listening ? (
                          <>
                            {/* 波浪動態效果 */}
                            <div className="flex items-center gap-0.5 mr-1">
                              {[...Array(4)].map((_, i) => (
                                <div
                                  key={i}
                                  className="w-0.5 bg-current rounded-full animate-pulse"
                                  style={{
                                    height: '8px',
                                    animationDelay: `${i * 150}ms`,
                                    animationDuration: '1.2s'
                                  }}
                                />
                              ))}
                            </div>
                            錄音中
                          </>
                        ) : (
                          <>
                            <Mic className="h-3 w-3 mr-1"/>
                            錄音
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant={recorder.recording ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={isRecordingStarting || recorder.processing || recorder.recording}
                        onClick={(e) => {
                          e.stopPropagation()
                          // 只允許啟動錄音，不允許手動停止
                          if (!recorder.recording && !recorder.processing) {
                            handleStartRecording()
                          }
                        }}
                        className={`text-xs px-2 py-1 h-7 ${recorder.recording ? 'pointer-events-none' : ''}`}
                      >
                        {isRecordingStarting ? (
                          <>
                            <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            啟動中
                          </>
                        ) : recorder.processing ? (
                          <>
                            <div className="w-3 h-3 mr-1 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            解析中
                          </>
                        ) : recorder.recording ? (
                          <>
                            {/* 波浪動態效果 */}
                            <div className="flex items-center gap-0.5 mr-1">
                              {[...Array(4)].map((_, i) => (
                                <div
                                  key={i}
                                  className="w-0.5 bg-current rounded-full animate-pulse"
                                  style={{
                                    height: '8px',
                                    animationDelay: `${i * 150}ms`,
                                    animationDuration: '1.2s'
                                  }}
                                />
                              ))}
                            </div>
                            錄音中
                          </>
                        ) : (
                          <>
                            <Mic className="h-3 w-3 mr-1"/>
                            錄音
                          </>
                        )}
                      </Button>
                    )}
                    {/* 重播按鈕直接加在錄音按鈕旁邊 */}
                    {recorder.blobUrl && !recorder.recording && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 text-xs"
                        onClick={() => recorder.play()}
                      >
                        <Volume2 className="h-3 w-3 mr-1" />
                        重播
                      </Button>
                    )}
                  </div>
                </div>

                {/* 音量與波形顯示 */}
                {isRecordingStarting ? (
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded p-2 border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 mb-1">系統啟動中...</div>
                    <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-sky-400 to-blue-500 animate-pulse" style={{ width: '60%' }} />
                    </div>
                  </div>
                ) : recorder.recording ? (
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded p-2 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-slate-500">錄音中</div>
                      <div className="text-xs text-slate-500">{Math.round((recorder.volume || 0) * 100)}%</div>
                    </div>
                    {/* 波浪形視覺化 */}
                    <div className="flex items-center justify-center gap-0.5 h-8">
                      {(recorder.waveform || Array(24).fill(0)).map((value, index) => (
                        <div
                          key={index}
                          className="bg-gradient-to-t from-emerald-400 to-sky-500 rounded-full transition-all duration-150 ease-out"
                          style={{
                            width: '3px',
                            height: `${Math.max(2, Math.min(28, value * 24 + 4))}px`,
                            opacity: value > 0.1 ? 1 : 0.3
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : recorder.processing ? (
                  <div className="bg-slate-50 dark:bg-slate-800/60 rounded p-2 border border-slate-200 dark:border-slate-700">
                    <div className="text-xs text-slate-500 mb-1">語音解析中...</div>
                    <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-400 to-blue-500 animate-pulse" style={{ width: '80%' }} />
                    </div>
                  </div>
                ) : null}


                {/* 錯誤提示 */}
                {(speech.error || recorder.error) && (
                  <div className="text-xs text-rose-600 dark:text-rose-400 p-2 bg-rose-50 dark:bg-rose-900/30 rounded-md border border-rose-200 dark:border-rose-700">
                    {speech.error && <div>語音辨識：{speech.errorMessage || speech.error}</div>}
                    {recorder.error && <div>音頻錄製：{recorder.errorMessage || recorder.error}</div>}
                  </div>
                )}

                {/* 語音結果 */}
                {speech.transcript && (
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-md p-3 border border-emerald-200 dark:border-emerald-700">
                    <div className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">您的發音：</div>
                    
                    {/* 語音辨識結果與比對 */}
                    <div className="bg-white dark:bg-slate-800 rounded p-3 mb-3 border border-emerald-100 dark:border-emerald-800">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">語音辨識與目標比對：</div>
                      <div className="space-y-2">
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">辨識結果：</div>
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            "{speech.transcript}"
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">目標句子（紅綠標記）：</div>
                          <WordDiffHighlight target={practiceSentence} recognized={speech.transcript} />
                        </div>
                      </div>
                    </div>

                    {/* 重播錄音 */}
                    {recorder.blobUrl && !recorder.recording && (
                      <div className="mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/30 text-xs"
                          onClick={() => recorder.play()}
                        >
                          <Volume2 className="h-3 w-3 mr-1" />
                          重播
                        </Button>
                      </div>
                    )}

                    {/* 評分 */}
                    {practiceScore && (
                      <div className="flex items-center gap-3 pt-2 border-t border-emerald-200 dark:border-emerald-700">
                        <div className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          評分: {practiceScore.percent}%
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          {practiceScore.detail}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 評估按鈕 */}
            <Card>
              <CardContent className="pt-5">
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full text-purple-600 dark:text-purple-300 border-purple-300 dark:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-purple-900/20 dark:to-pink-900/20 font-medium py-4 text-base"
                    onClick={() => handleSubmitReview('mastered')}
                    disabled={isLoading}
                  >
                    <Check className="h-5 w-5 mr-2" />
                    完全掌握
                  </Button>
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 dark:text-green-300 border-green-300 dark:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/20 dark:to-emerald-900/20 text-sm font-medium py-4"
                      onClick={() => handleSubmitReview('easy')}
                      disabled={isLoading}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      容易
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-amber-600 dark:text-amber-300 border-amber-300 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 bg-gradient-to-br from-amber-50/50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/20 text-sm font-medium py-4"
                      onClick={() => handleSubmitReview('hard')}
                      disabled={isLoading}
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      困難
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 dark:text-red-300 border-red-300 dark:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 bg-gradient-to-br from-red-50/50 to-rose-50/50 dark:from-red-900/20 dark:to-rose-900/20 text-sm font-medium py-4"
                      onClick={() => handleSubmitReview('again')}
                      disabled={isLoading}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      不熟再學
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          // 🔹 第二階段：查看詳細解釋
          <>
            {/* 單字標題與發音按鈕 */}
            <div className="text-center mb-3">
              <div className="relative inline-block">
                <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-white">
                  {currentWord.word}
                </h1>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePronunciation(currentWord.word)}
                  className="absolute -right-12 top-1/2 -translate-y-1/2 w-9 h-9 p-0 rounded-full text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  {isPlaying ? <Square className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* 詳細解釋 */}
            <Card>
              <CardContent className="pt-5">
                {(() => {
                  const structuredData = getStructuredData(currentWord)
                  if (structuredData) {
                    return (
                      <div className="space-y-5 text-base">
                        {/* 音標 */}
                        {structuredData.phonetic && (
                          <div className="text-center">
                            <span className="text-3xl text-slate-600 dark:text-slate-300 font-mono tracking-wide">
                              {structuredData.phonetic}
                            </span>
                          </div>
                        )}

                        {/* 定義 */}
                        {structuredData.definitions && structuredData.definitions.length > 0 && (
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-lg">定義：</h4>
                            <ul className="space-y-4">
                              {structuredData.definitions.slice(0, 3).map((def, index) => (
                                <li key={index} className="text-slate-800 dark:text-slate-200">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-base">
                                    {def.part_of_speech}
                                  </span>
                                  <ul className="mt-3 ml-4 space-y-2">
                                    {def.meanings.slice(0, 2).map((meaning, mIndex) => (
                                      <li key={mIndex} className="text-base text-slate-700 dark:text-slate-300 leading-relaxed">
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
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-lg">例句：</h4>
                            <div className="space-y-4">
                              {structuredData.examples.slice(0, 2).map((example, index) => (
                                <div key={index} className="bg-white/60 dark:bg-slate-700/60 rounded-lg p-5 italic text-slate-800 dark:text-slate-200 text-base leading-relaxed">
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
                            <h4 className="font-bold text-slate-900 dark:text-white mb-4 text-lg">同義詞：</h4>
                            <div className="flex flex-wrap gap-3">
                              {structuredData.synonyms.slice(0, 6).map((synonym, index) => (
                                <Badge key={index} variant="outline" className="text-base bg-emerald-50 dark:bg-emerald-900/30 font-medium px-4 py-2">
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

            {/* 下一個單字按鈕 */}
            <Card>
              <CardContent className="pt-5">
                <Button
                  variant="default"
                  size="lg"
                  className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-medium py-5 text-lg"
                  onClick={handleGoToNextWord}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      載入中...
                    </>
                  ) : (
                    <>
                      下一個單字 →
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>
    </div>
  )
}
