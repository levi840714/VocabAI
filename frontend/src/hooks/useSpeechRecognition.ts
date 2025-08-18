// Lightweight Web Speech API hook for MVP speaking practice
// Provides start/stop, transcript, basic error handling, and simple scoring

import { useCallback, useEffect, useRef, useState } from 'react'

type Recognition = any // webkitSpeechRecognition typing fallback

export interface UseSpeechRecognitionOptions {
  lang?: string
  interimResults?: boolean
  continuous?: boolean
}

export interface ScoreResult {
  score: number // 0..1
  matched: number
  total: number
  missing: string[]
}

function normalize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function scoreAgainstTarget(hypothesis: string, reference: string): ScoreResult {
  const hyp = normalize(hypothesis)
  const ref = normalize(reference)

  const refFreq: Record<string, number> = {}
  for (const t of ref) refFreq[t] = (refFreq[t] || 0) + 1

  let matched = 0
  for (const t of hyp) {
    if (refFreq[t] && refFreq[t] > 0) {
      matched += 1
      refFreq[t] -= 1
    }
  }

  const total = Math.max(ref.length, 1)
  const missing: string[] = []
  for (const [w, c] of Object.entries(refFreq)) {
    for (let i = 0; i < (c || 0); i++) missing.push(w)
  }
  return {
    score: matched / total,
    matched,
    total,
    missing,
  }
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<Recognition | null>(null)

  useEffect(() => {
    const w = typeof window !== 'undefined' ? (window as any) : undefined
    const SR = w?.SpeechRecognition || w?.webkitSpeechRecognition
    setSupported(!!SR)
    return () => {
      try {
        if (recognitionRef.current) recognitionRef.current.stop()
      } catch {}
    }
  }, [])

  const start = useCallback(() => {
    setError(null)
    setTranscript('')
    const w = typeof window !== 'undefined' ? (window as any) : undefined
    const SR = w?.SpeechRecognition || w?.webkitSpeechRecognition
    if (!SR) {
      setSupported(false)
      setError('SpeechRecognition not supported in this environment')
      return
    }
    try {
      const rec: Recognition = new SR()
      rec.lang = options.lang || 'en-US'
      rec.interimResults = options.interimResults ?? false
      rec.continuous = options.continuous ?? false

      rec.onresult = (e: any) => {
        let finalTxt = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]
          if (res.isFinal) finalTxt += res[0].transcript
        }
        if (finalTxt) setTranscript(finalTxt.trim())
      }
      rec.onerror = (e: any) => {
        const err = e?.error || 'unknown'
        // interruption/cancel are common during manual stop; avoid noisy errors
        if (err !== 'no-speech' && err !== 'aborted' && err !== 'audio-capture') {
          setError(err)
        }
        setListening(false)
      }
      rec.onend = () => {
        setListening(false)
      }

      recognitionRef.current = rec
      rec.start()
      setListening(true)
    } catch (e: any) {
      setError(e?.message || 'Failed to start recognition')
      setListening(false)
    }
  }, [options.lang, options.interimResults, options.continuous])

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {}
    setListening(false)
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setError(null)
  }, [])

  const score = useCallback((reference: string): ScoreResult => {
    return scoreAgainstTarget(transcript, reference)
  }, [transcript])

  return {
    supported,
    listening,
    transcript,
    error,
    start,
    stop,
    reset,
    score,
  }
}

