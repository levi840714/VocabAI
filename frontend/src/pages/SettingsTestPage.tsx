import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';
import { useAnimation } from '@/hooks/useAnimation';
import { 
  Volume2, 
  Settings, 
  Moon, 
  Sun, 
  Smartphone,
  BookOpen,
  Brain,
  Eye,
  Target,
  CheckCircle
} from 'lucide-react';

const SettingsTestPage: React.FC = () => {
  const {
    learningPreferences,
    interfaceSettings,
    studySettings,
    isDarkMode,
    isAnimationEnabled,
    isVoiceAutoPlay,
    shouldShowPronunciation,
    shouldShowEtymology,
    dailyTarget,
    autoLearnedThreshold,
    updateInterfaceSettings,
    updateLearningPreferences,
    updateStudySettings
  } = useSettings();

  const animation = useAnimation();
  const [testWord] = useState('example');

  const handleVoiceTest = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(testWord);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    } else {
      alert('語音功能不可用');
    }
  };

  const toggleTheme = () => {
    const newMode = interfaceSettings.theme_mode === 'light' ? 'dark' : 'light';
    updateInterfaceSettings({ theme_mode: newMode });
  };

  const toggleAnimation = () => {
    updateInterfaceSettings({ animation_enabled: !interfaceSettings.animation_enabled });
  };

  const toggleVoiceAutoPlay = () => {
    updateInterfaceSettings({ voice_auto_play: !interfaceSettings.voice_auto_play });
  };

  const togglePronunciation = () => {
    updateStudySettings({ show_pronunciation: !studySettings.show_pronunciation });
  };

  const toggleEtymology = () => {
    updateStudySettings({ show_etymology: !studySettings.show_etymology });
  };

  const increaseDailyTarget = () => {
    const newTarget = Math.min(learningPreferences.daily_review_target + 5, 100);
    updateLearningPreferences({ daily_review_target: newTarget });
  };

  const decreaseDailyTarget = () => {
    const newTarget = Math.max(learningPreferences.daily_review_target - 5, 1);
    updateLearningPreferences({ daily_review_target: newTarget });
  };

  return (
    <motion.div 
      className="space-y-8 p-6 max-w-4xl mx-auto"
      {...animation.fadeIn}
    >
      {/* 標題 */}
      <motion.div 
        className="text-center"
        {...animation.slideDown}
      >
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          設定功能測試
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          測試所有個人化設定的實際效果
        </p>
      </motion.div>

      {/* 當前設定狀態 */}
      <motion.div 
        className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/30 dark:ring-slate-700/30"
        {...animation.slideUp}
        transition={animation.withDelay(0.1)}
      >
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          當前設定狀態
        </h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">學習偏好</div>
            <div className="bg-blue-50 dark:bg-blue-900 p-3 rounded-lg space-y-1 text-slate-900 dark:text-white">
              <div>每日目標: {dailyTarget} 個單字</div>
              <div>難度偏好: {learningPreferences.difficulty_preference}</div>
              <div>提醒狀態: {learningPreferences.review_reminder_enabled ? '已開啟' : '已關閉'}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">介面設定</div>
            <div className="bg-green-50 dark:bg-green-900 p-3 rounded-lg space-y-1 text-slate-900 dark:text-white">
              <div>主題模式: {interfaceSettings.theme_mode}</div>
              <div>動畫效果: {isAnimationEnabled ? '已開啟' : '已關閉'}</div>
              <div>語音自動播放: {isVoiceAutoPlay ? '已開啟' : '已關閉'}</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">學習策略</div>
            <div className="bg-purple-50 dark:bg-purple-900 p-3 rounded-lg space-y-1 text-slate-900 dark:text-white">
              <div>顯示音標: {shouldShowPronunciation ? '是' : '否'}</div>
              <div>顯示詞源: {shouldShowEtymology ? '是' : '否'}</div>
              <div>自動標記閾值: {autoLearnedThreshold} 次</div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="text-sm text-slate-600 dark:text-slate-400">系統狀態</div>
            <div className="bg-amber-50 dark:bg-amber-900 p-3 rounded-lg space-y-1 text-slate-900 dark:text-white">
              <div>深色模式: {isDarkMode ? '是' : '否'}</div>
              <div>動畫啟用: {isAnimationEnabled ? '是' : '否'}</div>
              <div>語音支援: {'speechSynthesis' in window ? '是' : '否'}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 互動測試區域 */}
      <motion.div 
        className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/30 dark:ring-slate-700/30"
        {...animation.slideUp}
        transition={animation.withDelay(0.2)}
      >
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          功能測試
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 語音測試 */}
          <motion.button
            onClick={handleVoiceTest}
            className="flex items-center space-x-2 p-4 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
          >
            <Volume2 className="w-5 h-5" />
            <span>測試語音播放</span>
          </motion.button>

          {/* 主題切換 */}
          <motion.button
            onClick={toggleTheme}
            className="flex items-center space-x-2 p-4 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>切換主題</span>
          </motion.button>

          {/* 動畫切換 */}
          <motion.button
            onClick={toggleAnimation}
            className="flex items-center space-x-2 p-4 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
          >
            <Smartphone className="w-5 h-5" />
            <span>{isAnimationEnabled ? '關閉' : '開啟'}動畫</span>
          </motion.button>

          {/* 語音自動播放 */}
          <motion.button
            onClick={toggleVoiceAutoPlay}
            className="flex items-center space-x-2 p-4 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
          >
            <Volume2 className="w-5 h-5" />
            <span>{isVoiceAutoPlay ? '關閉' : '開啟'}自動播放</span>
          </motion.button>

          {/* 音標顯示 */}
          <motion.button
            onClick={togglePronunciation}
            className="flex items-center space-x-2 p-4 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
          >
            <BookOpen className="w-5 h-5" />
            <span>{shouldShowPronunciation ? '隱藏' : '顯示'}音標</span>
          </motion.button>

          {/* 詞源顯示 */}
          <motion.button
            onClick={toggleEtymology}
            className="flex items-center space-x-2 p-4 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
          >
            <Eye className="w-5 h-5" />
            <span>{shouldShowEtymology ? '隱藏' : '顯示'}詞源</span>
          </motion.button>
        </div>
      </motion.div>

      {/* 每日目標調整 */}
      <motion.div 
        className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/30 dark:ring-slate-700/30"
        {...animation.slideUp}
        transition={animation.withDelay(0.3)}
      >
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
          <Target className="w-5 h-5 mr-2" />
          每日目標調整
        </h2>
        
        <div className="flex items-center space-x-4">
          <motion.button
            onClick={decreaseDailyTarget}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
          >
            -5
          </motion.button>
          
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{dailyTarget}</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">每日目標單字數</div>
          </div>
          
          <motion.button
            onClick={increaseDailyTarget}
            className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
          >
            +5
          </motion.button>
        </div>
      </motion.div>

      {/* 示範區域 */}
      <motion.div 
        className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/30 dark:ring-slate-700/30"
        {...animation.slideUp}
        transition={animation.withDelay(0.4)}
      >
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          設定效果示範
        </h2>
        
        <div className="space-y-4">
          {/* 音標示範 */}
          <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="font-medium text-slate-900 dark:text-white">{testWord}</div>
            {shouldShowPronunciation && (
              <div className="text-slate-600 dark:text-slate-300 font-mono mt-1">/ɪɡˈzæmpəl/</div>
            )}
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              音標顯示: {shouldShowPronunciation ? '已開啟' : '已關閉'}
            </div>
          </div>

          {/* 詞源示範 */}
          <div className="p-4 bg-amber-50 dark:bg-amber-900 rounded-lg">
            <div className="font-medium text-slate-900 dark:text-white">詞源資訊</div>
            {shouldShowEtymology ? (
              <div className="text-slate-700 dark:text-slate-300 mt-2 text-sm">
                來自拉丁文 exemplum，意為「樣本、模範」
              </div>
            ) : (
              <div className="text-slate-500 dark:text-slate-400 text-sm mt-2 italic">
                詞源顯示已關閉
              </div>
            )}
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              詞源顯示: {shouldShowEtymology ? '已開啟' : '已關閉'}
            </div>
          </div>

          {/* 動畫示範 */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
            <div className="font-medium text-slate-900 dark:text-white mb-2">動畫效果示範</div>
            <motion.div
              className="w-16 h-16 bg-blue-500 rounded-full mx-auto"
              animate={isAnimationEnabled ? {
                scale: [1, 1.2, 1],
                transition: {
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              } : {}}
            />
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-2 text-center">
              動畫效果: {isAnimationEnabled ? '已開啟' : '已關閉'}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsTestPage;