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

  const features = [
    {
      icon: <BookOpen className="w-6 h-6 text-white" />,
      title: '單字管理',
      description: '瀏覽和管理您的個人單字庫，快速搜尋和查看詳細資訊',
      onClick: () => navigate('/vocabulary'),
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      icon: <Plus className="w-6 h-6 text-white" />,
      title: '快速新增',
      description: '一鍵新增單字到您的學習清單，支援 AI 智能解釋',
      onClick: () => navigate('/add-word'),
      gradient: 'from-green-500 to-green-600',
    },
    {
      icon: <Brain className="w-6 h-6 text-white" />,
      title: '智能複習',
      description: '基於間隔重複算法的科學複習，提升記憶效果',
      onClick: () => navigate('/study'),
      gradient: 'from-purple-500 to-purple-600',
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      title: '學習報告',
      description: '詳細的學習進度分析和統計圖表',
      onClick: () => navigate('/progress'),
      gradient: 'from-orange-500 to-orange-600',
    },
    {
      icon: <Zap className="w-6 h-6 text-white" />,
      title: 'AI 深度解析',
      description: '使用人工智慧進行單字深度分析和學習建議',
      onClick: () => navigate('/ai-analysis'),
      gradient: 'from-pink-500 to-pink-600',
    },
    {
      icon: <Settings className="w-6 h-6 text-white" />,
      title: '個人設定',
      description: '自訂學習偏好、介面主題和 AI 助手設定',
      onClick: () => navigate('/settings'),
      gradient: 'from-indigo-500 to-indigo-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 歡迎標題 */}
      <motion.div
        {...animation.slideDown}
        className="text-center"
      >
        <ThemeTitle level={1} className="mb-2">
          歡迎回來！
        </ThemeTitle>
        <ThemeText variant="body">
          準備好開始今天的學習之旅嗎？
        </ThemeText>
      </motion.div>

      {/* 學習統計卡片 */}
      {!isLoading && (
        <motion.div
          {...animation.slideUp}
          transition={animation.withDelay(0.1)}
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          <StatsCard
            icon={<BookOpen className="w-5 h-5 text-blue-500 dark:text-blue-400" />}
            value={stats?.total_words || 0}
            label="總單字數"
            color="blue"
          />
          <StatsCard
            icon={<Target className="w-5 h-5 text-green-500 dark:text-green-400" />}
            value={stats?.reviewed_today || 0}
            label="今日已複習"
            color="green"
          />
          <StatsCard
            icon={<Clock className="w-5 h-5 text-orange-500 dark:text-orange-400" />}
            value={stats?.due_today || 0}
            label="今日待複習"
            color="orange"
          />
        </motion.div>
      )}

      {/* 功能卡片網格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <FeatureCard
            key={feature.title}
            {...feature}
            delay={0.2 + index * 0.1}
          />
        ))}
      </div>

      {/* 快速行動區域 */}
      <ThemeCard
        motionProps={{
          ...animation.slideUp,
          transition: animation.withDelay(0.8)
        }}
      >
        <div className="flex items-center space-x-3 mb-4">
          <Award className="w-6 h-6 text-amber-500 dark:text-amber-400" />
          <ThemeTitle level={2}>今日目標</ThemeTitle>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4">
            <ThemeText variant="small" className="mb-1">總單字數</ThemeText>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats?.total_words || 0}
            </div>
            <ThemeText variant="caption">您的單字庫</ThemeText>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4">
            <ThemeText variant="small" className="mb-1">每日進度</ThemeText>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats?.reviewed_today || 0}/{dailyTarget}
            </div>
            <ThemeText variant="caption">已完成/每日目標</ThemeText>
            
            {/* 進度條 */}
            <div className="mt-2 w-full bg-purple-100 dark:bg-purple-800 rounded-full h-2">
              <div 
                className="bg-purple-500 dark:bg-purple-400 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((stats?.reviewed_today || 0) / dailyTarget * 100, 100)}%`
                }}
              />
            </div>
            
            {/* 達成狀態 */}
            {(stats?.reviewed_today || 0) >= dailyTarget && (
              <ThemeText variant="caption" className="mt-1 font-medium text-purple-600 dark:text-purple-400">
                🎉 今日目標已達成！
              </ThemeText>
            )}
          </div>
        </div>
      </ThemeCard>
    </div>
  );
};

export default HomePage;