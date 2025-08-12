import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  vocabotAPI, 
  UserSettingsResponse, 
  LearningPreferences, 
  InterfaceSettings, 
  AISettings, 
  StudySettings 
} from '@/lib/api';

// 預設設定
const defaultLearningPreferences: LearningPreferences = {
  daily_review_target: 20,
  difficulty_preference: 'mixed',
  review_reminder_enabled: true,
  review_reminder_time: '09:00'
};

const defaultInterfaceSettings: InterfaceSettings = {
  voice_auto_play: false,
  theme_mode: 'light',
  language: 'zh-TW',
  animation_enabled: true
};

const defaultAISettings: AISettings = {
  default_explanation_type: 'simple',
  ai_provider_preference: 'google',
  explanation_detail_level: 'standard'
};

const defaultStudySettings: StudySettings = {
  spaced_repetition_algorithm: 'sm2',
  show_pronunciation: true,
  show_etymology: true,
  auto_mark_learned_threshold: 5
};

interface SettingsContextType {
  // 設定數據
  learningPreferences: LearningPreferences;
  interfaceSettings: InterfaceSettings;
  aiSettings: AISettings;
  studySettings: StudySettings;
  
  // 狀態
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  updateLearningPreferences: (updates: Partial<LearningPreferences>) => Promise<void>;
  updateInterfaceSettings: (updates: Partial<InterfaceSettings>) => Promise<void>;
  updateAISettings: (updates: Partial<AISettings>) => Promise<void>;
  updateStudySettings: (updates: Partial<StudySettings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  
  // 便利方法
  isDarkMode: boolean;
  isAnimationEnabled: boolean;
  isVoiceAutoPlay: boolean;
  shouldShowPronunciation: boolean;
  shouldShowEtymology: boolean;
  dailyTarget: number;
  autoLearnedThreshold: number;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  // 基本狀態
  const [learningPreferences, setLearningPreferences] = useState<LearningPreferences>(defaultLearningPreferences);
  const [interfaceSettings, setInterfaceSettings] = useState<InterfaceSettings>(defaultInterfaceSettings);
  const [aiSettings, setAISettings] = useState<AISettings>(defaultAISettings);
  const [studySettings, setStudySettings] = useState<StudySettings>(defaultStudySettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入設定
  const refreshSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userSettings = await vocabotAPI.getUserSettings();
      
      setLearningPreferences(userSettings.learning_preferences);
      setInterfaceSettings(userSettings.interface_settings);
      setAISettings(userSettings.ai_settings);
      setStudySettings(userSettings.study_settings);
      
    } catch (err) {
      console.error('載入設定失敗:', err);
      setError(err instanceof Error ? err.message : '載入設定失敗');
      // 載入失敗時保持預設設定
    } finally {
      setIsLoading(false);
    }
  };

  // 更新學習偏好
  const updateLearningPreferences = async (updates: Partial<LearningPreferences>) => {
    try {
      const newPreferences = { ...learningPreferences, ...updates };
      
      await vocabotAPI.updateSettings({
        learning_preferences: newPreferences
      });
      
      setLearningPreferences(newPreferences);
    } catch (err) {
      console.error('更新學習偏好失敗:', err);
      throw err;
    }
  };

  // 更新介面設定
  const updateInterfaceSettings = async (updates: Partial<InterfaceSettings>) => {
    try {
      const newSettings = { ...interfaceSettings, ...updates };
      
      await vocabotAPI.updateSettings({
        interface_settings: newSettings
      });
      
      setInterfaceSettings(newSettings);
      
      // 立即應用主題變更
      if (updates.theme_mode) {
        applyTheme(updates.theme_mode);
      }
    } catch (err) {
      console.error('更新介面設定失敗:', err);
      throw err;
    }
  };

  // 更新 AI 設定
  const updateAISettings = async (updates: Partial<AISettings>) => {
    try {
      const newSettings = { ...aiSettings, ...updates };
      
      await vocabotAPI.updateSettings({
        ai_settings: newSettings
      });
      
      setAISettings(newSettings);
    } catch (err) {
      console.error('更新 AI 設定失敗:', err);
      throw err;
    }
  };

  // 更新學習策略
  const updateStudySettings = async (updates: Partial<StudySettings>) => {
    try {
      const newSettings = { ...studySettings, ...updates };
      
      await vocabotAPI.updateSettings({
        study_settings: newSettings
      });
      
      setStudySettings(newSettings);
    } catch (err) {
      console.error('更新學習策略失敗:', err);
      throw err;
    }
  };

  // 應用主題
  const applyTheme = (themeMode: string) => {
    const root = document.documentElement;
    
    if (themeMode === 'dark') {
      root.classList.add('dark');
    } else if (themeMode === 'light') {
      root.classList.remove('dark');
    } else if (themeMode === 'auto') {
      // 根據系統偏好設定
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  // 監聽系統主題變更
  useEffect(() => {
    if (interfaceSettings.theme_mode === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        applyTheme('auto');
      };
      
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, [interfaceSettings.theme_mode]);

  // 初始載入
  useEffect(() => {
    refreshSettings();
  }, []);

  // 應用初始主題
  useEffect(() => {
    if (!isLoading) {
      applyTheme(interfaceSettings.theme_mode);
    }
  }, [isLoading, interfaceSettings.theme_mode]);

  // 便利屬性
  const isDarkMode = interfaceSettings.theme_mode === 'dark' || 
    (interfaceSettings.theme_mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  const isAnimationEnabled = interfaceSettings.animation_enabled;
  const isVoiceAutoPlay = interfaceSettings.voice_auto_play;
  const shouldShowPronunciation = studySettings.show_pronunciation;
  const shouldShowEtymology = studySettings.show_etymology;
  const dailyTarget = learningPreferences.daily_review_target;
  const autoLearnedThreshold = studySettings.auto_mark_learned_threshold;

  const value: SettingsContextType = {
    // 設定數據
    learningPreferences,
    interfaceSettings,
    aiSettings,
    studySettings,
    
    // 狀態
    isLoading,
    error,
    
    // 操作方法
    updateLearningPreferences,
    updateInterfaceSettings,
    updateAISettings,
    updateStudySettings,
    refreshSettings,
    
    // 便利屬性
    isDarkMode,
    isAnimationEnabled,
    isVoiceAutoPlay,
    shouldShowPronunciation,
    shouldShowEtymology,
    dailyTarget,
    autoLearnedThreshold,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}