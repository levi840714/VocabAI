import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAnimation } from '@/hooks/useAnimation';
import {
  ThemeCard,
  ThemeTitle,
  ThemeText,
  ThemeButton,
  ThemeInput,
  ThemeSelect,
  ThemeCheckbox
} from '@/components/ui/ThemeComponents';
import { 
  Settings,
  Book,
  Monitor,
  Brain,
  Target,
  Save,
  RotateCcw,
  Clock,
  Volume2,
  Palette,
  Globe,
  Zap,
  CheckCircle,
  AlertCircle,
  TestTube
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useBackground } from '@/contexts/BackgroundContext';
import BackgroundThemePreview from '@/components/BackgroundThemePreview';
import { voiceService } from '@/lib/voiceService';
import { useVoice } from '@/hooks/useVoice';

// 設定區塊組件
interface SettingsSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ title, icon, children, delay = 0 }) => {
  const animation = useAnimation();
  
  return (
    <ThemeCard 
      motionProps={{
        ...animation.slideUp,
        transition: animation.withDelay(delay)
      }}
    >
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          {icon}
        </div>
        <ThemeTitle level={2}>{title}</ThemeTitle>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </ThemeCard>
  );
};

// 設定項目組件
interface SettingItemProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({ label, description, children }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex-1">
      <ThemeText variant="body" className="font-medium">{label}</ThemeText>
      {description && (
        <ThemeText variant="caption" className="mt-1">{description}</ThemeText>
      )}
    </div>
    <div className="ml-4">
      {children}
    </div>
  </div>
);

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const animation = useAnimation();
  const {
    learningPreferences,
    interfaceSettings,
    aiSettings,
    studySettings,
    isLoading,
    error,
    updateLearningPreferences,
    updateInterfaceSettings,
    updateAISettings,
    updateStudySettings,
    refreshSettings
  } = useSettings();
  
  const { currentTheme, setTheme, availableThemes } = useBackground();
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toggleSpeak, toggleSpeakWord, toggleSpeakSentence, stop, isPlaying } = useVoice();

  // 更新設定的統一處理函數
  const handleUpdateSetting = async (
    section: 'learning' | 'interface' | 'ai' | 'study',
    key: string,
    value: any
  ) => {
    try {
      setIsSaving(true);
      setSaveStatus('idle');
      
      const updates = { [key]: value };
      
      switch (section) {
        case 'learning':
          await updateLearningPreferences(updates);
          break;
        case 'interface':
          await updateInterfaceSettings(updates);
          break;
        case 'ai':
          await updateAISettings(updates);
          break;
        case 'study':
          await updateStudySettings(updates);
          break;
      }
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('更新設定失敗:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } finally {
      setIsSaving(false);
    }
  };

  // 重置設定
  const handleReset = async () => {
    try {
      await refreshSettings();
      setSaveStatus('idle');
    } catch (error) {
      console.error('重置設定失敗:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 頁面標題 */}
      <motion.div
        {...animation.slideDown}
        className="text-center"
      >
        <ThemeTitle level={1} className="mb-2">
          個人設定
        </ThemeTitle>
        <ThemeText variant="body">
          自訂您的學習體驗和偏好設定
        </ThemeText>
      </motion.div>

      {/* 學習偏好設定 */}
      <SettingsSection 
        title="學習偏好" 
        icon={<Book className="w-5 h-5 text-blue-500" />}
        delay={0.1}
      >
        <SettingItem 
          label="每日複習目標"
          description="設定您每天想要複習的單字數量"
        >
          <input
            type="range"
            min="1"
            max="100"
            value={learningPreferences.daily_review_target}
            onChange={(e) => handleUpdateSetting('learning', 'daily_review_target', parseInt(e.target.value))}
            className="w-32 accent-blue-500 dark:accent-blue-400"
          />
          <span className="ml-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {learningPreferences.daily_review_target}
          </span>
        </SettingItem>

        <SettingItem 
          label="難度偏好"
          description="選擇您偏好的學習難度"
        >
          <select
            value={learningPreferences.difficulty_preference}
            onChange={(e) => handleUpdateSetting('learning', 'difficulty_preference', e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="easy">簡單</option>
            <option value="normal">普通</option>
            <option value="hard">困難</option>
            <option value="mixed">混合</option>
          </select>
        </SettingItem>

        <SettingItem 
          label="複習提醒"
          description="開啟每日複習提醒通知"
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={learningPreferences.review_reminder_enabled}
              onChange={(e) => handleUpdateSetting('learning', 'review_reminder_enabled', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </label>
        </SettingItem>

        {learningPreferences.review_reminder_enabled && (
          <SettingItem 
            label="提醒時間"
            description="設定每日提醒的時間"
          >
            <input
              type="time"
              value={learningPreferences.review_reminder_time}
              onChange={(e) => handleUpdateSetting('learning', 'review_reminder_time', e.target.value)}
              className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </SettingItem>
        )}
      </SettingsSection>

      {/* 介面設定 */}
      <SettingsSection 
        title="介面設定" 
        icon={<Monitor className="w-5 h-5 text-green-500" />}
        delay={0.2}
      >
        <SettingItem 
          label="語音自動播放"
          description="單字載入時自動播放發音"
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={interfaceSettings.voice_auto_play}
              onChange={(e) => handleUpdateSetting('interface', 'voice_auto_play', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </label>
        </SettingItem>

        <SettingItem 
          label="主題模式"
          description="選擇應用程式的主題外觀"
        >
          <select
            value={interfaceSettings.theme_mode}
            onChange={(e) => handleUpdateSetting('interface', 'theme_mode', e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="light">淺色</option>
            <option value="dark">深色</option>
            <option value="auto">自動</option>
          </select>
        </SettingItem>

        {/* 背景主題選擇器 */}
        <div className="col-span-full">
          <div className="mb-4">
            <ThemeText variant="body" className="font-medium mb-1">背景主題</ThemeText>
            <ThemeText variant="caption">選擇適合您的背景風格，立即生效</ThemeText>
          </div>
          <BackgroundThemePreview />
        </div>

        <SettingItem 
          label="動畫效果"
          description="開啟頁面切換和交互動畫"
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={interfaceSettings.animation_enabled}
              onChange={(e) => handleUpdateSetting('interface', 'animation_enabled', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </label>
        </SettingItem>

        {/* 語音設定區塊 */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
          <div className="mb-4">
            <ThemeText variant="body" className="font-medium mb-1 flex items-center">
              <Volume2 className="w-4 h-4 mr-2 text-blue-500" />
              語音播放設定
            </ThemeText>
            <ThemeText variant="caption">調整語音播放效果以獲得最佳體驗</ThemeText>
          </div>

          {/* 語言與語音偏好已移除（僅保留語速與音調） */}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <ThemeText variant="caption" className="mb-1 block">語速（0.5 - 1.5）</ThemeText>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={interfaceSettings.voice_rate ?? 0.95}
                onChange={(e) => handleUpdateSetting('interface', 'voice_rate', parseFloat(e.target.value))}
                className="w-full accent-blue-500 dark:accent-blue-400"
              />
              <div className="text-xs text-slate-500 mt-1">{(interfaceSettings.voice_rate ?? 0.95).toFixed(2)}</div>
            </div>
            <div>
              <ThemeText variant="caption" className="mb-1 block">音調（0.8 - 1.6）</ThemeText>
              <input
                type="range"
                min={0.8}
                max={1.6}
                step={0.05}
                value={interfaceSettings.voice_pitch ?? 1.1}
                onChange={(e) => handleUpdateSetting('interface', 'voice_pitch', parseFloat(e.target.value))}
                className="w-full accent-blue-500 dark:accent-blue-400"
              />
              <div className="text-xs text-slate-500 mt-1">{(interfaceSettings.voice_pitch ?? 1.1).toFixed(2)}</div>
            </div>
          </div>
          
          {/* 語音測試區域 */}
          <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <ThemeText variant="body" className="font-medium">語音測試</ThemeText>
                <ThemeText variant="caption">測試當前環境的語音效果</ThemeText>
              </div>
              <div className="flex gap-2">
                <ThemeButton
                  variant="secondary"
                  size="sm"
                  onClick={() => isPlaying ? stop() : toggleSpeak('Hello')}
                >
                  {isPlaying ? <span className="w-4 h-4 inline-block">■</span> : <Volume2 className="w-4 h-4" />}
                  <span>Hello</span>
                </ThemeButton>
                <ThemeButton
                  variant="secondary"
                  size="sm"
                  onClick={() => isPlaying ? stop() : toggleSpeakWord('Beautiful')}
                >
                  {isPlaying ? <span className="w-4 h-4 inline-block">■</span> : <Volume2 className="w-4 h-4" />}
                  <span>Beautiful</span>
                </ThemeButton>
                <ThemeButton
                  variant="secondary"
                  size="sm"
                  onClick={() => isPlaying ? stop() : toggleSpeakSentence('The weather is wonderful today.')}
                >
                  {isPlaying ? <span className="w-4 h-4 inline-block">■</span> : <Volume2 className="w-4 h-4" />}
                  <span>句子</span>
                </ThemeButton>
              </div>
            </div>
            
            {/* 環境資訊顯示（移除可用語音清單） */}
            <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-600 p-3 rounded border">
              <div className="font-medium mb-2">當前語音環境:</div>
              <div className="space-y-1">
                <div>🔊 語音支援: {voiceService.getEnvironmentInfo().supportsSpeechSynthesis ? '✅ 支援' : '❌ 不支援'}</div>
                <div>📱 環境: {
                  voiceService.getEnvironmentInfo().isTelegramMiniApp ? 'Telegram Mini App' :
                  voiceService.getEnvironmentInfo().isMobile ? '手機瀏覽器' : '桌面瀏覽器'
                }</div>
                <div>🎵 語音引擎: {voiceService.getEnvironmentInfo().availableVoices} 種可用 | 最佳: {voiceService.getEnvironmentInfo().bestVoice}</div>
                <div>⚙️ 參數: 語速 {voiceService.getEnvironmentInfo().currentSettings.rate} | 音調 {voiceService.getEnvironmentInfo().currentSettings.pitch}</div>
              </div>
            </div>
            
            {/* 語音效果說明 */}
            <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
              <div className="font-medium">💡 語音效果優化建議:</div>
              <ul className="space-y-1 text-xs">
                <li>• <strong>行動裝置</strong>: 已提高預設語速與音調，減少「慢且單調」問題；可於上方滑桿微調。</li>
                <li>• <strong>瀏覽器語音</strong>: 受限於裝置語音引擎，品質因機型而異；可設定偏好語音名稱。</li>
                <li>• <strong>首次播放</strong>: 部分瀏覽器需要等待語音列表載入，系統已自動處理。</li>
              </ul>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* AI 設定 */}
      <SettingsSection 
        title="AI 助手設定" 
        icon={<Brain className="w-5 h-5 text-purple-500" />}
        delay={0.3}
      >
        <SettingItem 
          label="預設解釋類型"
          description="選擇 AI 解釋的預設詳細程度"
        >
          <select
            value={aiSettings.default_explanation_type}
            onChange={(e) => handleUpdateSetting('ai', 'default_explanation_type', e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="simple">簡單解釋</option>
            <option value="deep">深度分析</option>
          </select>
        </SettingItem>

        <SettingItem 
          label="解釋詳細程度"
          description="控制 AI 回應的詳細程度"
        >
          <select
            value={aiSettings.explanation_detail_level}
            onChange={(e) => handleUpdateSetting('ai', 'explanation_detail_level', e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="concise">簡潔</option>
            <option value="standard">標準</option>
            <option value="detailed">詳細</option>
          </select>
        </SettingItem>
      </SettingsSection>

      {/* 學習策略設定 */}
      <SettingsSection 
        title="學習策略" 
        icon={<Target className="w-5 h-5 text-orange-500" />}
        delay={0.4}
      >
        <SettingItem 
          label="顯示音標"
          description="在單字詳情中顯示發音音標"
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={studySettings.show_pronunciation}
              onChange={(e) => handleUpdateSetting('study', 'show_pronunciation', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </label>
        </SettingItem>

        <SettingItem 
          label="顯示詞源"
          description="在詳細分析中包含詞源資訊"
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={studySettings.show_etymology}
              onChange={(e) => handleUpdateSetting('study', 'show_etymology', e.target.checked)}
              className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </label>
        </SettingItem>

        <SettingItem 
          label="自動標記已學會閾值"
          description="設定多少次正確後自動標記為已學會"
        >
          <input
            type="range"
            min="3"
            max="10"
            value={studySettings.auto_mark_learned_threshold}
            onChange={(e) => handleUpdateSetting('study', 'auto_mark_learned_threshold', parseInt(e.target.value))}
            className="w-32 accent-blue-500 dark:accent-blue-400"
          />
          <span className="ml-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {studySettings.auto_mark_learned_threshold} 次
          </span>
        </SettingItem>
      </SettingsSection>

      {/* 狀態提示和重置按鈕 */}
      <motion.div
        {...animation.slideUp}
        transition={animation.withDelay(0.5)}
        className="flex flex-wrap justify-center gap-4"
      >
        <ThemeButton
          variant="primary"
          size="lg"
          onClick={() => navigate('/settings-test')}
        >
          <TestTube className="w-4 h-4" />
          <span>測試設定效果</span>
        </ThemeButton>
        
        <ThemeButton
          variant="secondary"
          size="lg"
          onClick={handleReset}
        >
          <RotateCcw className="w-4 h-4" />
          <span>重置為預設</span>
        </ThemeButton>
        
        {/* 狀態指示 */}
        {saveStatus !== 'idle' && (
          <div
            className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
              saveStatus === 'success' 
                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
                : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
            }`}
          >
            {saveStatus === 'success' ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>
              {saveStatus === 'success' ? '設定已保存' : '保存失敗'}
            </span>
          </div>
        )}
      </motion.div>
      
      {/* 說明文字 */}
      <motion.div
        {...animation.fadeIn}
        transition={animation.withDelay(0.6)}
        className="text-center"
      >
        <ThemeText variant="caption">
          ✨ 您的設定變更會自動保存
        </ThemeText>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
