// Simple in-memory audio recorder using MediaRecorder
// Keeps the latest recording as a Blob URL for local replay; no persistence

import { useCallback, useEffect, useRef, useState } from 'react'

interface RecorderState {
  supported: boolean
  recording: boolean
  blobUrl: string | null
  mimeType: string | null
  error: string | null
  volume: number
  waveform: number[]
}

export function useAudioRecorder() {
  const [state, setState] = useState<RecorderState>({
    supported: false,
    recording: false,
    blobUrl: null,
    mimeType: null,
    error: null,
    volume: 0,
    waveform: [],
  })
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)

  useEffect(() => {
    const supported = typeof window !== 'undefined' && !!(window as any).MediaRecorder && !!navigator.mediaDevices?.getUserMedia
    setState((s) => ({ ...s, supported }))
    return () => {
      // cleanup stream and blob url on unmount
      try { stop() } catch {}
      if (state.blobUrl) URL.revokeObjectURL(state.blobUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = useCallback(async () => {
    if (!state.supported || state.recording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '')
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onerror = (e: any) => {
        setState((s) => ({ ...s, error: e?.error || 'recorder_error', recording: false }))
      }
      recorder.onstop = () => {
        // try to drop the last tiny chunk to reduce trailing noise
        if (chunksRef.current.length > 1) {
          chunksRef.current.pop()
        }
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || 'audio/webm' })
        if (state.blobUrl) URL.revokeObjectURL(state.blobUrl)
        const url = URL.createObjectURL(blob)
        chunksRef.current = []
        // stop tracks
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop())
        mediaStreamRef.current = null
        setState((s) => ({ ...s, recording: false, blobUrl: url, mimeType: recorder.mimeType || mime || 'audio/webm', volume: 0, waveform: [] }))
      }

      // Setup analyser for live levels
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioCtxRef.current = audioCtx
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        analyser.fftSize = 512
        analyser.smoothingTimeConstant = 0.85
        source.connect(analyser)
        analyserRef.current = analyser

        const timeDomain = new Uint8Array(analyser.frequencyBinCount)
        const render = (now: number) => {
          rafRef.current = requestAnimationFrame(render)
          if (!analyserRef.current) return
          analyserRef.current.getByteTimeDomainData(timeDomain)
          // RMS volume
          let sum = 0
          for (let i = 0; i < timeDomain.length; i++) {
            const v = (timeDomain[i] - 128) / 128
            sum += v * v
          }
          const rms = Math.sqrt(sum / timeDomain.length)
          // downsample to 32 bars for waveform
          const bars = 32
          const step = Math.floor(timeDomain.length / bars)
          const wf: number[] = []
          for (let i = 0; i < bars; i++) {
            const idx = i * step
            const val = Math.abs((timeDomain[idx] - 128) / 128)
            wf.push(Math.min(1, val * 1.5))
          }
          // throttle UI updates (~10fps)
          if (now - lastUpdateRef.current > 100) {
            lastUpdateRef.current = now
            setState((s) => ({ ...s, volume: rms, waveform: wf }))
          }
        }
        rafRef.current = requestAnimationFrame(render)
      } catch {}

      // request periodic chunks to allow simple tail-trim
      try { (recorder as any).start(200) } catch { recorder.start() }
      setState((s) => ({ ...s, recording: true, error: null }))
    } catch (err: any) {
      setState((s) => ({ ...s, error: err?.message || 'cannot_start_recorder', recording: false }))
    }
  }, [state.supported, state.recording, state.blobUrl])

  const stop = useCallback(() => {
    // Immediately hide meters in UI
    setState((s) => ({ ...s, recording: false, volume: 0, waveform: [] }))
    try { mediaRecorderRef.current?.stop() } catch {}
    try {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      analyserRef.current?.disconnect()
      analyserRef.current = null
      audioCtxRef.current?.close()
      audioCtxRef.current = null
    } catch {}
    try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()) } catch {}
  }, [])

  const play = useCallback(() => {
    if (!state.blobUrl) return
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      audioRef.current.src = state.blobUrl
      audioRef.current.play().catch(() => {})
    } catch {}
  }, [state.blobUrl])

  const clear = useCallback(() => {
    if (state.blobUrl) URL.revokeObjectURL(state.blobUrl)
    setState((s) => ({ ...s, blobUrl: null }))
  }, [state.blobUrl])

  return {
    supported: state.supported,
    recording: state.recording,
    blobUrl: state.blobUrl,
    mimeType: state.mimeType,
    error: state.error,
    volume: state.volume,
    waveform: state.waveform,
    start,
    stop,
    play,
    clear,
  }
}
