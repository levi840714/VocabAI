import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pause, Play, Square, Volume2, Mic, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react'
import { useVoice } from '@/hooks/useVoice'
import { useSpeechRecognitionV2 } from '@/hooks/useSpeechRecognitionV2'
import { useAudioRecorderV2 } from '@/hooks/useAudioRecorderV2'
import { stopSpeaking } from '@/lib/voiceService'
import WordDiffHighlight from '@/components/WordDiffHighlight'
import { useDeviceDetection } from '@/hooks/useDeviceDetection'

interface ShadowingPanelProps {
  text: string
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
  onExit: () => void
}

type Phase = 'idle' | 'playing' | 'recording' | 'processing' | 'result'

export default function ShadowingPanel({ text, index, total, onPrev, onNext, onExit }: ShadowingPanelProps) {
  const { speakSentence, stop: stopTTS, isPlaying } = useVoice()
  // 依句長動態調整靜音容忍與啟動緩衝
  const wordCount = (text || '').trim().split(/\s+/).filter(Boolean).length
  const dynamicSilence = Math.min(8000, Math.max(2500, 2000 + wordCount * 150))
  const dynamicSafety = Math.min(25000, Math.max(12000, 10000 + wordCount * 400))
  const speech = useSpeechRecognitionV2({
    lang: 'en-US',
    interimResults: false,
    continuous: false,
    silenceThresholdMs: dynamicSilence,
    initialGraceMs: 1200,
    safetyTimeoutMs: dynamicSafety,
  })
  const device = useDeviceDetection()
  const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))
  const recorder = useAudioRecorderV2()
  const [phase, setPhase] = useState<Phase>('idle')

  const score = useMemo(() => {
    if (!text || !speech.transcript) return null as null | { percent: number; detail: string }
    const res = speech.score(text)
    const p = Math.round(res.score * 100)
    let detail = '再試一次吧'
    if (p >= 85) detail = '很棒，幾乎完美！'
    else if (p >= 65) detail = '不錯，還可以更清晰'
    else if (p >= 40) detail = '有進步空間，加油！'
    return { percent: p, detail }
  }, [text, speech.transcript])

  const startPlayThenRecord = useCallback(async () => {
    if (!text) return
    try {
      // 停止任何現有音訊
      try { stopSpeaking() } catch {}
      setPhase('playing')
      await speakSentence(text)
      // 播放結束 → 開始錄音
      setPhase('recording')
      try { recorder.clear() } catch {}
      speech.reset()
      // 先啟動辨識，行動裝置給予緩衝，之後再啟動錄音
      if (speech.supported) { try { await speech.start() } catch {} }
      if (device.isMobile) await sleep(700)
      if (recorder.supported) { try { await recorder.start() } catch {} }
    } catch (e) {
      // 靜默處理，錯誤會在 hooks errorMessage 呈現
      setPhase('idle')
    }
  }, [text, speakSentence, speech, recorder])

  const stopAll = useCallback(() => {
    try { stopTTS() } catch {}
    try { speech.stop() } catch {}
    try { recorder.stop() } catch {}
    setPhase('idle')
  }, [stopTTS, speech, recorder])

  const handleNext = useCallback(() => {
    try { speech.reset() } catch {}
    try { recorder.clear() } catch {}
    setPhase('idle')
    onNext()
  }, [onNext, speech, recorder])

  const handlePrev = useCallback(() => {
    try { speech.reset() } catch {}
    try { recorder.clear() } catch {}
    setPhase('idle')
    onPrev()
  }, [onPrev, speech, recorder])

  // 錄音結束 → 進入處理 → 顯示結果
  useEffect(() => {
    if (!speech.listening && (phase === 'recording' || phase === 'processing')) {
      // hooks 內部會把 processing 切回 false，這裡同步狀態
      if (speech.processing) setPhase('processing')
      else setPhase('result')
    }
  }, [speech.listening, speech.processing, phase])

  // 當辨識結束時，若錄音仍在進行則主動停止以產生 blob
  useEffect(() => {
    if (!speech.listening && recorder.recording) {
      try { recorder.stop() } catch {}
    }
  }, [speech.listening, recorder.recording])

  // 切換句子時，重置面板狀態
  useEffect(() => {
    stopAll()
  }, [text])

  return (
    <div className="fixed left-0 right-0 bottom-4 z-50 w-[calc(100%-2rem)] max-w-xl mx-auto">
      <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur rounded-xl px-4 py-3 shadow-lg border border-slate-200 dark:border-slate-600">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-slate-500">跟讀 {index + 1} / {total}</div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handlePrev} disabled={index === 0} className="h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleNext} disabled={index >= total - 1} className="h-8 px-2">
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onExit} className="h-8 px-2">
              <Square className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="text-sm text-slate-700 dark:text-slate-200 italic mb-2">"{text}"</div>

        <div className="flex items-center gap-2 flex-wrap">
          {recorder.recording || speech.listening || phase === 'processing' ? (
            <>
              <Button variant="secondary" size="sm" disabled className="h-8 px-2">
                <div className="flex items-center gap-1">
                  {/* 小型音波動畫 */}
                  <div className="flex items-center gap-0.5 mr-1">
                    {[...Array(4)].map((_, i) => (
                      <div
                        key={i}
                        className="w-0.5 bg-current rounded-full animate-pulse"
                        style={{ height: '10px', animationDelay: `${i * 150}ms`, animationDuration: '1.2s' }}
                      />
                    ))}
                  </div>
                  錄音中
                </div>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={startPlayThenRecord}
                disabled={!text || isPlaying}
                className="h-8 px-2"
              >
                <Volume2 className="h-4 w-4 mr-1" /> 播放並錄音
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try { stopSpeaking() } catch {}
                  setPhase('recording')
                  try { recorder.clear() } catch {}
                  speech.reset()
                  if (speech.supported) { try { await speech.start() } catch {} }
                  if (device.isMobile) await sleep(500)
                  if (recorder.supported) { try { await recorder.start() } catch {} }
                }}
                disabled={!text}
                className="h-8 px-2"
              >
                <Mic className="h-4 w-4 mr-1" /> 只錄音
              </Button>
            </>
          )}

          {phase === 'result' && recorder.blobUrl && !recorder.recording && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { try { recorder.play() } catch {} }}
                disabled={recorder.playing}
                className="h-8 px-2"
              >
                <Play className="h-4 w-4 mr-1" /> 重放錄音
              </Button>
              {/* iPhone Mini App 音量提示 */}
              {typeof window !== 'undefined' && 
               (window as any).Telegram?.WebApp && 
               /iPad|iPhone|iPod/.test(navigator.userAgent) && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400">
                  📱 聲音太小？請調高手機音量
                </div>
              )}
            </>
          )}
        </div>

        {/* 波形與分數 */}
        <div className="mt-2">
          {recorder.recording && (
            <div className="flex items-center justify-between mb-1">
              <div className="text-[11px] text-slate-500">錄音中</div>
              <div className="text-[11px] text-slate-500">{Math.round((recorder.volume || 0) * 100)}%</div>
            </div>
          )}
          {recorder.recording && (
            <div className="flex items-center justify-center gap-0.5 h-8">
              {(recorder.waveform || Array(24).fill(0)).map((v, i) => (
                <div key={i} className="bg-gradient-to-t from-emerald-400 to-sky-500 rounded-full transition-all" style={{ width: '3px', height: `${Math.max(2, Math.min(28, v * 24 + 4))}px`, opacity: v > 0.1 ? 1 : 0.3 }} />
              ))}
            </div>
          )}

          {(speech.error || recorder.error) && (
            <div className="text-xs text-rose-600 dark:text-rose-400 p-2 bg-rose-50 dark:bg-rose-900/30 rounded-md border border-rose-200 dark:border-rose-700 mt-2">
              {speech.error && <div>語音辨識：{speech.errorMessage || speech.error}</div>}
              {recorder.error && <div>音頻錄製：{recorder.errorMessage || recorder.error}</div>}
            </div>
          )}

          {speech.transcript && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-md p-2 border border-emerald-200 dark:border-emerald-700 mt-2">
              <div className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">您的發音：</div>
              <div className="text-slate-800 dark:text-slate-100 text-sm mb-2">{speech.transcript}</div>
              <div className="bg-white dark:bg-slate-800 rounded p-2 mb-2 border border-emerald-100 dark:border-emerald-800">
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">語音辨識與目標比對：</div>
                <WordDiffHighlight target={text} recognized={speech.transcript} />
              </div>
              {score && (
                <div className="flex items-center justify-between">
                  <div className="text-sm">分數：<span className="font-semibold">{score.percent}%</span></div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">{score.detail}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
