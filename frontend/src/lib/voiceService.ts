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

        // 設定語音參數
        utterance.lang = settings.language || 'en-US';
        utterance.rate = settings.rate || 0.8;
        utterance.pitch = settings.pitch || 1;
        utterance.volume = settings.volume || 1;

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