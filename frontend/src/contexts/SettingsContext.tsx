import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTelegramContext } from '@/contexts/TelegramContext';
import { 
  memWhizAPI, 
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
  voice_provider: 'webspeech',
  voice_language: 'en-US',
  voice_rate: 0.95, // 手機上略提速
  voice_pitch: 1.1, // 提升音調以減少單調感
  preferred_voice_name: undefined,
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

  // 從本地儲存讀取設定
  const loadLocalSettings = () => {
    try {
      const storedSettings = localStorage.getItem('memwhiz_user_settings');
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings);
        setLearningPreferences(parsed.learning_preferences || defaultLearningPreferences);
        setInterfaceSettings(parsed.interface_settings || defaultInterfaceSettings);
        setAISettings(parsed.ai_settings || defaultAISettings);
        setStudySettings(parsed.study_settings || defaultStudySettings);
        return true;
      }
    } catch (err) {
      console.error('載入本地設定失敗:', err);
    }
    return false;
  };

  // 保存設定到本地儲存
  const saveLocalSettings = (settings: {
    learning_preferences: LearningPreferences;
    interface_settings: InterfaceSettings;
    ai_settings: AISettings;
    study_settings: StudySettings;
  }) => {
    try {
      localStorage.setItem('memwhiz_user_settings', JSON.stringify(settings));
    } catch (err) {
      console.error('保存本地設定失敗:', err);
    }
  };

  // 載入設定
  const refreshSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 先載入本地設定作為臨時方案
      const hasLocalSettings = loadLocalSettings();
      
      // 嘗試從 API 載入設定
      const userSettings = await memWhizAPI.getUserSettings();
      
      setLearningPreferences(userSettings.learning_preferences);
      setInterfaceSettings(userSettings.interface_settings);
      setAISettings(userSettings.ai_settings);
      setStudySettings(userSettings.study_settings);
      
      // 保存到本地儲存
      saveLocalSettings({
        learning_preferences: userSettings.learning_preferences,
        interface_settings: userSettings.interface_settings,
        ai_settings: userSettings.ai_settings,
        study_settings: userSettings.study_settings
      });
      
    } catch (err) {
      console.error('載入設定失敗:', err);
      setError(err instanceof Error ? err.message : '載入設定失敗');
      
      // API 失敗時，如果沒有本地設定，使用預設值
      const hasLocalSettings = loadLocalSettings();
      if (!hasLocalSettings) {
        console.log('使用預設設定');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 更新學習偏好
  const updateLearningPreferences = async (updates: Partial<LearningPreferences>) => {
    try {
      const newPreferences = { ...learningPreferences, ...updates };
      
      await memWhizAPI.updateSettings({
        learning_preferences: newPreferences
      });
      
      setLearningPreferences(newPreferences);
      
      // 同步更新本地儲存
      saveLocalSettings({
        learning_preferences: newPreferences,
        interface_settings: interfaceSettings,
        ai_settings: aiSettings,
        study_settings: studySettings
      });
    } catch (err) {
      console.error('更新學習偏好失敗:', err);
      throw err;
    }
  };

  // 更新介面設定
  const updateInterfaceSettings = async (updates: Partial<InterfaceSettings>) => {
    try {
      const newSettings = { ...interfaceSettings, ...updates };
      
      // 先立即應用變更到本地狀態和 DOM
      setInterfaceSettings(newSettings);
      if (updates.theme_mode) {
        applyTheme(updates.theme_mode);
      }
      
      // 同步更新本地儲存（即使 API 失敗也要保存）
      saveLocalSettings({
        learning_preferences: learningPreferences,
        interface_settings: newSettings,
        ai_settings: aiSettings,
        study_settings: studySettings
      });
      
      // 然後嘗試同步到後端
      await memWhizAPI.updateSettings({
        interface_settings: newSettings
      });
      
    } catch (err) {
      console.error('更新介面設定失敗:', err);
      // 即使 API 失敗，本地變更已經應用，不拋出錯誤
      console.log('本地設定已更新，但後端同步失敗');
    }
  };

  // 更新 AI 設定
  const updateAISettings = async (updates: Partial<AISettings>) => {
    try {
      const newSettings = { ...aiSettings, ...updates };
      
      await memWhizAPI.updateSettings({
        ai_settings: newSettings
      });
      
      setAISettings(newSettings);
      
      // 同步更新本地儲存
      saveLocalSettings({
        learning_preferences: learningPreferences,
        interface_settings: interfaceSettings,
        ai_settings: newSettings,
        study_settings: studySettings
      });
    } catch (err) {
      console.error('更新 AI 設定失敗:', err);
      throw err;
    }
  };

  // 更新學習策略
  const updateStudySettings = async (updates: Partial<StudySettings>) => {
    try {
      const newSettings = { ...studySettings, ...updates };
      
      await memWhizAPI.updateSettings({
        study_settings: newSettings
      });
      
      setStudySettings(newSettings);
      
      // 同步更新本地儲存
      saveLocalSettings({
        learning_preferences: learningPreferences,
        interface_settings: interfaceSettings,
        ai_settings: aiSettings,
        study_settings: newSettings
      });
    } catch (err) {
      console.error('更新學習策略失敗:', err);
      throw err;
    }
  };

  // 應用主題
  const applyTheme = (themeMode: string) => {
    const root = document.documentElement;
    
    console.log('🎨 [Theme] 正在應用主題:', themeMode);
    
    if (themeMode === 'dark') {
      root.classList.add('dark');
      console.log('🌙 [Theme] 已設定為深色模式');
    } else if (themeMode === 'light') {
      root.classList.remove('dark');
      console.log('☀️ [Theme] 已設定為淺色模式');
    } else if (themeMode === 'auto') {
      // 根據系統偏好設定
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        console.log('🌙 [Theme] 自動模式：使用深色模式（系統偏好）');
      } else {
        root.classList.remove('dark');
        console.log('☀️ [Theme] 自動模式：使用淺色模式（系統偏好）');
      }
    }
    
    // 驗證設定是否生效
    const hasLight = root.classList.contains('dark');
    console.log('📋 [Theme] DOM 狀態檢查:', {
      themeMode,
      hasDarkClass: hasLight,
      allClasses: root.className
    });
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

  // 初始載入（等待 Telegram 認證就緒，避免未帶 Authorization 造成 401）
  const telegram = useTelegramContext();

  useEffect(() => {
    // 尚未就緒先不打 API
    if (!telegram.isReady) {
      return;
    }
    // 在 Telegram WebApp 內，需等取得使用者（代表 initData 有效）
    if (telegram.isTelegramWebApp && !telegram.user) {
      return;
    }
    // 在 API 載入前先嘗試應用本地設定的主題
    const localSettings = localStorage.getItem('memwhiz_user_settings');
    if (localSettings) {
      try {
        const parsed = JSON.parse(localSettings);
        if (parsed.interface_settings?.theme_mode) {
          applyTheme(parsed.interface_settings.theme_mode);
        }
      } catch (err) {
        console.error('解析本地主題設定失敗:', err);
      }
    }
    
    refreshSettings();
  }, [telegram.isReady, telegram.isTelegramWebApp, telegram.user]);

  // 應用主題變更（包括載入過程中）
  useEffect(() => {
    applyTheme(interfaceSettings.theme_mode);
  }, [interfaceSettings.theme_mode]);

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
    // 其餘介面語音參數可由組件直接從 interfaceSettings 讀取
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
