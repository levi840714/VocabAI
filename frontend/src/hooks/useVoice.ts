import { useState, useCallback, useEffect } from 'react';
import { voiceService, VoiceSettings } from '@/lib/voiceService';
import { useSettings } from '@/contexts/SettingsContext';

/**
 * 統一語音播放 Hook
 * 整合設定系統，提供一致的語音播放體驗
 */
export function useVoice() {
  const { isVoiceAutoPlay } = useSettings();
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
        language: 'en-US',
        rate: 0.8,
        pitch: 1,
        volume: 1,
        ...customSettings
      };
      
      await voiceService.speak(text, settings);
    } catch (error) {
      console.error('語音播放失敗:', error);
      // 靜默處理錯誤，不顯示錯誤訊息給用戶
    } finally {
      setIsPlaying(false);
    }
  }, []);

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

  // 播放單字（預設設定）
  const speakWord = useCallback(async (word: string) => {
    await speak(word, {
      language: 'en-US',
      rate: 0.8,
      pitch: 1,
      volume: 1
    });
  }, [speak]);

  // 播放句子（稍快語速）
  const speakSentence = useCallback(async (sentence: string) => {
    await speak(sentence, {
      language: 'en-US',
      rate: 0.9,
      pitch: 1,
      volume: 1
    });
  }, [speak]);

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
    
    // 基本功能
    speak,
    stop,
    autoSpeak,
    
    // 專用功能
    speakWord,
    speakSentence,
    autoSpeakWord,
    autoSpeakSentence,
    
    // 便利屬性
    canPlay: isSupported && !isPlaying
  };
}