import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { useSettings } from '@/contexts/SettingsContext';
import { useAnimation } from '@/hooks/useAnimation';
import { 
  ThemeCard,
  ThemeTitle,
  ThemeText,
  StatsCard
} from '@/components/ui/ThemeComponents';
import { 
  BookOpen, 
  Plus, 
  Brain, 
  TrendingUp, 
  Zap, 
  Settings,
  Clock,
  Target,
  Award
} from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  gradient: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ 
  icon, 
  title, 
  description, 
  onClick, 
  gradient, 
  delay = 0 
}) => {
  const animation = useAnimation();
  
  return (
    <motion.div
      initial={animation.isEnabled ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: animation.isEnabled ? delay : 0 }}
      whileHover={animation.isEnabled ? { y: -5, transition: { duration: 0.2 } } : {}}
      whileTap={animation.tap}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 shadow-lg cursor-pointer group`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-white/20 dark:bg-black/20 rounded-lg backdrop-blur-sm">
            {icon}
          </div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
        </div>
        <p className="text-sm text-white/80 flex-grow">{description}</p>
      </div>
      
      {/* 裝飾性光暈效果 */}
      <div className="absolute -top-8 -right-8 w-16 h-16 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="absolute -bottom-6 -left-6 w-12 h-12 bg-white/5 rounded-full" />
    </motion.div>
  );
};

// StatsCard 已移至 ThemeComponents

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { stats, isLoading } = useVocabulary();
  const { dailyTarget, learningPreferences } = useSettings();
  const animation = useAnimation();

  // 核心功能 (仿照幣安主要功能區)
  const coreFeatures = [
    {
      icon: <BookOpen className="w-6 h-6 text-white" />,
      title: '單字管理',
      description: '瀏覽和管理詞彙庫',
      onClick: () => navigate('/vocabulary'),
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      icon: <Plus className="w-6 h-6 text-white" />,
      title: '快速新增',
      description: '一鍵新增新單字',
      onClick: () => navigate('/add-word'),
      gradient: 'from-green-500 to-green-600',
    },
    {
      icon: <Brain className="w-6 h-6 text-white" />,
      title: '智能複習',
      description: '科學記憶訓練',
      onClick: () => navigate('/study'),
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      icon: <Zap className="w-6 h-6 text-white" />,
      title: 'AI 解析',
      description: '深度單字分析',
      onClick: () => navigate('/ai-analysis'),
      gradient: 'from-pink-500 to-pink-600',
    },
  ];

  // 進階功能 (仿照幣安次要功能區)
  const advancedFeatures = [
    {
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      title: '學習報告',
      description: '進度分析統計',
      onClick: () => navigate('/progress'),
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      icon: <Settings className="w-6 h-6 text-white" />,
      title: '個人設定',
      description: '自訂學習偏好',
      onClick: () => navigate('/settings'),
      gradient: 'from-indigo-500 to-indigo-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 頂部：重要學習數據 (仿照幣安資產區域) */}
      <motion.div
        {...animation.slideDown}
        className="bg-gradient-to-br from-blue-600 to-purple-700 dark:from-blue-700 dark:to-purple-800 rounded-2xl p-6 text-white shadow-xl"
      >
        {/* 主要數據 */}
        <div className="text-center mb-4">
          <div className="text-sm opacity-80 mb-1">學習總進度</div>
          <div className="text-4xl font-bold mb-2">
            {!isLoading ? (stats?.total_words || 0) : '---'}
          </div>
          <div className="text-sm opacity-80">已學習單字</div>
        </div>

        {/* 今日數據 */}
        <div className="flex items-center justify-center space-x-1 mb-4">
          <span className="text-sm opacity-80">今日複習：</span>
          <span className={`font-semibold ${(stats?.reviewed_today || 0) >= dailyTarget ? 'text-green-300' : 'text-yellow-300'}`}>
            {!isLoading ? `+${stats?.reviewed_today || 0}` : '---'}
          </span>
          <span className="text-sm opacity-80">
            ({((stats?.reviewed_today || 0) / dailyTarget * 100).toFixed(1)}%)
          </span>
        </div>

        {/* 進度條 */}
        <div className="w-full bg-white/20 rounded-full h-2 mb-4">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-green-400 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min((stats?.reviewed_today || 0) / dailyTarget * 100, 100)}%`
            }}
          />
        </div>

        {/* 快速統計 */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold">{!isLoading ? (stats?.due_today || 0) : '---'}</div>
            <div className="text-xs opacity-80">待複習</div>
          </div>
          <div>
            <div className="text-lg font-semibold">{dailyTarget}</div>
            <div className="text-xs opacity-80">每日目標</div>
          </div>
          <div>
            <div className="text-lg font-semibold">
              {!isLoading ? Math.max(0, dailyTarget - (stats?.reviewed_today || 0)) : '---'}
            </div>
            <div className="text-xs opacity-80">剩餘任務</div>
          </div>
        </div>

        {/* 達成狀態提示 */}
        {(stats?.reviewed_today || 0) >= dailyTarget && (
          <div className="text-center mt-4 py-2 bg-green-500/20 rounded-lg">
            <span className="text-green-200 font-medium">🎉 今日目標已達成！</span>
          </div>
        )}
      </motion.div>

      {/* 中間：核心功能區 (仿照幣安主功能) */}
      <motion.div
        {...animation.slideUp}
        transition={animation.withDelay(0.1)}
      >
        <div className="grid grid-cols-2 gap-4 mb-4">
          {coreFeatures.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={0.2 + index * 0.05}
            />
          ))}
        </div>
      </motion.div>

      {/* 進階功能區 */}
      <motion.div
        {...animation.slideUp}
        transition={animation.withDelay(0.3)}
      >
        <div className="grid grid-cols-2 gap-4">
          {advancedFeatures.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              {...feature}
              delay={0.4 + index * 0.05}
            />
          ))}
        </div>
      </motion.div>

      {/* 底部：個人化推薦 (仿照幣安推廣區) */}
      <motion.div
        {...animation.slideUp}
        transition={animation.withDelay(0.5)}
        className="bg-gradient-to-r from-amber-400 to-orange-500 dark:from-amber-500 dark:to-orange-600 rounded-2xl p-4 text-white cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => navigate('/ai-analysis')}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold mb-1">探索個人化學習體驗！</div>
            <div className="text-sm opacity-90">使用 AI 深度解析提升學習效率</div>
          </div>
          <div className="text-2xl">→</div>
        </div>
      </motion.div>

    </div>
  );
};

export default HomePage;