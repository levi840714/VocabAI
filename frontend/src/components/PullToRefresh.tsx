import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  maxPull?: number;
  resistance?: number;
  enabled?: boolean;
  className?: string;
}

const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  threshold = 80,
  maxPull = 120,
  resistance = 0.3,
  enabled = true,
  className = ""
}) => {
  const {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    refreshProgress,
    canRefresh,
    pullStyle
  } = usePullToRefresh({
    onRefresh,
    threshold,
    maxPull,
    resistance,
    enabled
  });

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden ${className}`}
    >
      {/* 下拉刷新指示器 */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10"
        style={{
          height: maxPull,
          transform: `translateY(-${maxPull - Math.min(pullDistance, maxPull)}px)`,
          transition: isPulling ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        <div className="flex flex-col items-center justify-center text-slate-600 dark:text-slate-400">
          {isRefreshing ? (
            <>
              <RefreshCw className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-sm mt-2 font-medium">刷新中...</span>
            </>
          ) : canRefresh ? (
            <>
              <motion.div
                animate={{ rotate: 180 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-6 w-6 text-green-600 dark:text-green-400" />
              </motion.div>
              <span className="text-sm mt-2 font-medium text-green-600 dark:text-green-400">
                鬆開刷新
              </span>
            </>
          ) : isPulling ? (
            <>
              <motion.div
                style={{ 
                  rotate: refreshProgress * 180,
                  scale: 0.8 + refreshProgress * 0.2 
                }}
              >
                <ChevronDown className="h-6 w-6" />
              </motion.div>
              <span className="text-sm mt-2 font-medium">下拉刷新</span>
              {/* 進度條 */}
              <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-150"
                  style={{ width: `${refreshProgress * 100}%` }}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* 主內容 */}
      <div style={pullStyle}>
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;