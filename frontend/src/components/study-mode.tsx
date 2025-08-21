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

interface StudyModeProps {
  onBack?: () => void;
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

export default function StudyMode({ onBack }: StudyModeProps) {
  const { toggleSpeakWord, isPlaying } = useVoice()
  const { toast } = useToast()
  
  const [currentWord, setCurrentWord] = useState<WordDetail | null>(null)
  const [isFlipped, setIsFlipped] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [reviewCount, setReviewCount] = useState(0)
  const [stats, setStats] = useState({ total_words: 0, due_today: 0, reviewed_today: 0 })
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
        // 沒有更多待複習的單字
        toast({
          title: "複習完成",
          description: "恭喜！您已完成今日的所有複習"
        })
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
    }
  }

  const handleSubmitReview = async (response: 'easy' | 'hard' | 'again' | 'mastered') => {
    if (!currentWord) return
    
    // 第一階段：自我測試，先進入第二階段再提交
    if (learningPhase === 'test') {
      setLearningPhase('review')
      
      try {
        await memWhizAPI.submitReview(currentWord.id, response)
        
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

        // 延遲跳轉到下一個單字，讓用戶看到解釋
        setTimeout(() => {
          setReviewCount(prev => prev + 1)
          loadStats()
          loadNextReview()
        }, 3000) // 3秒後自動進入下一個單字
        
      } catch (error) {
        console.error('提交複習失敗:', error)
        toast({
          title: "提交失敗",
          description: "請檢查網路連線後重試",
          variant: "destructive"
        })
      } finally {
        setIsTransitioning(false)
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
                  onBack?.()
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

            {/* 口說練習區域 */}
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <CardContent className="py-6">
                <div className="space-y-4">
                  {/* 練習句子顯示 */}
                  <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                    <h4 className="font-medium text-slate-900 dark:text-white mb-2 text-sm">口說練習句子:</h4>
                    <div className="flex items-center gap-3">
                      <p className="text-slate-700 dark:text-slate-300 flex-1 text-base leading-relaxed">
                        {practiceSentence}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePronunciation(practiceSentence)}
                        disabled={isPlaying}
                        className="shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        <Volume2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* 錄音和語音辨識界面 */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-center">
                      <Button
                        size="lg"
                        onClick={handleStartRecording}
                        disabled={isRecordingStarting || speech.listening || recorder.recording}
                        className={`relative ${
                          speech.listening || recorder.recording
                            ? 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                            : 'bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700'
                        } text-white px-8 py-3 text-base font-medium`}
                      >
                        {isRecordingStarting ? (
                          '準備中...'
                        ) : speech.listening || recorder.recording ? (
                          <div className="flex items-center gap-2">
                            <Mic className="h-5 w-5 animate-pulse" />
                            錄音中...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Mic className="h-5 w-5" />
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

                    {/* 語音辨識結果 */}
                    {speech.transcript && (
                      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                        <h4 className="font-medium text-slate-900 dark:text-white mb-2 text-sm">您說的內容:</h4>
                        <p className="text-slate-700 dark:text-slate-300 mb-3 text-base">
                          {speech.transcript}
                        </p>
                        
                        {practiceScore && (
                          <div className="space-y-3">
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded">
                              <h4 className="font-medium text-slate-900 dark:text-white mb-2 text-sm">發音對比:</h4>
                              <div className="space-y-2 text-sm">
                                <div>
                                  <span className="text-slate-600 dark:text-slate-400 text-xs">目標：</span>
                                  <div className="mt-1">{practiceSentence}</div>
                                </div>
                                <div>
                                  <span className="text-slate-600 dark:text-slate-400 text-xs">您的發音：</span>
                                  <div className="mt-1">
                                    <WordDiffHighlight target={practiceSentence} recognized={speech.transcript} />
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    practiceScore.percent >= 85 ? 'bg-green-500' :
                                    practiceScore.percent >= 65 ? 'bg-yellow-500' :
                                    practiceScore.percent >= 40 ? 'bg-orange-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${practiceScore.percent}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 min-w-12">
                                {practiceScore.percent}%
                              </span>
                            </div>
                            
                            <p className={`text-sm text-center ${
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

                    {/* 錄音重播 */}
                    {recorder.blobUrl && (
                      <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                        <h4 className="font-medium text-slate-900 dark:text-white mb-2 text-sm">您的錄音:</h4>
                        {/* 調試信息 */}
                        <div className="text-[10px] text-slate-400 mb-2">
                          BlobUrl: {recorder.blobUrl ? '✓' : '✗'}, Recording: {recorder.recording ? '✓' : '✗'}, Error: {recorder.error || 'None'}
                        </div>
                        {/* iPhone Mini App 音量提示 */}
                        {typeof window !== 'undefined' && 
                         (window as any).Telegram?.WebApp && 
                         /iPad|iPhone|iPod/.test(navigator.userAgent) && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 mb-2">
                            📱 聲音太小？請調高手機音量
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={recorder.play}
                            disabled={recorder.playing}
                            className="text-xs"
                          >
                            {recorder.playing ? '播放中...' : '播放錄音'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={recorder.clear}
                            className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                          >
                            清除
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 查看答案按鈕 */}
            <div className="flex justify-center pt-2">
              <Button 
                onClick={() => setLearningPhase('review')}
                className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-8 py-3 text-base"
              >
                查看解釋
              </Button>
            </div>
          </>
        ) : (
          // 🔸 第二階段：查看解釋 + 評分
          <>
            {/* 返回按鈕 */}
            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onBack?.()
                }}
              >
                <RotateCcwSquare className="h-3 w-3 mr-1" />
                返回
              </Button>
              
              {/* 手動下一題按鈕 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGoToNextWord}
                disabled={isTransitioning}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 h-6 px-2 text-xs"
              >
                下一個 →
              </Button>
            </div>

            {/* 單字解釋卡片 */}
            <Card className="bg-gradient-to-br from-white to-slate-50/30 dark:from-slate-800 dark:to-slate-800/70 shadow-lg border border-slate-200/60 dark:border-slate-700/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                      {currentWord.word}
                    </CardTitle>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePronunciation(currentWord.word)}
                    disabled={isPlaying}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <Volume2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-5">
                {(() => {
                  const structuredData = getStructuredData(currentWord)
                  if (structuredData) {
                    return (
                      <div className="space-y-5 text-base">
                        {/* 音標 */}
                        {structuredData.pronunciations && structuredData.pronunciations.length > 0 && (
                          <div className="text-center">
                            <span className="text-3xl text-slate-600 dark:text-slate-300 font-mono tracking-wide">
                              {structuredData.pronunciations[0]}
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
                            <ul className="space-y-3">
                              {structuredData.examples.slice(0, 2).map((example, index) => (
                                <li key={index} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                                  <div className="flex items-start gap-3">
                                    <span className="text-base text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                                      {example}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handlePronunciation(example)}
                                      disabled={isPlaying}
                                      className="shrink-0 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-1"
                                    >
                                      <Volume2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* 記憶提示 */}
                        {structuredData.memory_tips && (
                          <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                            <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2 text-lg">💡 記憶小貼士</h4>
                            <p className="text-blue-700 dark:text-blue-300 text-base leading-relaxed">
                              {structuredData.memory_tips}
                            </p>
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
            <Card className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <CardContent className="py-4">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-medium text-slate-900 dark:text-white">複習結果評分</h3>
                  <p className="text-slate-600 dark:text-slate-300 text-sm">
                    根據您的掌握程度選擇合適的選項，系統將調整下次複習時間
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={() => handleSubmitReview('mastered')}
                      disabled={isTransitioning}
                      className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white py-3"
                    >
                      <div className="text-center">
                        <div className="font-medium">完全記住</div>
                        <div className="text-xs opacity-90">移除複習</div>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => handleSubmitReview('easy')}
                      disabled={isTransitioning}
                      className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white py-3"
                    >
                      <div className="text-center">
                        <div className="font-medium">記住了</div>
                        <div className="text-xs opacity-90">延長間隔</div>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => handleSubmitReview('hard')}
                      disabled={isTransitioning}
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-300 dark:hover:bg-orange-900/30 py-3"
                    >
                      <div className="text-center">
                        <div className="font-medium">有點難</div>
                        <div className="text-xs opacity-70">縮短間隔</div>
                      </div>
                    </Button>
                    
                    <Button
                      onClick={() => handleSubmitReview('again')}
                      disabled={isTransitioning}
                      variant="outline"
                      className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30 py-3"
                    >
                      <div className="text-center">
                        <div className="font-medium">忘記了</div>
                        <div className="text-xs opacity-70">重新學習</div>
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