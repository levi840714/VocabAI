// Enhanced Audio Recorder with better permission handling for Mini App environments
// Addresses permission issues and stream management problems

import { useCallback, useEffect, useRef, useState } from 'react'

interface RecorderState {
  supported: boolean
  recording: boolean
  blobUrl: string | null
  mimeType: string | null
  error: string | null
  volume: number
  waveform: number[]
  permissionState: 'unknown' | 'granted' | 'denied' | 'prompt'
  streamActive: boolean
}

export function useAudioRecorderV2() {
  const [state, setState] = useState<RecorderState>({
    supported: false,
    recording: false,
    blobUrl: null,
    mimeType: null,
    error: null,
    volume: 0,
    waveform: [],
    permissionState: 'unknown',
    streamActive: false,
  })
  
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)
  const permissionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if we're in Telegram Mini App environment
  const isTelegramMiniApp = useCallback(() => {
    return typeof window !== 'undefined' && 
           (window as any).Telegram && 
           (window as any).Telegram.WebApp
  }, [])

  // Enhanced permission checking
  const checkPermissions = useCallback(async (): Promise<'granted' | 'denied' | 'prompt'> => {
    if (!navigator.permissions) return 'prompt'
    
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as any })
      return result.state as 'granted' | 'denied' | 'prompt'
    } catch {
      return 'prompt'
    }
  }, [])

  // Check if current stream is still active
  const isStreamActive = useCallback(() => {
    if (!mediaStreamRef.current) return false
    return mediaStreamRef.current.getTracks().some(track => track.readyState === 'live')
  }, [])

  // Balanced stream acquisition: privacy-conscious but Mini App friendly
  const getOrCreateStream = useCallback(async (): Promise<MediaStream | null> => {
    // Only reuse stream in Mini App environment where permissions are more fragile
    const isInMiniApp = isTelegramMiniApp()
    
    // Enhanced stream reuse for Mini App to minimize permission prompts
    if (isInMiniApp && mediaStreamRef.current && isStreamActive()) {
      console.log('[AudioRecorderV2] Reusing existing active stream in Mini App')
      return mediaStreamRef.current
    }

    // For Mini App, also try to reuse recently created but inactive streams
    // if they were created within the last 5 seconds (likely same session)
    if (isInMiniApp && mediaStreamRef.current) {
      const tracks = mediaStreamRef.current.getTracks()
      const hasRecentTracks = tracks.some(track => 
        track.readyState === 'ended' && track.label // Recently ended but still labeled
      )
      
      if (hasRecentTracks) {
        console.log('[AudioRecorderV2] Attempting to reactivate recent stream in Mini App')
        try {
          // Try to re-request with same constraints to avoid new permission
          const constraints: MediaStreamConstraints = {
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
              sampleRate: 16000,
              channelCount: 1
            }
          }
          const newStream = await navigator.mediaDevices.getUserMedia(constraints)
          
          // Clean up old stream
          mediaStreamRef.current.getTracks().forEach(track => track.stop())
          mediaStreamRef.current = newStream
          setState(s => ({ ...s, streamActive: true, error: null, permissionState: 'granted' }))
          
          console.log('[AudioRecorderV2] Successfully reactivated stream without new permission prompt')
          return newStream
        } catch (reactivateError) {
          console.log('[AudioRecorderV2] Stream reactivation failed, proceeding with normal flow')
        }
      }
    }

    // In regular browsers, always get fresh stream for privacy
    // In Mini App, clean up old stream if exists but inactive and can't be reused
    if (mediaStreamRef.current) {
      console.log('[AudioRecorderV2] Cleaning up old stream')
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
      setState(s => ({ ...s, streamActive: false }))
    }

    // More retries for Mini App due to permission fragility
    let retries = isInMiniApp ? 5 : 3
    
    while (retries > 0) {
      try {
        console.log(`[AudioRecorderV2] Requesting microphone access (${isInMiniApp ? 'Mini App' : 'Browser'}), retries left:`, retries)
        
        // More conservative constraints for Mini App to reduce permission issues
        const constraints: MediaStreamConstraints = {
          audio: isInMiniApp ? {
            // Minimal constraints for Mini App to avoid permission complexity
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 16000,
            channelCount: 1
          } : {
            // Standard constraints for regular browsers
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        }
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        mediaStreamRef.current = stream
        
        setState(s => ({ ...s, streamActive: true, error: null, permissionState: 'granted' }))
        
        // Set up stream monitoring with Mini App specific handling
        stream.getTracks().forEach(track => {
          track.addEventListener('ended', () => {
            console.log('[AudioRecorderV2] Stream track ended')
            setState(s => ({ ...s, streamActive: false }))
            
            // In Mini App, don't immediately clear the ref to allow quick restart
            if (!isInMiniApp) {
              mediaStreamRef.current = null
            }
          })
          
          // Mini App: Monitor track state changes more aggressively
          if (isInMiniApp) {
            track.addEventListener('mute', () => {
              console.log('[AudioRecorderV2] Track muted in Mini App')
            })
            
            track.addEventListener('unmute', () => {
              console.log('[AudioRecorderV2] Track unmuted in Mini App')
            })
          }
        })
        
        console.log(`[AudioRecorderV2] Stream acquired successfully: ${stream.getTracks().length} tracks`)
        return stream
        
      } catch (error: any) {
        console.error('[AudioRecorderV2] Failed to get media stream:', error)
        retries--
        
        if (error.name === 'NotAllowedError') {
          if (isInMiniApp) {
            // In Mini App, permission denial might be temporary due to WebView context switches
            console.log('[AudioRecorderV2] Permission denied in Mini App, this might be temporary')
            setState(s => ({ ...s, permissionState: 'denied', error: 'miniapp_permission_temporary' }))
          } else {
            setState(s => ({ ...s, permissionState: 'denied', error: 'microphone_permission_denied' }))
          }
          
          // For Mini App, still try to retry as permission might be restored
          if (!isInMiniApp) {
            return null
          }
        } else if (error.name === 'NotFoundError') {
          setState(s => ({ ...s, error: 'microphone_not_found' }))
          return null
        } else if (error.name === 'AbortError') {
          console.log('[AudioRecorderV2] getUserMedia aborted, likely due to Mini App context switch')
          setState(s => ({ ...s, error: 'miniapp_context_switch' }))
        }
        
        if (retries > 0) {
          // Longer wait for Mini App retries
          const waitTime = isInMiniApp ? 1000 : 500
          console.log(`[AudioRecorderV2] Waiting ${waitTime}ms before retry...`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
        } else {
          const errorMessage = isInMiniApp ? 'miniapp_permission_failed' : (error.message || 'cannot_access_microphone')
          setState(s => ({ ...s, error: errorMessage }))
          return null
        }
      }
    }
    return null
  }, [isStreamActive, isTelegramMiniApp])

  useEffect(() => {
    const supported = typeof window !== 'undefined' && 
                     !!(window as any).MediaRecorder && 
                     !!navigator.mediaDevices?.getUserMedia

    setState(s => ({ ...s, supported }))

    if (supported) {
      // Initial permission check
      checkPermissions().then(permissionState => {
        setState(s => ({ ...s, permissionState }))
      })
    }

    return () => {
      // Comprehensive cleanup on unmount to ensure privacy
      console.log('[AudioRecorderV2] Component unmounting, performing complete cleanup')
      
      try { 
        // Stop recording if active
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
        }
      } catch {}
      
      try {
        // Stop and release MediaStream tracks
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => {
            track.stop()
            console.log(`[AudioRecorderV2] Cleanup: stopped ${track.kind} track`)
          })
          mediaStreamRef.current = null
        }
      } catch {}
      
      try {
        // Clean up audio analysis
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        if (audioCtxRef.current) {
          audioCtxRef.current.close()
          audioCtxRef.current = null
        }
      } catch {}
      
      // Clean up blob URLs
      if (state.blobUrl) URL.revokeObjectURL(state.blobUrl)
      
      // Clear timers
      if (permissionCheckTimeoutRef.current) {
        clearTimeout(permissionCheckTimeoutRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Periodic permission and stream health check (for Mini App environments)
  useEffect(() => {
    if (!state.supported || !isTelegramMiniApp()) return

    const checkHealth = async () => {
      const permissionState = await checkPermissions()
      const streamActive = isStreamActive()
      
      setState(s => ({ 
        ...s, 
        permissionState,
        streamActive,
        ...(permissionState === 'denied' && { error: 'permission_revoked' })
      }))
    }

    permissionCheckTimeoutRef.current = setTimeout(() => {
      checkHealth()
      // Repeat check every 10 seconds when recording
      if (state.recording) {
        permissionCheckTimeoutRef.current = setTimeout(checkHealth, 10000)
      }
    }, 5000)

    return () => {
      if (permissionCheckTimeoutRef.current) {
        clearTimeout(permissionCheckTimeoutRef.current)
      }
    }
  }, [state.supported, state.recording, checkPermissions, isStreamActive, isTelegramMiniApp])

  const start = useCallback(async () => {
    if (!state.supported || state.recording) return

    console.log('[AudioRecorderV2] Starting recording...')
    setState(s => ({ ...s, error: null }))

    try {
      const isInMiniApp = isTelegramMiniApp()
      
      // 新增：檢測是否已有其他活躍的麥克風流（如語音辨識）
      const existingStreams = await navigator.mediaDevices.enumerateDevices()
      const hasActiveMicrophone = existingStreams.some(device => 
        device.kind === 'audioinput' && device.label !== ''
      )
      
      // For Mini App, skip permission check if we already have an active stream
      // This avoids unnecessary API calls that might trigger permission prompts
      if ((isInMiniApp && mediaStreamRef.current && isStreamActive()) || hasActiveMicrophone) {
        console.log('[AudioRecorderV2] Skipping permission check - existing stream detected')
      } else {
        // Check permissions first for new streams
        const permissionState = await checkPermissions()
        if (permissionState === 'denied') {
          setState(s => ({ ...s, error: 'microphone_permission_denied', permissionState: 'denied' }))
          return
        }
      }

      const stream = await getOrCreateStream()
      if (!stream) return

      const mime = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 
                   (MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '')
                   
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e: any) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onerror = (e: any) => {
        console.error('[AudioRecorderV2] Recorder error:', e.error)
        setState(s => ({ ...s, error: e?.error || 'recorder_error', recording: false }))
      }

      recorder.onstop = () => {
        console.log('[AudioRecorderV2] Recording stopped, processing chunks...')
        
        // Cleanup audio analysis
        try {
          if (audioCtxRef.current && audioCtxRef.current.__cleanup) {
            audioCtxRef.current.__cleanup()
          }
        } catch {}
        
        // Process recording data with mobile-friendly approach
        const chunks = [...chunksRef.current]  // Create copy to avoid reference issues
        console.log(`[AudioRecorderV2] Processing ${chunks.length} chunks, total size: ${chunks.reduce((sum, chunk) => sum + chunk.size, 0)} bytes`)
        
        if (chunks.length === 0) {
          console.warn('[AudioRecorderV2] No audio chunks recorded')
          setState(s => ({ 
            ...s, 
            recording: false, 
            volume: 0, 
            waveform: [],
            error: 'no_audio_recorded'
          }))
          return
        }
        
        // Remove last tiny chunk only if we have multiple chunks and the last one is very small
        if (chunks.length > 2 && chunks[chunks.length - 1].size < 1000) {
          chunks.pop()
        }
        
        try {
          // Determine best MIME type for mobile compatibility
          let finalMimeType = recorder.mimeType || mime || 'audio/webm'
          
          // iOS Safari prefers audio/mp4
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
          if (isIOS && MediaRecorder.isTypeSupported('audio/mp4')) {
            finalMimeType = 'audio/mp4'
          }
          
          const blob = new Blob(chunks, { type: finalMimeType })
          console.log(`[AudioRecorderV2] Created blob: ${blob.size} bytes, type: ${finalMimeType}`)
          
          if (blob.size === 0) {
            console.warn('[AudioRecorderV2] Empty blob created')
            setState(s => ({ 
              ...s, 
              recording: false, 
              volume: 0, 
              waveform: [],
              error: 'empty_recording'
            }))
            return
          }
          
          // Clean up old blob URL
          if (state.blobUrl) URL.revokeObjectURL(state.blobUrl)
          
          const url = URL.createObjectURL(blob)
          chunksRef.current = []
          
          // Validate the blob URL by attempting to create an audio element
          const testAudio = new Audio()
          testAudio.src = url
          
          testAudio.onloadedmetadata = () => {
            console.log(`[AudioRecorderV2] Audio blob validated: duration=${testAudio.duration}s`)
          }
          
          testAudio.onerror = (e) => {
            console.error('[AudioRecorderV2] Audio blob validation failed:', e)
            URL.revokeObjectURL(url)
            setState(s => ({ 
              ...s, 
              recording: false, 
              volume: 0, 
              waveform: [],
              error: 'invalid_audio_data'
            }))
            return
          }
          
          setState(s => ({ 
            ...s, 
            recording: false, 
            blobUrl: url, 
            mimeType: finalMimeType,
            volume: 0, 
            waveform: [],
            error: null
          }))
          
        } catch (blobError) {
          console.error('[AudioRecorderV2] Blob creation failed:', blobError)
          setState(s => ({ 
            ...s, 
            recording: false, 
            volume: 0, 
            waveform: [],
            error: 'blob_creation_failed'
          }))
        }
      }

      // Setup audio analysis with mobile compatibility
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioCtxRef.current = audioCtx
        
        // Resume AudioContext if suspended (common on mobile)
        if (audioCtx.state === 'suspended') {
          console.log('[AudioRecorderV2] Resuming suspended AudioContext')
          await audioCtx.resume()
        }
        
        const source = audioCtx.createMediaStreamSource(stream)
        const analyser = audioCtx.createAnalyser()
        
        // More aggressive settings for mobile
        analyser.fftSize = 256  // Smaller FFT size for better mobile performance
        analyser.smoothingTimeConstant = 0.8
        analyser.minDecibels = -90
        analyser.maxDecibels = -10
        
        source.connect(analyser)
        analyserRef.current = analyser

        const timeDomain = new Uint8Array(analyser.frequencyBinCount)
        let isRenderingActive = true
        
        const render = (now: number) => {
          if (!isRenderingActive || !analyserRef.current) {
            return
          }
          
          rafRef.current = requestAnimationFrame(render)
          
          // Check if we're still recording via ref instead of state to avoid closure issues
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
            return
          }

          try {
            analyserRef.current.getByteTimeDomainData(timeDomain)
            
            // Calculate RMS volume with better mobile handling
            let sum = 0
            let validSamples = 0
            for (let i = 0; i < timeDomain.length; i++) {
              const sample = timeDomain[i]
              if (sample !== 128) {  // 128 is silence in 8-bit audio
                const v = (sample - 128) / 128
                sum += v * v
                validSamples++
              }
            }
            
            const rms = validSamples > 0 ? Math.sqrt(sum / validSamples) : 0

            // Generate waveform data with mobile optimization
            const bars = 24  // Fewer bars for mobile
            const step = Math.floor(timeDomain.length / bars)
            const wf: number[] = []
            for (let i = 0; i < bars; i++) {
              const idx = i * step
              if (idx < timeDomain.length) {
                const sample = timeDomain[idx]
                const val = sample !== 128 ? Math.abs((sample - 128) / 128) : 0
                wf.push(Math.min(1, val * 2.0))  // More aggressive amplification
              } else {
                wf.push(0)
              }
            }

            // Throttle UI updates (less frequent on mobile)
            if (now - lastUpdateRef.current > 150) {  // 150ms throttle for mobile
              lastUpdateRef.current = now
              setState(s => ({ ...s, volume: rms, waveform: wf }))
            }
          } catch (renderError) {
            console.warn('[AudioRecorderV2] Render frame error:', renderError)
          }
        }
        
        // Store cleanup function
        const cleanup = () => {
          isRenderingActive = false
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
          }
        }
        
        // Start rendering
        rafRef.current = requestAnimationFrame(render)
        
        // Store cleanup for later use
        audioCtxRef.current.__cleanup = cleanup
        
      } catch (analysisError) {
        console.warn('[AudioRecorderV2] Audio analysis setup failed:', analysisError)
        // Fallback: set minimal waveform to show recording is active
        setState(s => ({ ...s, volume: 0.1, waveform: new Array(24).fill(0.1) }))
      }

      // Start recording with periodic chunks
      try { 
        (recorder as any).start(200) 
      } catch { 
        recorder.start() 
      }
      
      setState(s => ({ ...s, recording: true, error: null }))
      console.log('[AudioRecorderV2] Recording started successfully')

    } catch (err: any) {
      console.error('[AudioRecorderV2] Start recording failed:', err)
      setState(s => ({ ...s, error: err?.message || 'cannot_start_recorder', recording: false }))
    }
  }, [state.supported, state.recording, state.blobUrl, checkPermissions, getOrCreateStream])

  const stop = useCallback(() => {
    console.log('[AudioRecorderV2] Stopping recording...')
    
    // Immediately update UI
    setState(s => ({ ...s, recording: false, volume: 0, waveform: [] }))
    
    try { mediaRecorderRef.current?.stop() } catch {}
    
    try {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      analyserRef.current?.disconnect()
      analyserRef.current = null
      audioCtxRef.current?.close()
      audioCtxRef.current = null
    } catch {}
    
    // Balanced privacy approach: stop tracks in browsers, keep alive briefly in Mini App
    const isInMiniApp = isTelegramMiniApp()
    
    try {
      if (mediaStreamRef.current) {
        if (isInMiniApp) {
          // In Mini App, keep stream alive briefly to avoid permission re-prompts
          console.log('[AudioRecorderV2] Keeping stream alive in Mini App for next recording')
          setState(s => ({ ...s, streamActive: true }))
          
          // Set a timeout to clean up stream after 30 seconds of inactivity
          setTimeout(() => {
            if (mediaStreamRef.current && (!mediaRecorderRef.current || mediaRecorderRef.current?.state === 'inactive')) {
              console.log('[AudioRecorderV2] Cleaning up idle stream in Mini App after timeout')
              mediaStreamRef.current.getTracks().forEach(track => {
                track.stop()
                console.log(`[AudioRecorderV2] Stopped idle track: ${track.kind}`)
              })
              mediaStreamRef.current = null
              setState(s => ({ ...s, streamActive: false }))
            }
          }, 30000)
        } else {
          // In regular browsers, immediately stop tracks for privacy
          console.log('[AudioRecorderV2] Stopping MediaStream tracks for privacy')
          mediaStreamRef.current.getTracks().forEach(track => {
            track.stop()
            console.log(`[AudioRecorderV2] Stopped track: ${track.kind}, state: ${track.readyState}`)
          })
          mediaStreamRef.current = null
          setState(s => ({ ...s, streamActive: false }))
        }
      }
    } catch (streamError) {
      console.error('[AudioRecorderV2] Error handling stream:', streamError)
    }
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
    setState(s => ({ ...s, blobUrl: null }))
  }, [state.blobUrl])

  const clearStream = useCallback(() => {
    try { 
      mediaStreamRef.current?.getTracks().forEach(track => track.stop()) 
      mediaStreamRef.current = null
      setState(s => ({ ...s, streamActive: false }))
    } catch {}
  }, [])

  // Enhanced error messages with Mini App specific guidance
  const getErrorMessage = useCallback((error: string | null) => {
    if (!error) return null
    
    switch (error) {
      case 'microphone_permission_denied':
        return '麥克風權限被拒絕，請在瀏覽器設定中允許麥克風存取'
      case 'miniapp_permission_temporary':
        return 'Mini App 權限暫時失效，請嘗試重新開啟錄音或重啟應用'
      case 'miniapp_permission_failed':
        return 'Mini App 麥克風權限問題，請確認 Telegram 應用有麥克風權限並重啟'
      case 'miniapp_context_switch':
        return 'Mini App 上下文切換導致錄音中斷，請重新嘗試'
      case 'microphone_not_found':
        return '找不到麥克風設備，請檢查設備連接'
      case 'permission_revoked':
        return '麥克風權限已被撤銷，請重新整理頁面並允許權限'
      case 'cannot_access_microphone':
        return '無法存取麥克風，請檢查設備和權限設定'
      case 'no_audio_recorded':
        return '沒有錄製到音頻，請確認麥克風正常工作'
      case 'empty_recording':
        return '錄音檔案為空，請重新錄製'
      case 'invalid_audio_data':
        return '音頻數據無效，請重新錄製'
      case 'blob_creation_failed':
        return '音頻處理失敗，請重試'
      default:
        return `錄音錯誤: ${error}`
    }
  }, [])

  return {
    supported: state.supported,
    recording: state.recording,
    blobUrl: state.blobUrl,
    mimeType: state.mimeType,
    error: state.error,
    errorMessage: getErrorMessage(state.error),
    volume: state.volume,
    waveform: state.waveform,
    permissionState: state.permissionState,
    streamActive: state.streamActive,
    start,
    stop,
    play,
    clear,
    clearStream,
  }
}