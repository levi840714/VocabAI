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
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

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