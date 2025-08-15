/**
 * 統一語音服務
 * 處理跨平台的語音播放功能，包括 Web 和移動設備的兼容性
 */

export interface VoiceSettings {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

class VoiceService {
  private static instance: VoiceService;
  private isPlaying = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

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
    return (window as any).Telegram?.WebApp?.platform !== undefined;
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
        rate: isIOSDevice ? 0.9 : 0.85,  // iOS 稍快，Android 略慢
        pitch: 1.1,  // 稍微提高音調增加自然感
        volume: 0.9
      };
    }
    // 一般手機瀏覽器
    else if (isMobile) {
      defaultSettings = {
        language: 'en-US',
        rate: isIOSDevice ? 0.85 : 0.8,
        pitch: 1.0,
        volume: 0.9
      };
    }
    // 桌面瀏覽器（Chrome 等）- 降低語速以改善體驗
    else {
      defaultSettings = {
        language: 'en-US',
        rate: 0.75,  // 調慢一點，解決語速偏快問題
        pitch: 1.0,
        volume: 0.9
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
  private getBestVoice(): SpeechSynthesisVoice | null {
    if (!this.isSupported()) return null;
    
    const voices = speechSynthesis.getVoices();
    if (voices.length === 0) return null;
    
    // 優先選擇的語音引擎順序
    const preferredVoices = [
      'Google US English',           // Chrome 優質語音
      'Samantha',                   // macOS 高品質語音
      'Alex',                       // macOS 備選語音
      'Microsoft David Desktop',    // Windows 語音
      'Microsoft Zira Desktop',     // Windows 女性語音
    ];
    
    // 嘗試找到優先語音
    for (const voiceName of preferredVoices) {
      const voice = voices.find(v => v.name.includes(voiceName));
      if (voice) return voice;
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
          this.playWithGoogleTTS(text)
            .then(() => resolve())
            .catch(reject);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance;

        // 獲取針對當前環境優化的語音參數
        const optimalSettings = this.getOptimalVoiceSettings(settings);
        
        // 設定語音參數
        utterance.lang = optimalSettings.language || 'en-US';
        utterance.rate = optimalSettings.rate || 0.8;
        utterance.pitch = optimalSettings.pitch || 1;
        utterance.volume = optimalSettings.volume || 1;

        // 嘗試設定最佳語音引擎
        const bestVoice = this.getBestVoice();
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
        };

        utterance.onend = () => {
          this.isPlaying = false;
          this.currentUtterance = null;
          resolve();
        };

        utterance.onerror = (event) => {
          this.isPlaying = false;
          this.currentUtterance = null;
          console.warn('Speech synthesis error:', event.error);
          
          // 在移動設備上，如果 Web Speech API 失敗，嘗試備用方案
          if (this.isMobileDevice()) {
            this.playWithGoogleTTS(text)
              .then(() => resolve())
              .catch(reject);
          } else {
            reject(new Error(`Speech synthesis failed: ${event.error}`));
          }
        };

        // 對於移動設備，需要用戶交互才能播放
        if (this.isMobileDevice()) {
          // 確保語音合成器已準備好
          if (speechSynthesis.getVoices().length === 0) {
            speechSynthesis.onvoiceschanged = () => {
              speechSynthesis.speak(utterance);
            };
          } else {
            speechSynthesis.speak(utterance);
          }
        } else {
          speechSynthesis.speak(utterance);
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
  private async playWithGoogleTTS(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const encodedText = encodeURIComponent(text);
        const audio = new Audio(
          `https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodedText}`
        );

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