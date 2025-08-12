import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useVocabulary } from '@/hooks/use-vocabulary';
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
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -5, transition: { duration: 0.2 } }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 shadow-lg cursor-pointer group`}
  >
    <div className="flex flex-col h-full">
      <div className="flex items-center space-x-3 mb-3">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
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

interface StatsCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ icon, value, label, color }) => {
  const cardClasses = {
    blue: 'bg-white/70 backdrop-blur-sm rounded-xl p-4 flex items-center space-x-3 shadow-sm ring-1 ring-blue-200/30',
    green: 'bg-white/70 backdrop-blur-sm rounded-xl p-4 flex items-center space-x-3 shadow-sm ring-1 ring-green-200/30',
    orange: 'bg-white/70 backdrop-blur-sm rounded-xl p-4 flex items-center space-x-3 shadow-sm ring-1 ring-orange-200/30',
  };
  
  const iconClasses = {
    blue: 'p-2 bg-blue-100 rounded-lg',
    green: 'p-2 bg-green-100 rounded-lg',
    orange: 'p-2 bg-orange-100 rounded-lg',
  };
  
  const textClasses = {
    blue: 'text-xl font-bold text-blue-600',
    green: 'text-xl font-bold text-green-600',
    orange: 'text-xl font-bold text-orange-600',
  };

  return (
    <div className={cardClasses[color as keyof typeof cardClasses] || cardClasses.blue}>
      <div className={iconClasses[color as keyof typeof iconClasses] || iconClasses.blue}>
        {icon}
      </div>
      <div>
        <div className={textClasses[color as keyof typeof textClasses] || textClasses.blue}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { stats, isLoading } = useVocabulary();

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
      description: '自訂學習偏好和應用程式設定（即將推出）',
      onClick: () => {},
      gradient: 'from-gray-500 to-gray-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 歡迎標題 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
          歡迎回來！
        </h1>
        <p className="text-slate-600">
          準備好開始今天的學習之旅嗎？
        </p>
      </motion.div>

      {/* 學習統計卡片 */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          <StatsCard
            icon={<BookOpen className="w-5 h-5 text-blue-500" />}
            value={stats?.total_words || 0}
            label="總單字數"
            color="blue"
          />
          <StatsCard
            icon={<Target className="w-5 h-5 text-green-500" />}
            value={stats?.reviewed_today || 0}
            label="今日已複習"
            color="green"
          />
          <StatsCard
            icon={<Clock className="w-5 h-5 text-orange-500" />}
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm ring-1 ring-slate-200/30"
      >
        <div className="flex items-center space-x-3 mb-4">
          <Award className="w-6 h-6 text-amber-500" />
          <h2 className="text-xl font-semibold text-slate-900">今日目標</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
            <div className="text-sm text-slate-600 mb-1">總單字數</div>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.total_words || 0}
            </div>
            <div className="text-sm text-slate-500">您的單字庫</div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
            <div className="text-sm text-slate-600 mb-1">複習任務</div>
            <div className="text-2xl font-bold text-purple-600">
              {stats?.reviewed_today || 0}/{stats?.due_today || 0}
            </div>
            <div className="text-sm text-slate-500">已完成/總待復習</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HomePage;