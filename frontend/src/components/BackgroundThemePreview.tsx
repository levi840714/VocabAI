import React from 'react';
import { motion } from 'framer-motion';
import { useBackground } from '@/contexts/BackgroundContext';
import { backgroundThemes } from './background-themes';

interface BackgroundThemePreviewProps {
  className?: string;
}

const BackgroundThemePreview: React.FC<BackgroundThemePreviewProps> = ({ className = '' }) => {
  const { currentTheme, availableThemes, setTheme } = useBackground();

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
        背景主題切換
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {availableThemes.map((theme) => {
          const isActive = currentTheme === theme.key;
          const ThemeComponent = backgroundThemes[theme.key];
          
          return (
            <motion.button
              key={theme.key}
              onClick={() => setTheme(theme.key)}
              className={`
                relative overflow-hidden rounded-xl h-24 border-2 transition-all duration-200
                ${isActive 
                  ? 'border-blue-500 dark:border-blue-400 ring-2 ring-blue-200 dark:ring-blue-800' 
                  : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                }
              `}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* 縮小版的背景預覽 */}
              <div className="absolute inset-0 scale-50 origin-center opacity-70">
                <ThemeComponent />
              </div>
              
              {/* 覆蓋層和標題 */}
              <div className="absolute inset-0 bg-black/20 dark:bg-black/40 flex items-end">
                <div className="w-full p-2 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="text-xs font-medium text-white">
                    {theme.name}
                  </div>
                </div>
              </div>
              
              {/* 選中狀態指示 */}
              {isActive && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center"
                >
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
      
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {availableThemes.find(theme => theme.key === currentTheme)?.description}
      </div>
    </div>
  );
};

export default BackgroundThemePreview;