import React, { useEffect, useMemo, useState } from 'react'
import { ThemeCard, ThemeTitle, ThemeText } from '@/components/ui/ThemeComponents'
import { Button } from '@/components/ui/button'
import { Mic, Square, Volume2, RefreshCw } from 'lucide-react'
import { useSpeechRecognitionV2 } from '@/hooks/useSpeechRecognitionV2'
import { useAudioRecorderV2 } from '@/hooks/useAudioRecorderV2'
import { useVoice } from '@/hooks/useVoice'
import { stopSpeaking } from '@/lib/voiceService'

interface SpeakPracticeCardProps {
  target: string
  variant?: 'card' | 'inline'
}

function feedbackText(percent: number) {
  if (percent >= 85) return '很棒，幾乎完美！'
  if (percent >= 65) return '不錯，還可以更清晰'
  if (percent >= 40) return '有進步空間，加油！'
  return '再試一次吧'
}

export default function SpeakPracticeCard({ target, variant = 'card' }: SpeakPracticeCardProps) {
  const { speakSentence } = useVoice()
  const speech = useSpeechRecognitionV2({ lang: 'en-US', interimResults: false, continuous: false })
  const recorder = useAudioRecorderV2()

  const [starting, setStarting] = useState(false)

  const score = useMemo(() => {
    if (!target || !speech.transcript) return null as null | { percent: number; detail: string }
    const res = speech.score(target)
    const percent = Math.round(res.score * 100)
    return { percent, detail: feedbackText(percent) }
  }, [target, speech.transcript])

  const startPractice = async () => {
    if (!target) return
    setStarting(true)
    try {
      try { stopSpeaking() } catch {}
      recorder.clear()
      speech.reset()

      if (speech.supported) {
        await speech.start()
        if (recorder.supported && speech.listening) {
          await recorder.start()
        }
      } else if (recorder.supported) {
        await recorder.start()
      }
    } catch (e) {
      // no-op, errors surfaced via hooks
    } finally {
      setStarting(false)
    }
  }

  const stopPractice = () => {
    try { speech.stop() } catch {}
    try { recorder.stop() } catch {}
  }

  const replayRecording = () => {
    try { recorder.play() } catch {}
  }

  const speakTarget = async () => {
    try { await speakSentence(target) } catch {}
  }

  useEffect(() => {
    // Auto-stop recorder when speech finishes processing
    if (!speech.listening && !speech.processing && recorder.recording) {
      try { recorder.stop() } catch {}
    }
  }, [speech.listening, speech.processing])

  if (!target) return null

  const content = (
    <div>
      <div className="flex items-center justify-between mb-3">
        {variant === 'card' ? (
          <ThemeTitle level={2}>口說練習</ThemeTitle>
        ) : (
          <div className="text-sm font-medium text-slate-700 dark:text-slate-200">影子跟讀</div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={speakTarget} className="h-8 px-2 text-sky-600 dark:text-sky-300">
            <Volume2 className="h-4 w-4 mr-1" /> 播放
          </Button>
          {speech.listening || recorder.recording ? (
            <Button variant="secondary" size="sm" onClick={stopPractice} className="h-8 px-2">
              <Square className="h-4 w-4 mr-1" /> 停止
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={startPractice} disabled={starting} className="h-8 px-2">
              {starting ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Mic className="h-4 w-4 mr-1" />}
              {starting ? '啟動中' : '錄音'}
            </Button>
          )}
        </div>
      </div>

      <div className={`${variant === 'card' ? 'p-3 mb-3' : 'p-2 mb-2'} bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200 dark:border-slate-700`}>
        <ThemeText className={`${variant === 'card' ? '' : 'text-xs'} italic text-slate-700 dark:text-slate-200`}>"{target}"</ThemeText>
      </div>

      {/* Recorder UI */}
      {recorder.recording && (
        <div className={`bg-slate-50 dark:bg-slate-800/60 rounded border border-slate-200 dark:border-slate-700 ${variant === 'card' ? 'p-2 mb-3' : 'p-2 mb-2'}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] text-slate-500">錄音中</div>
            <div className="text-[11px] text-slate-500">{Math.round((recorder.volume || 0) * 100)}%</div>
          </div>
          <div className="flex items-center justify-center gap-0.5 h-8">
            {(recorder.waveform || Array(24).fill(0)).map((value, index) => (
              <div
                key={index}
                className="bg-gradient-to-t from-emerald-400 to-sky-500 rounded-full transition-all duration-150 ease-out"
                style={{ width: '3px', height: `${Math.max(2, Math.min(28, value * 24 + 4))}px`, opacity: value > 0.1 ? 1 : 0.3 }}
              />
            ))}
          </div>
        </div>
      )}

      {(speech.error || recorder.error) && (
        <div className={`text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30 rounded-md border border-rose-200 dark:border-rose-700 ${variant === 'card' ? 'p-2 mb-3' : 'p-2 mb-2'}`}>
          {speech.error && <div>語音辨識：{speech.errorMessage || speech.error}</div>}
          {recorder.error && <div>音頻錄製：{recorder.errorMessage || recorder.error}</div>}
        </div>
      )}

      {/* Result */}
      {speech.transcript && (
        <div className={`bg-emerald-50 dark:bg-emerald-900/20 rounded-md border border-emerald-200 dark:border-emerald-700 ${variant === 'card' ? 'p-3' : 'p-2'}`}>
          <div className={`${variant === 'card' ? 'text-sm' : 'text-xs'} text-emerald-700 dark:text-emerald-300 mb-1`}>您的發音：</div>
          <div className={`text-slate-800 dark:text-slate-100 ${variant === 'card' ? 'text-sm mb-2' : 'text-xs mb-1'}`}>{speech.transcript}</div>
          {score && (
            <div className="flex items-center justify-between">
              <div className={`${variant === 'card' ? 'text-sm' : 'text-xs'}`}>
                分數：<span className="font-semibold">{score.percent}%</span>
              </div>
              <div className={`${variant === 'card' ? 'text-xs' : 'text-[11px]'} text-slate-600 dark:text-slate-300`}>{score.detail}</div>
            </div>
          )}
          {recorder.blobUrl && !recorder.recording && (
            <div className={`${variant === 'card' ? 'mt-2' : 'mt-1'}`}>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-sky-600 dark:text-sky-400" onClick={replayRecording}>
                <Volume2 className="h-3 w-3 mr-1" /> 重播錄音
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
  if (variant === 'card') {
    return (
      <ThemeCard className="ring-sky-200/40 dark:ring-sky-700/30">
        {content}
      </ThemeCard>
    )
  }
  return (
    <div className="bg-white/80 dark:bg-slate-800/80 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700 shadow-sm">
      {content}
    </div>
  )
}
