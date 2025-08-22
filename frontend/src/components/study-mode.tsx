import { useState, useEffect, useMemo } from "react"
import { useVoice } from '@/hooks/useVoice'
import { RefreshCw, Check, Clock, RotateCcw, Volume2, RotateCcwSquare, Square, Mic } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { memWhizAPI, type WordDetail } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { parseStructuredResponse } from "@/lib/parseStructuredResponse"
import { motion } from "framer-motion"
import { useSpeechRecognitionV2 } from '@/hooks/useSpeechRecognitionV2'
import { useAudioRecorderV2 } from '@/hooks/useAudioRecorderV2'
import { stopSpeaking } from '@/lib/voiceService'
import { useDeviceDetection } from '@/hooks/useDeviceDetection'
import { useClickableText } from '@/hooks/useClickableText'
import { useClickableTextContext } from '@/contexts/ClickableTextContext'

interface StudyModeProps {
  onBack?: () => void;
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

    // Simple LCS for token level matching
    const lcs = (a: string[], b: string[]) => {
      const m = a.length, n = b.length
      const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
      
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (a[i-1] === b[j-1]) {
            dp[i][j] = dp[i-1][j-1] + 1
          } else {
            dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1])
          }
        }
      }

      // Backtrack to find LCS
      const result: boolean[] = Array(m).fill(false)
      let i = m, j = n
      while (i > 0 && j > 0) {
        if (a[i-1] === b[j-1]) {
          result[i-1] = true
          i--
          j--
        } else if (dp[i-1][j] > dp[i][j-1]) {
          i--
        } else {
          j--
        }
      }
      return result
    }

    const matchedTokens = lcs(refTokens, hypTokens)

    return originalWords.map((word, i) => {
      const tokenIndex = refTokenIndexForWord[i]
      if (tokenIndex === null) {
        // This is whitespace or punctuation
        return { word, matched: true } // Don't highlight punctuation/spaces as wrong
      } else {
        return { word, matched: matchedTokens[tokenIndex] || false }
      }
    })
  }, [target, recognized])

  return (
    <div className="leading-relaxed">
      {parts.map((p, i) => (
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
      ))}
    </div>
  )
}

export default function StudyMode({ onBack, onAIAnalysisClick }: StudyModeProps) {
  const { toggleSpeakWord, isPlaying } = useVoice()
  const { toast } = useToast()
  const { makeTextClickable } = useClickableText()
  const { setCallbacks } = useClickableTextContext()
  
  const [currentWord, setCurrentWord] = useState<WordDetail | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reviewCount, setReviewCount] = useState(0)
  const [stats, setStats] = useState({ total_words: 0, due_today: 0, reviewed_today: 0, today_remaining: 0 })
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isRecordingStarting, setIsRecordingStarting] = useState(false)
  // 新增：兩階段學習狀態 - 'test'(自我測試) 或 'review'(查看解釋)
  const [learningPhase, setLearningPhase] = useState<'test' | 'review'>('test')

  // Enhanced speech recognition hook with better permission handling and more forgiving settings
  const speech = useSpeechRecognitionV2({ 
    lang: 'en-US', 
    interimResults: false, 
    continuous: false,
    silenceThresholdMs: 4000, // 增加靜音容忍時間
    initialGraceMs: 2000, // 增加初始緩衝時間
    safetyTimeoutMs: 20000 // 增加安全超時時間
  })
  
  // Enhanced audio recorder with better permission handling
  const recorder = useAudioRecorderV2()
  const device = useDeviceDetection()

  useEffect(() => {
    loadNextReview()
    loadStats()
  }, [])

  // 設置智能點擊回調
  useEffect(() => {
    console.log('🔄 智能複習：設置智能點擊回調');
    setCallbacks({
      onWordAdded: (addedWord) => {
        console.log('✅ 智能複習：單字已添加', addedWord);
        // 可以在這裡添加刷新邏輯或其他處理
        toast({
          title: "單字已收藏",
          description: `「${addedWord}」已加入您的單字庫`,
        });
      },
      onDeepAnalysis: (word) => {
        console.log('🧠 智能複習：深度解析', word);
        if (onAIAnalysisClick) {
          onAIAnalysisClick(word);
        }
      },
      onAIAnalysisClick: (word) => {
        console.log('🔍 智能複習：AI 解析點擊', word);
        if (onAIAnalysisClick) {
          onAIAnalysisClick(word);
        }
      }
    });
  }, [setCallbacks, onAIAnalysisClick, toast]);

  const loadStats = async () => {
    try {
      const statsData = await memWhizAPI.getStats()
      setStats(statsData)
    } catch (error) {
      console.error('載入統計失敗:', error)
    }
  }

  const loadNextReview = async () => {
    // 開始載入新單字
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
        // 沒有更多待複習的單字
        toast({
          title: "複習完成",
          description: "恭喜！您已完成今日的所有複習"
        })
        setCurrentWord(null)
      } else {
        setCurrentWord(result)
      }
    } catch (error) {
      console.error('載入下一個複習失敗:', error)
      toast({
        title: "載入失敗",
        description: "請檢查網路連線後重試",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
      setIsTransitioning(false) // 確保載入完成後清除轉場狀態
    }
  }

  const handleSubmitReview = async (response: 'easy' | 'hard' | 'again' | 'mastered') => {
    if (!currentWord) return
    
    // 第二階段：在查看解釋後提交評分
    if (learningPhase === 'review') {
      // 立即顯示視覺反饋
      setIsTransitioning(true)
      
      // 顯示評分反饋
      toast({
        title: response === 'mastered' ? '已精通' : 
               response === 'easy' ? '回答正確' : 
               response === 'hard' ? '需要加強' : '重新練習',
        description: response === 'mastered' ? '這個單字已完全掌握！' :
                     response === 'easy' ? '下次複習間隔將延長' :
                     response === 'hard' ? '下次複習時間將縮短' :
                     '請多練習直到熟練',
        variant: response === 'again' ? 'destructive' : 'default'
      })
      
      try {
        // 並行執行 API 請求和統計更新
        const [, ,] = await Promise.all([
          memWhizAPI.submitReview(currentWord.id, response),
          new Promise(resolve => {
            setReviewCount(prev => prev + 1)
            loadStats()
            resolve(true)
          }),
          new Promise(resolve => setTimeout(resolve, 600)) // 保證最少 0.6 秒動畫時間
        ])
        
        // 載入下一個單字
        loadNextReview()
        
      } catch (error) {
        console.error('提交複習失敗:', error)
        toast({
          title: "提交失敗",
          description: "請檢查網路連線後重試",
          variant: "destructive"
        })
        setIsTransitioning(false) // 失敗時恢復狀態
      }
    }
  }

  // 手動進入下一個單字
  const handleGoToNextWord = async () => {
    setIsTransitioning(true)
    setIsFlipped(false)
    
    // 確保停止任何正在進行的錄音或語音辨識
    try {
      if (speech.listening) {
        speech.stop()
      }
      if (recorder.recording) {
        recorder.stop()
      }
    } catch (error) {
      console.error('停止語音狀態失敗:', error)
    }
    
    // 短暫延遲後載入下一個單字
    setTimeout(async () => {
      await loadNextReview()
      setIsTransitioning(false)
    }, 300)
  }

  // const handleFlipCard = () => {
  //   setIsFlipped(!isFlipped)
  // }
  
  const handleFlipAction = () => {
    // 在翻牌前清除語音狀態，避免干擾
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
        
        // 比照每日探索：行動裝置給予短暫緩衝後再啟動錄音，避免授權時序問題
        const delay = device.isMobile ? 600 : 0
        if (delay) await new Promise(res => setTimeout(res, delay))

        if (recorder.supported) {
          console.log('[StudyMode] Starting audio recorder after grace...')
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
            <span>今日待複習: {stats.today_remaining} 個</span>
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
    <div className="max-w-2xl mx-auto p-2 space-y-4">
      {/* 統計資訊 - 優化緊湊佈局 */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-3">
        <div className="flex flex-wrap justify-center gap-2 mb-2">
          <span className="bg-sky-100 dark:bg-sky-900/40 px-2.5 py-1 rounded-full text-xs font-medium text-sky-800 dark:text-sky-200">已復習 {reviewCount}</span>
          <span className="bg-orange-100 dark:bg-orange-900/40 px-2.5 py-1 rounded-full text-xs font-medium text-orange-800 dark:text-orange-200">今日待複習 {stats.today_remaining}</span>
          <span className="bg-purple-100 dark:bg-purple-900/40 px-2.5 py-1 rounded-full text-xs font-medium text-purple-800 dark:text-purple-200">總詞庫 {stats.total_words}</span>
          <span className={`${getDifficultyColor(currentWord.difficulty)} px-2.5 py-1 rounded-full text-xs font-medium`}>
            {getDifficultyText(currentWord.difficulty)}
          </span>
        </div>
        
        {/* 進度條 */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <span>進度 {Math.min((reviewCount / Math.max(stats.due_today, 1)) * 100, 100).toFixed(0)}%</span>
          <span>間隔 {currentWord.interval} 天</span>
        </div>
      </div>

      {/* 🎯 兩階段學習界面 */}
      <motion.div
        key={`${currentWord.word}-${learningPhase}`}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ 
          opacity: isTransitioning ? 0 : 1,
          scale: isTransitioning ? 0.9 : 1,
          y: isTransitioning ? -20 : 0
        }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ 
          duration: 0.4,
          ease: "easeInOut",
          opacity: { duration: isTransitioning ? 0.2 : 0.4 },
          scale: { duration: 0.4 },
          y: { duration: 0.4 }
        }}
        className="space-y-3"
      >
        
        {learningPhase === 'test' ? (
          // 🔸 第一階段：自我測試
          <>

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
                      className="absolute -right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      onClick={() => handlePronunciation(currentWord.word)}
                      disabled={isPlaying}
                    >
                      <Volume2 className="h-5 w-5" />
                    </Button>
                  </div>
                  
                  {/* 提示訊息 */}
                  <p className="text-slate-600 dark:text-slate-300 text-base">
                    在心中回想這個單字的意思，準備好後點擊下方按鈕查看答案
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 口說練習區域 - 優化緊湊佈局 */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <CardContent className="py-4">
                <div className="space-y-3">
                  {/* 練習句子顯示 - 更緊湊 */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-slate-900 dark:text-white text-sm">口說練習</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePronunciation(practiceSentence)}
                        disabled={isPlaying}
                        className="p-1 h-6 w-6 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                      {practiceSentence}
                    </p>
                  </div>

                  {/* 錄音按鈕 - 更緊湊的設計 */}
                  <div className="flex items-center justify-center">
                    <Button
                      size="default"
                      onClick={handleStartRecording}
                      disabled={isRecordingStarting || speech.listening || recorder.recording}
                      className={`relative ${
                        speech.listening || recorder.recording
                          ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                          : 'bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700'
                      } text-white px-6 py-2 text-sm font-medium`}
                    >
                      {isRecordingStarting ? (
                        '準備中...'
                      ) : speech.listening || recorder.recording ? (
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4 animate-pulse" />
                          錄音中
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Mic className="h-4 w-4" />
                          開始錄音
                        </div>
                      )}
                    </Button>
                  </div>

                    {/* iPhone Mini App 音量提示 */}
                    {typeof window !== 'undefined' && 
                     (window as any).Telegram?.WebApp && 
                     /iPad|iPhone|iPod/.test(navigator.userAgent) && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 text-center">
                        📱 聲音太小？請調高手機音量
                      </div>
                    )}

                  {/* 語音辨識結果 - 優化緊湊佈局 */}
                  {speech.transcript && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-700">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-emerald-800 dark:text-emerald-200 text-sm">辨識結果</h4>
                        {practiceScore && (
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            practiceScore.percent >= 85 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                            practiceScore.percent >= 65 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            practiceScore.percent >= 40 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          }`}>
                            {practiceScore.percent}%
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">
                        {speech.transcript}
                      </div>
                      
                      {practiceScore && (
                        <div className="space-y-2">
                          <div className="text-xs">
                            <WordDiffHighlight target={practiceSentence} recognized={speech.transcript} />
                          </div>
                          <p className={`text-xs text-center ${
                            practiceScore.percent >= 85 ? 'text-green-600 dark:text-green-400' :
                            practiceScore.percent >= 65 ? 'text-yellow-600 dark:text-yellow-400' :
                            practiceScore.percent >= 40 ? 'text-orange-600 dark:text-orange-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {practiceScore.detail}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 錄音重播 - 簡化佈局 */}
                  {recorder.blobUrl && (
                    <div className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-900 dark:text-white text-xs">錄音回放</span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={recorder.play}
                            disabled={recorder.playing}
                            className="text-xs h-7 px-2"
                          >
                            {recorder.playing ? '播放中' : '播放'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={recorder.clear}
                            className="text-xs h-7 px-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            清除
                          </Button>
                        </div>
                      </div>
                      {/* iPhone Mini App 音量提示 */}
                      {typeof window !== 'undefined' && 
                       (window as any).Telegram?.WebApp && 
                       /iPad|iPhone|iPod/.test(navigator.userAgent) && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">
                          📱 聲音太小？請調高手機音量
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 查看答案按鈕 */}
            <div className="flex justify-center pt-1">
              <Button 
                onClick={() => setLearningPhase('review')}
                className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-6 py-2.5 text-sm font-medium"
              >
                查看解釋
              </Button>
            </div>
          </>
        ) : (
          // 🔸 第二階段：查看解釋 + 評分
          <>

            {/* 單字解釋卡片 - 優化標題區域 */}
            <Card className="bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-800 dark:to-slate-800/70 shadow-lg border border-slate-200/60 dark:border-slate-700/60">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                    {currentWord.word}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePronunciation(currentWord.word)}
                    disabled={isPlaying}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-3">
                {(() => {
                  const structuredData = getStructuredData(currentWord)
                  if (structuredData) {
                    return (
                      <div className="space-y-3 text-sm">
                        {/* 音標 */}
                        {structuredData.pronunciations && structuredData.pronunciations.length > 0 && (
                          <div className="text-center">
                            <span className="text-xl text-slate-600 dark:text-slate-300 font-mono tracking-wide">
                              {structuredData.pronunciations[0]}
                            </span>
                          </div>
                        )}

                        {/* 定義 - 緊湊佈局 */}
                        {structuredData.definitions && structuredData.definitions.length > 0 && (
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">定義</h4>
                            <div className="space-y-2">
                              {structuredData.definitions.slice(0, 2).map((def, index) => (
                                <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-sm">
                                    {def.part_of_speech}
                                  </span>
                                  <div className="mt-2 space-y-1">
                                    {def.meanings.slice(0, 2).map((meaning, mIndex) => (
                                      <div key={mIndex} className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pl-2">
                                        {makeTextClickable(
                                          <span>• {meaning.definition}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 例句 - 緊湊佈局 */}
                        {structuredData.examples && structuredData.examples.length > 0 && (
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">例句</h4>
                            <div className="space-y-2">
                              {structuredData.examples.slice(0, 2).map((example, index) => (
                                <div key={index} className="bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                                      {makeTextClickable(
                                        <span>{example}</span>
                                      )}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handlePronunciation(example)}
                                      disabled={isPlaying}
                                      className="shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1 h-6 w-6"
                                    >
                                      <Volume2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 同義詞 - 緊湊佈局 */}
                        {structuredData.synonyms && structuredData.synonyms.length > 0 && (
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">同義詞</h4>
                            <div className="flex flex-wrap gap-2">
                              {structuredData.synonyms.slice(0, 6).map((synonym, index) => (
                                <div key={index} className="bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-700">
                                  {makeTextClickable(
                                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                      {synonym}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 反義詞 - 緊湊佈局 */}
                        {structuredData.antonyms && structuredData.antonyms.length > 0 && (
                          <div>
                            <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-base">反義詞</h4>
                            <div className="flex flex-wrap gap-2">
                              {structuredData.antonyms.slice(0, 6).map((antonym, index) => (
                                <div key={index} className="bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-700">
                                  {makeTextClickable(
                                    <span className="text-sm font-medium text-rose-700 dark:text-rose-300">
                                      {antonym}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 記憶提示 - 緊湊佈局 */}
                        {structuredData.memory_tips && (
                          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg">
                            <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-1 text-sm">💡 記憶小貼士</h4>
                            <div className="text-blue-700 dark:text-blue-300 text-sm leading-relaxed">
                              {makeTextClickable(
                                <span>{structuredData.memory_tips}</span>
                              )}
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

            {/* 複習評分區域 - 優化緊湊佈局 */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <CardContent className="py-3">
                <div className="text-center space-y-3">
                  <h3 className="text-base font-medium text-slate-900 dark:text-white">複習結果評分</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-xs">
                    根據掌握程度選擇，系統將調整複習間隔
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleSubmitReview('mastered')}
                      disabled={isTransitioning}
                      className="bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 dark:from-emerald-600 dark:to-green-600 dark:hover:from-emerald-700 dark:hover:to-green-700 text-white py-2.5 transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                    >
                      <div className="text-center">
                        <div className="font-medium text-sm">完全記住</div>
                        <div className="text-xs opacity-90">移除複習</div>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => handleSubmitReview('easy')}
                      disabled={isTransitioning}
                      className="bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 dark:from-sky-600 dark:to-blue-600 dark:hover:from-sky-700 dark:hover:to-blue-700 text-white py-2.5 transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                    >
                      <div className="text-center">
                        <div className="font-medium text-sm">記住了</div>
                        <div className="text-xs opacity-90">延長間隔</div>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => handleSubmitReview('hard')}
                      disabled={isTransitioning}
                      className="bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 dark:from-amber-500 dark:to-orange-600 dark:hover:from-amber-600 dark:hover:to-orange-700 text-white py-2.5 transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                    >
                      <div className="text-center">
                        <div className="font-medium text-sm">有點難</div>
                        <div className="text-xs opacity-90">縮短間隔</div>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => handleSubmitReview('again')}
                      disabled={isTransitioning}
                      className="bg-gradient-to-r from-rose-400 to-red-500 hover:from-rose-500 hover:to-red-600 dark:from-rose-500 dark:to-red-600 dark:hover:from-rose-600 dark:hover:to-red-700 text-white py-2.5 transform transition-all duration-200 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                    >
                      <div className="text-center">
                        <div className="font-medium text-sm">忘記了</div>
                        <div className="text-xs opacity-90">重新學習</div>
                      </div>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </motion.div>
    </div>
  )
}