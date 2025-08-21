import { useState, useCallback, useEffect } from 'react';
import { voiceService, VoiceSettings } from '@/lib/voiceService';
import { useSettings } from '@/contexts/SettingsContext';

/**
 * 統一語音播放 Hook
 * 整合設定系統，提供一致的語音播放體驗
 */
export function useVoice() {
  const { isVoiceAutoPlay, interfaceSettings } = useSettings();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported(voiceService.isSupported());
  }, []);

  // 播放語音
  const speak = useCallback(async (text: string, customSettings?: VoiceSettings) => {
    if (!text.trim()) return;
    
    try {
      setIsPlaying(true);
      
      const settings: VoiceSettings = {
        language: interfaceSettings.voice_language || 'en-US',
        rate: interfaceSettings.voice_rate ?? 0.9,
        pitch: interfaceSettings.voice_pitch ?? 1.0,
        volume: interfaceSettings.voice_volume ?? 1.0,
        preferredVoiceName: interfaceSettings.preferred_voice_name,
        provider: interfaceSettings.voice_provider || 'webspeech',
        ...customSettings,
      };
      
      await voiceService.speak(text, settings);
    } catch (error) {
      console.error('語音播放失敗:', error);
      // 靜默處理錯誤，不顯示錯誤訊息給用戶
    } finally {
      setIsPlaying(false);
    }
  }, [interfaceSettings]);

  // 自動播放語音（如果設定啟用）
  const autoSpeak = useCallback(async (text: string, customSettings?: VoiceSettings) => {
    if (isVoiceAutoPlay) {
      await speak(text, customSettings);
    }
  }, [speak, isVoiceAutoPlay]);

  // 停止播放
  const stop = useCallback(() => {
    voiceService.stop();
    setIsPlaying(false);
  }, []);

  // 暫停與恢復
  const pause = useCallback(() => {
    voiceService.pause();
  }, []);

  const resume = useCallback(() => {
    voiceService.resume();
  }, []);

  // 切換播放：若正在播放則停止，否則播放
  const toggleSpeak = useCallback(async (text: string, customSettings?: VoiceSettings) => {
    if (isPlaying) {
      stop();
      return;
    }
    await speak(text, customSettings);
  }, [isPlaying, stop, speak]);

  // 播放單字（預設設定）
  const speakWord = useCallback(async (word: string) => {
    await speak(word, {
      language: interfaceSettings.voice_language || 'en-US',
      rate: (interfaceSettings.voice_rate ?? 0.9) * 0.95,
      pitch: interfaceSettings.voice_pitch ?? 1.0,
      volume: interfaceSettings.voice_volume ?? 1.0,
      preferredVoiceName: interfaceSettings.preferred_voice_name,
      provider: interfaceSettings.voice_provider || 'webspeech',
    });
  }, [speak, interfaceSettings]);

  const toggleSpeakWord = useCallback(async (word: string) => {
    if (isPlaying) {
      stop();
      return;
    }
    await speakWord(word);
  }, [isPlaying, stop, speakWord]);

  // 播放句子（稍快語速）
  const speakSentence = useCallback(async (sentence: string) => {
    await speak(sentence, {
      language: interfaceSettings.voice_language || 'en-US',
      rate: (interfaceSettings.voice_rate ?? 0.95) * 1.0,
      pitch: (interfaceSettings.voice_pitch ?? 1.0),
      volume: interfaceSettings.voice_volume ?? 1.0,
      preferredVoiceName: interfaceSettings.preferred_voice_name,
      provider: interfaceSettings.voice_provider || 'webspeech',
    });
  }, [speak, interfaceSettings]);

  const toggleSpeakSentence = useCallback(async (sentence: string) => {
    if (isPlaying) {
      stop();
      return;
    }
    await speakSentence(sentence);
  }, [isPlaying, stop, speakSentence]);

  // 自動播放單字
  const autoSpeakWord = useCallback(async (word: string) => {
    if (isVoiceAutoPlay) {
      await speakWord(word);
    }
  }, [speakWord, isVoiceAutoPlay]);

  // 自動播放句子
  const autoSpeakSentence = useCallback(async (sentence: string) => {
    if (isVoiceAutoPlay) {
      await speakSentence(sentence);
    }
  }, [speakSentence, isVoiceAutoPlay]);

  return {
    // 狀態
    isPlaying,
    isSupported,
    isAutoPlayEnabled: isVoiceAutoPlay,
    isPaused: voiceService.getIsPaused(),
    
    // 基本功能
    speak,
    toggleSpeak,
    pause,
    resume,
    stop,
    autoSpeak,
    
    // 專用功能
    speakWord,
    speakSentence,
    toggleSpeakWord,
    toggleSpeakSentence,
    autoSpeakWord,
    autoSpeakSentence,
    
    // 便利屬性
    canPlay: isSupported && !isPlaying
  };
}
