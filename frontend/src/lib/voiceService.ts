/**
 * 統一語音服務
 * 處理跨平台的語音播放功能，包括 Web 和移動設備的兼容性
 */

export interface VoiceSettings {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  // 新增：供應者與偏好語音名稱（暫不強制使用）
  provider?: 'auto' | 'webspeech' | 'cloud';
  preferredVoiceName?: string;
}

class VoiceService {
  private static instance: VoiceService;
  private isPlaying = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners = new Set<(event: { type: string; data?: any }) => void>();

  private constructor() {
    // 確保在頁面卸載時停止語音
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.stop();
      });
    }
  }

  public static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  // 事件訂閱（邊界、開始、結束、錯誤）
  public on(listener: (event: { type: string; data?: any }) => void) {
    this.listeners.add(listener);
  }

  public off(listener: (event: { type: string; data?: any }) => void) {
    this.listeners.delete(listener);
  }

  private emit(event: { type: string; data?: any }) {
    this.listeners.forEach(l => {
      try { l(event); } catch {}
    });
  }

  /**
   * 檢查語音功能是否可用
   */
  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /**
   * 檢查是否為移動設備
   */
  private isMobileDevice(): boolean {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  /**
   * 檢測運行環境
   */
  private isTelegramMiniApp(): boolean {
    const tg = (window as any).Telegram?.WebApp;
    // 更嚴格判斷：需存在且具備 initData（代表真正在 Telegram WebApp 內）
    return !!(tg && (tg.initData || tg.initDataUnsafe?.user));
  }

  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  /**
   * 根據環境獲取最佳語音參數
   */
  private getOptimalVoiceSettings(customSettings: VoiceSettings = {}): VoiceSettings {
    const isTgMiniApp = this.isTelegramMiniApp();
    const isMobile = this.isMobileDevice();
    const isIOSDevice = this.isIOS();

    let defaultSettings: VoiceSettings;

    // Telegram Mini App 環境 - 根據實際測試優化
    if (isTgMiniApp) {
      defaultSettings = {
        language: 'en-US',
        rate: isIOSDevice ? 1.0 : 0.95,  // 提升語速
        pitch: 1.15,  // 提高音調降低單調感
        volume: 0.95
      };
    }
    // 一般手機瀏覽器
    else if (isMobile) {
      defaultSettings = {
        language: 'en-US',
        rate: isIOSDevice ? 0.95 : 0.95,
        pitch: 1.15,
        volume: 0.95
      };
    }
    // 桌面瀏覽器（Chrome 等）- 降低語速以改善體驗
    else {
      defaultSettings = {
        language: 'en-US',
        rate: 0.85,
        pitch: 1.05,
        volume: 0.95
      };
    }

    // 合併自定義設定
    return {
      ...defaultSettings,
      ...customSettings
    };
  }

  /**
   * 獲取最佳語音引擎
   */
  private getBestVoice(preferredName?: string, preferredLang?: string): SpeechSynthesisVoice | null {
    if (!this.isSupported()) return null;
    
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    
    // 先按語言過濾（若提供）
    const byLang = preferredLang 
      ? voices.filter(v => v.lang && v.lang.toLowerCase().startsWith(preferredLang.toLowerCase()))
      : [];

    // 使用者指定偏好名稱，優先於語言匹配集合
    if (preferredName) {
      const pool = byLang.length > 0 ? byLang : voices;
      const exact = pool.find(v => v.name === preferredName);
      if (exact) return exact;
      const fuzzy = pool.find(v => v.name.toLowerCase().includes(preferredName.toLowerCase()));
      if (fuzzy) return fuzzy;
    }

    // 優先選擇的語音引擎順序
    const preferredVoices = [
      'Google US English',           // Chrome 優質語音
      'Samantha',                   // macOS 高品質語音
      'Alex',                       // macOS 備選語音
      'Microsoft David Desktop',    // Windows 語音
      'Microsoft Zira Desktop',     // Windows 女性語音
    ];
    
    // 在語言匹配集合內嘗試找到優先語音
    if (byLang.length > 0) {
      for (const voiceName of preferredVoices) {
        const voice = byLang.find(v => v.name.includes(voiceName));
        if (voice) return voice;
      }
      // 不命中則使用語言匹配集合中的第一個
      if (byLang[0]) return byLang[0];
    } else {
      for (const voiceName of preferredVoices) {
        const voice = voices.find(v => v.name.includes(voiceName));
        if (voice) return voice;
      }
    }
    
    // 找英語語音作為備選
    const englishVoice = voices.find(v => 
      v.lang.startsWith('en-') && v.name.toLowerCase().includes('english')
    );
    if (englishVoice) return englishVoice;
    
    // 最後備選：任何英語語音
    return voices.find(v => v.lang.startsWith('en-')) || voices[0];
  }

  /**
   * 播放語音
   */
  public async speak(text: string, settings: VoiceSettings = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 停止當前播放的語音
        this.stop();

        if (!this.isSupported()) {
          // 使用備用方案：Google Translate TTS
          const optimalSettings = this.getOptimalVoiceSettings(settings);
          this.playWithGoogleTTS(text, optimalSettings.volume)
            .then(() => resolve())
            .catch(reject);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;

        // 獲取針對當前環境優化的語音參數
        const optimalSettings = this.getOptimalVoiceSettings(settings);
        
        // 設定語音參數（提升行動端體驗）
        utterance.lang = optimalSettings.language || 'en-US';
        utterance.rate = optimalSettings.rate || 0.9;
        utterance.pitch = optimalSettings.pitch || 1.1;
        utterance.volume = optimalSettings.volume ?? 1;

        // 嘗試設定最佳語音引擎
        const bestVoice = this.getBestVoice(settings.preferredVoiceName, optimalSettings.language);
        if (bestVoice) {
          utterance.voice = bestVoice;
          console.log(`🎵 使用語音引擎: ${bestVoice.name} (環境: ${
            this.isTelegramMiniApp() ? 'Telegram Mini App' :
            this.isMobileDevice() ? '手機瀏覽器' : '桌面瀏覽器'
          })`);
        }

        // 事件監聽器
        utterance.onstart = () => {
          this.isPlaying = true;
          this.emit({ type: 'start', data: { text } });
        };

        utterance.onend = () => {
          this.isPlaying = false;
          this.currentUtterance = null;
          this.emit({ type: 'end', data: { text } });
          resolve();
        };

        utterance.onerror = (event: any) => {
          const err = (event && event.error) || '';
          console.warn('Speech synthesis error:', err);
          this.isPlaying = false;
          this.currentUtterance = null;
          this.emit({ type: 'error', data: { text, error: err } });

          // 中斷/取消屬於預期行為（例如 stop/cancel 或連續點擊），不視為失敗
          if (err === 'interrupted' || err === 'canceled') {
            resolve();
            return;
          }

          // 其他錯誤：行動端嘗試回退，桌面直接回錯
          if (this.isMobileDevice()) {
            this.playWithGoogleTTS(text, optimalSettings.volume)
              .then(() => resolve())
              .catch(reject);
          } else {
            reject(new Error(`Speech synthesis failed: ${err}`));
          }
        };

        // 單詞/字元邊界（部分瀏覽器支援）
        utterance.onboundary = (ev: any) => {
          this.emit({ type: 'boundary', data: {
            charIndex: ev?.charIndex ?? 0,
            charLength: ev?.charLength ?? 0,
            name: ev?.name,
            elapsedTime: ev?.elapsedTime
          }});
        };

        // 確保語音引擎已就緒：所有環境都等待 voices 準備
        const speakNow = () => speechSynthesis.speak(utterance);
        if (speechSynthesis.getVoices().length === 0) {
          speechSynthesis.onvoiceschanged = () => {
            const best = this.getBestVoice(settings.preferredVoiceName, optimalSettings.language);
            if (best) utterance.voice = best;
            speakNow();
          };
        } else {
          speakNow();
        }
      } catch (error) {
        this.isPlaying = false;
        this.currentUtterance = null;
        reject(error);
      }
    });
  }

  /**
   * 使用 Google TTS 作為備用方案
   */
  private async playWithGoogleTTS(text: string, volume: number = 1): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const encodedText = encodeURIComponent(text);
        const audio = new Audio(
          `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodedText}`
        );

        // 應用音量設定
        audio.volume = Math.max(0, Math.min(1, volume));

        audio.onloadeddata = () => {
          this.isPlaying = true;
        };

        audio.onended = () => {
          this.isPlaying = false;
          resolve();
        };

        audio.onerror = () => {
          this.isPlaying = false;
          reject(new Error('Google TTS playback failed'));
        };

        audio.play().catch(reject);
      } catch (error) {
        this.isPlaying = false;
        reject(error);
      }
    });
  }

  /**
   * 停止當前播放的語音
   */
  public stop(): void {
    if (this.isSupported() && speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    this.isPlaying = false;
    this.currentUtterance = null;
  }

  /**
   * 暫停語音播放
   */
  public pause(): void {
    if (this.isSupported() && speechSynthesis.speaking) {
      speechSynthesis.pause();
    }
  }

  /**
   * 恢復語音播放
   */
  public resume(): void {
    if (this.isSupported() && speechSynthesis.paused) {
      speechSynthesis.resume();
    }
  }

  /**
   * 檢查是否正在播放
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * 檢查是否處於暫停狀態
   */
  public getIsPaused(): boolean {
    if (!this.isSupported()) return false;
    return speechSynthesis.paused === true;
  }

  /**
   * 獲取可用的語音列表
   */
  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) {
      return [];
    }
    return speechSynthesis.getVoices().filter(voice => 
      voice.lang.startsWith('en')
    );
  }

  /**
   * 設定首選語音
   */
  public setPreferredVoice(voiceURI: string): void {
    // 這個方法可以用來設定用戶偏好的語音
    // 實際實現可能需要與設定系統整合
  }

  /**
   * 獲取環境資訊（用於調試和設定頁面）
   */
  public getEnvironmentInfo() {
    return {
      isTelegramMiniApp: this.isTelegramMiniApp(),
      isMobile: this.isMobileDevice(),
      isIOS: this.isIOS(),
      supportsSpeechSynthesis: this.isSupported(),
      availableVoices: this.isSupported() ? speechSynthesis.getVoices().length : 0,
      currentSettings: this.getOptimalVoiceSettings(),
      bestVoice: this.getBestVoice()?.name || 'Default',
      availableVoiceNames: this.isSupported() 
        ? speechSynthesis.getVoices().map(v => v.name).slice(0, 5)
        : []
    };
  }
}

// 導出單例實例
export const voiceService = VoiceService.getInstance();

// 便利函數
export const speak = (text: string, settings?: VoiceSettings) => {
  return voiceService.speak(text, settings);
};

export const stopSpeaking = () => {
  voiceService.stop();
};

export const isVoiceSupported = () => {
  return voiceService.isSupported();
};

// 事件訂閱導出
export const onVoiceEvent = (listener: (event: { type: string; data?: any }) => void) => {
  voiceService.on(listener);
  return () => voiceService.off(listener);
};
