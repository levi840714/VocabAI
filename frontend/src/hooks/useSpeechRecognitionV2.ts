// Enhanced Speech Recognition with better permission handling and Mini App support
// Addresses permission issues and provides better error recovery

import { useCallback, useEffect, useRef, useState } from 'react'

type Recognition = any // webkitSpeechRecognition typing fallback

export interface UseSpeechRecognitionOptions {
  lang?: string
  interimResults?: boolean
  continuous?: boolean
  // 允許自訂靜音偵測與啟動緩衝
  silenceThresholdMs?: number // 無聲多久判定停止（預設 2000ms）
  initialGraceMs?: number // 開始後的緩衝期，在此期間不觸發靜音停止（預設 700ms）
  safetyTimeoutMs?: number // 保險超時（Mini App 預設 12000、一般 30000）
}

export interface ScoreResult {
  score: number // 0..1
  matched: number
  total: number
  missing: string[]
}

interface SpeechState {
  supported: boolean
  listening: boolean
  processing: boolean  // New state for when speech is being processed
  transcript: string
  error: string | null
  permissionState: 'unknown' | 'granted' | 'denied' | 'prompt'
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

export function useSpeechRecognitionV2(options: UseSpeechRecognitionOptions = {}) {
  const [state, setState] = useState<SpeechState>({
    supported: false,
    listening: false,
    processing: false,
    transcript: '',
    error: null,
    permissionState: 'unknown'
  })
  
  const recognitionRef = useRef<Recognition | null>(null)
  const startTimeRef = useRef<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const permissionCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(0)
  const graceUntilRef = useRef<number>(0)

  // Check if we're in Telegram Mini App environment
  const isTelegramMiniApp = useCallback(() => {
    return typeof window !== 'undefined' && 
           (window as any).Telegram && 
           (window as any).Telegram.WebApp
  }, [])

  // Check if we're on mobile device
  const isMobileDevice = useCallback(() => {
    return typeof window !== 'undefined' && 
           (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
            window.innerWidth <= 768)
  }, [])

  // Check microphone permissions
  const checkPermissions = useCallback(async (): Promise<'granted' | 'denied' | 'prompt'> => {
    if (!navigator.permissions) return 'prompt'
    
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as any })
      return result.state as 'granted' | 'denied' | 'prompt'
    } catch {
      return 'prompt'
    }
  }, [])

  // Auto-stop logic based on silence detection
  const handleSilenceDetection = useCallback(() => {
    if (!state.listening) return
    
    const now = Date.now()
    const silenceThreshold = Math.max(500, options.silenceThresholdMs ?? 2000)
    // 在啟動初期給予緩衝，不觸發停止
    if (graceUntilRef.current && now < graceUntilRef.current) {
      return
    }
    
    if (now - lastActivityRef.current > silenceThreshold) {
      console.log('[SpeechRecognitionV2] Auto-stopping due to silence')
      try {
        recognitionRef.current?.stop()
      } catch {}
    }
  }, [state.listening, isMobileDevice])

  // Enhanced error handling with Mini App specific cases
  const handleRecognitionError = useCallback((error: string) => {
    console.error('[SpeechRecognitionV2] Recognition error:', error)
    
    // Clear silence timeout
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
    
    // Don't show errors for common interruption cases
    if (error === 'no-speech' || error === 'aborted' || error === 'audio-capture') {
      setState(s => ({ ...s, listening: false, error: null }))
      return
    }
    
    let userFriendlyError = error
    switch (error) {
      case 'not-allowed':
        userFriendlyError = 'microphone_permission_denied'
        setState(s => ({ ...s, permissionState: 'denied' }))
        break
      case 'service-not-allowed':
        userFriendlyError = 'speech_service_not_allowed'
        break
      case 'network':
        userFriendlyError = 'network_error'
        break
      case 'language-not-supported':
        userFriendlyError = 'language_not_supported'
        break
      default:
        userFriendlyError = error
    }
    
    setState(s => ({ ...s, error: userFriendlyError, listening: false }))
  }, [isMobileDevice])

  // Create and configure recognition instance
  const createRecognition = useCallback(() => {
    const w = typeof window !== 'undefined' ? (window as any) : undefined
    const SR = w?.SpeechRecognition || w?.webkitSpeechRecognition
    
    if (!SR) return null

    try {
      const rec: Recognition = new SR()
      rec.lang = options.lang || 'en-US'
      rec.interimResults = options.interimResults ?? false
      rec.continuous = options.continuous ?? false
      
      // Mini App specific settings
      if (isTelegramMiniApp()) {
        rec.maxAlternatives = 1
        rec.continuous = false // Disable continuous mode in Mini App for stability
      }

      rec.onresult = (e: any) => {
        console.log('[SpeechRecognitionV2] Recognition result received')
        let finalTxt = ''
        let hasInterim = false
        
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]
          if (res.isFinal) {
            finalTxt += res[0].transcript
          } else {
            hasInterim = true
          }
        }
        
        // Update activity timestamp on any speech activity
        if (finalTxt || hasInterim) {
          lastActivityRef.current = Date.now()
        }
        
        if (finalTxt) {
          console.log('[SpeechRecognitionV2] Final result received, entering processing state')
          setState(s => ({ ...s, transcript: finalTxt.trim(), processing: true }))
          
          // On mobile devices, auto-stop after getting final result
          if (isMobileDevice() && finalTxt.trim()) {
            setTimeout(() => {
              console.log('[SpeechRecognitionV2] Auto-stopping after final result on mobile')
              try {
                recognitionRef.current?.stop()
              } catch {}
            }, 500) // Small delay to ensure result is processed
          }
        }
        
        // Reset silence timeout on activity
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
        }
        
        // Set up new silence detection timeout
        if (isMobileDevice() && state.listening) {
          silenceTimeoutRef.current = setTimeout(handleSilenceDetection, 500)
        }
      }

      rec.onerror = (e: any) => {
        handleRecognitionError(e?.error || 'unknown')
      }

      rec.onend = () => {
        console.log('[SpeechRecognitionV2] Recognition ended')
        
        // Clear silence timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current)
          silenceTimeoutRef.current = null
        }
        
        // Set processing to false after a short delay to show result processing is complete
        setState(s => ({ ...s, listening: false }))
        setTimeout(() => {
          setState(s => ({ ...s, processing: false }))
        }, 1000) // 1 second processing indicator
      }

      rec.onstart = () => {
        console.log('[SpeechRecognitionV2] Recognition started')
        startTimeRef.current = Date.now()
        lastActivityRef.current = Date.now()
        // 設定啟動緩衝期，避免太快被靜音偵測關閉
        const grace = Math.max(0, options.initialGraceMs ?? 700)
        graceUntilRef.current = Date.now() + grace
        setState(s => ({ ...s, listening: true, error: null }))
        
        // Start silence detection for mobile devices
        if (isMobileDevice()) {
          silenceTimeoutRef.current = setTimeout(handleSilenceDetection, 1000)
        }
      }

      return rec
    } catch (error: any) {
      console.error('[SpeechRecognitionV2] Failed to create recognition:', error)
      return null
    }
  }, [options.lang, options.interimResults, options.continuous, isTelegramMiniApp, isMobileDevice, handleRecognitionError, handleSilenceDetection, state.listening])

  useEffect(() => {
    const w = typeof window !== 'undefined' ? (window as any) : undefined
    const SR = w?.SpeechRecognition || w?.webkitSpeechRecognition
    const supported = !!SR
    
    setState(s => ({ ...s, supported }))

    if (supported) {
      // Initial permission check
      checkPermissions().then(permissionState => {
        setState(s => ({ ...s, permissionState }))
      })
    }

    return () => {
      try {
        if (recognitionRef.current) recognitionRef.current.stop()
      } catch {}
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (permissionCheckTimeoutRef.current) clearTimeout(permissionCheckTimeoutRef.current)
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current)
    }
  }, [checkPermissions])

  // Periodic permission check for Mini App environments
  useEffect(() => {
    if (!state.supported || !isTelegramMiniApp() || !state.listening) return

    const checkHealth = async () => {
      const permissionState = await checkPermissions()
      setState(s => ({ 
        ...s, 
        permissionState,
        ...(permissionState === 'denied' && { error: 'permission_revoked', listening: false })
      }))
    }

    permissionCheckTimeoutRef.current = setTimeout(checkHealth, 3000)

    return () => {
      if (permissionCheckTimeoutRef.current) {
        clearTimeout(permissionCheckTimeoutRef.current)
      }
    }
  }, [state.supported, state.listening, checkPermissions, isTelegramMiniApp])

  const start = useCallback(async () => {
    console.log('[SpeechRecognitionV2] Starting speech recognition...')
    
    setState(s => ({ ...s, error: null, transcript: '' }))

    if (!state.supported) {
      setState(s => ({ ...s, error: 'speech_recognition_not_supported' }))
      return
    }

    const isInMiniApp = isTelegramMiniApp()
    
    // Check permissions first, with Mini App specific handling
    try {
      const permissionState = await checkPermissions()
      if (permissionState === 'denied') {
        const errorType = isInMiniApp ? 'miniapp_speech_permission_denied' : 'microphone_permission_denied'
        setState(s => ({ ...s, error: errorType, permissionState: 'denied' }))
        return
      }
    } catch (permError) {
      console.log('[SpeechRecognitionV2] Permission check failed, proceeding anyway for Mini App:', permError)
      // In Mini App, permission check might fail but recognition might still work
    }

    let retries = isInMiniApp ? 3 : 1
    
    while (retries > 0) {
      try {
        // Stop any existing recognition
        if (recognitionRef.current) {
          try { recognitionRef.current.stop() } catch {}
        }

        const rec = createRecognition()
        if (!rec) {
          setState(s => ({ ...s, error: 'failed_to_create_recognition' }))
          return
        }

        recognitionRef.current = rec

        // Set up safety timeout (especially important for Mini App)
        const timeoutDuration = options.safetyTimeoutMs
          ? options.safetyTimeoutMs
          : (isInMiniApp ? 12000 : 30000) // Shorter timeout for Mini App
        timeoutRef.current = setTimeout(() => {
          console.log('[SpeechRecognitionV2] Safety timeout triggered')
          try { rec.stop() } catch {}
        }, timeoutDuration)

        // Add Mini App specific error handling
        rec.onerror = (e: any) => {
          const error = e?.error || 'unknown'
          console.log(`[SpeechRecognitionV2] Recognition error: ${error}`)
          
          if (isInMiniApp && (error === 'not-allowed' || error === 'service-not-allowed')) {
            if (retries > 1) {
              console.log('[SpeechRecognitionV2] Mini App permission error, retrying...')
              setTimeout(() => {
                retries--
                // Retry will be handled by the outer try-catch
              }, 1000)
              return
            } else {
              handleRecognitionError('miniapp_speech_permission_failed')
              return
            }
          }
          
          handleRecognitionError(error)
        }

        rec.start()
        
        // Permission granted implicitly if start succeeds
        setState(s => ({ ...s, permissionState: 'granted' }))
        console.log('[SpeechRecognitionV2] Speech recognition started successfully')
        return // Success, exit retry loop
        
      } catch (error: any) {
        console.error('[SpeechRecognitionV2] Start failed:', error)
        retries--
        
        if (retries > 0 && isInMiniApp) {
          console.log(`[SpeechRecognitionV2] Retrying in Mini App (${retries} retries left)...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
          continue
        }
        
        const errorMessage = isInMiniApp ? 'miniapp_speech_failed' : (error?.message || 'failed_to_start_recognition')
        setState(s => ({ ...s, error: errorMessage, listening: false }))
        return
      }
    }
  }, [state.supported, checkPermissions, createRecognition, isTelegramMiniApp, handleRecognitionError])

  const stop = useCallback(() => {
    console.log('[SpeechRecognitionV2] Stopping speech recognition...')
    
    // If we have a transcript but still processing, show processing state
    const hasTranscript = state.transcript.length > 0
    if (hasTranscript) {
      setState(s => ({ ...s, listening: false, processing: true }))
      // Clear processing state after delay
      setTimeout(() => {
        setState(s => ({ ...s, processing: false }))
      }, 1000)
    } else {
      setState(s => ({ ...s, listening: false, processing: false }))
    }
    
    try {
      recognitionRef.current?.stop()
    } catch {}
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current)
      silenceTimeoutRef.current = null
    }
  }, [state.transcript])

  const reset = useCallback(() => {
    setState(s => ({ ...s, transcript: '', error: null }))
  }, [])

  const score = useCallback((reference: string): ScoreResult => {
    return scoreAgainstTarget(state.transcript, reference)
  }, [state.transcript])

  // Enhanced error messages with Mini App specific guidance
  const getErrorMessage = useCallback((error: string | null) => {
    if (!error) return null
    
    switch (error) {
      case 'microphone_permission_denied':
        return '麥克風權限被拒絕，請在瀏覽器設定中允許麥克風存取'
      case 'miniapp_speech_permission_denied':
        return 'Mini App 語音權限被拒絕，請確認 Telegram 應用有麥克風權限'
      case 'miniapp_speech_permission_failed':
        return 'Mini App 語音權限問題，請重啟 Telegram 應用並重新授權'
      case 'miniapp_speech_failed':
        return 'Mini App 語音辨識啟動失敗，請重新嘗試或重啟應用'
      case 'speech_recognition_not_supported':
        return '此瀏覽器不支援語音辨識功能'
      case 'speech_service_not_allowed':
        return '語音辨識服務被禁用，請檢查瀏覽器設定'
      case 'network_error':
        return '網路連線問題，語音辨識暫時無法使用'
      case 'language_not_supported':
        return '不支援所選語言的語音辨識'
      case 'permission_revoked':
        return '麥克風權限已被撤銷，請重新整理頁面並允許權限'
      case 'failed_to_create_recognition':
        return '無法初始化語音辨識，請重試'
      case 'failed_to_start_recognition':
        return '無法啟動語音辨識，請檢查麥克風權限'
      default:
        return `語音辨識錯誤: ${error}`
    }
  }, [])

  return {
    supported: state.supported,
    listening: state.listening,
    processing: state.processing,
    transcript: state.transcript,
    error: state.error,
    errorMessage: getErrorMessage(state.error),
    permissionState: state.permissionState,
    start,
    stop,
    reset,
    score,
  }
}
