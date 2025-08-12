import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { useAnimation } from '@/hooks/useAnimation';

/**
 * 統一主題管理組件系統
 * 確保所有組件在不同主題下都有一致的外觀
 */

// 基礎容器組件
interface ThemeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'solid';
  padding?: 'sm' | 'md' | 'lg';
  motionProps?: MotionProps;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'md',
  motionProps,
  ...props 
}) => {
  const animation = useAnimation();
  
  const variantClasses = {
    default: 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm shadow-sm ring-1 ring-slate-200/30 dark:ring-slate-700/30',
    glass: 'bg-white/50 dark:bg-slate-800/50 backdrop-blur-md shadow-lg ring-1 ring-slate-200/20 dark:ring-slate-700/20',
    solid: 'bg-white dark:bg-slate-800 shadow-md ring-1 ring-slate-200 dark:ring-slate-700'
  };
  
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };
  
  const baseClasses = `rounded-2xl transition-colors ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`;
  
  if (motionProps) {
    return (
      <motion.div
        className={baseClasses}
        {...motionProps}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
  
  return (
    <div className={baseClasses} {...props}>
      {children}
    </div>
  );
};

// 統一標題組件
interface ThemeTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'muted';
}

export const ThemeTitle: React.FC<ThemeTitleProps> = ({ 
  level = 1, 
  children, 
  className = '', 
  variant = 'primary',
  ...props 
}) => {
  const variantClasses = {
    primary: 'text-slate-900 dark:text-white',
    secondary: 'text-slate-700 dark:text-slate-200',
    muted: 'text-slate-600 dark:text-slate-400'
  };
  
  const sizeClasses = {
    1: 'text-3xl md:text-4xl font-bold',
    2: 'text-2xl md:text-3xl font-bold',
    3: 'text-xl md:text-2xl font-semibold',
    4: 'text-lg md:text-xl font-semibold',
    5: 'text-base md:text-lg font-medium',
    6: 'text-sm md:text-base font-medium'
  };
  
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  
  return (
    <Tag 
      className={`${sizeClasses[level]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
};

// 統一文字組件
interface ThemeTextProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
  variant?: 'body' | 'small' | 'caption' | 'muted';
  size?: 'xs' | 'sm' | 'base' | 'lg';
}

export const ThemeText: React.FC<ThemeTextProps> = ({ 
  children, 
  className = '', 
  variant = 'body',
  size = 'base',
  ...props 
}) => {
  const variantClasses = {
    body: 'text-slate-700 dark:text-slate-200',
    small: 'text-slate-600 dark:text-slate-300',
    caption: 'text-slate-500 dark:text-slate-400',
    muted: 'text-slate-400 dark:text-slate-500'
  };
  
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg'
  };
  
  return (
    <p 
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </p>
  );
};

// 統一按鈕組件
interface ThemeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const ThemeButton: React.FC<ThemeButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  ...props 
}) => {
  const animation = useAnimation();
  
  const variantClasses = {
    primary: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm',
    secondary: 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-white',
    ghost: 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200',
    outline: 'border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };
  
  const baseClasses = `inline-flex items-center justify-center space-x-2 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;
  
  return (
    <motion.button
      className={baseClasses}
      disabled={disabled || loading}
      whileHover={animation.hover}
      whileTap={animation.tap}
      {...props}
    >
      {loading && (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
};

// 統一輸入框組件
interface ThemeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const ThemeInput: React.FC<ThemeInputProps> = ({ 
  label, 
  error, 
  helpText, 
  className = '', 
  id,
  ...props 
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors ${error ? 'border-red-500 dark:border-red-400' : ''} ${className}`}
        {...props}
      />
      {error && (
        <ThemeText variant="caption" size="sm" className="text-red-500 dark:text-red-400">
          {error}
        </ThemeText>
      )}
      {helpText && !error && (
        <ThemeText variant="caption" size="sm">
          {helpText}
        </ThemeText>
      )}
    </div>
  );
};

// 統一選擇器組件
interface ThemeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

export const ThemeSelect: React.FC<ThemeSelectProps> = ({ 
  label, 
  error, 
  options, 
  className = '', 
  id,
  ...props 
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="space-y-2">
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700 dark:text-slate-200">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${error ? 'border-red-500 dark:border-red-400' : ''} ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <ThemeText variant="caption" size="sm" className="text-red-500 dark:text-red-400">
          {error}
        </ThemeText>
      )}
    </div>
  );
};

// 統一複選框組件
interface ThemeCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const ThemeCheckbox: React.FC<ThemeCheckboxProps> = ({ 
  label, 
  description, 
  className = '', 
  id,
  ...props 
}) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="flex items-start space-x-3">
      <input
        type="checkbox"
        id={checkboxId}
        className={`mt-1 rounded border-slate-300 dark:border-slate-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-slate-700 transition-colors ${className}`}
        {...props}
      />
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label htmlFor={checkboxId} className="text-sm font-medium text-slate-700 dark:text-slate-200 cursor-pointer">
              {label}
            </label>
          )}
          {description && (
            <ThemeText variant="caption" size="sm" className="mt-1">
              {description}
            </ThemeText>
          )}
        </div>
      )}
    </div>
  );
};

// 統計卡片組件
interface StatsCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'pink';
}

export const StatsCard: React.FC<StatsCardProps> = ({ 
  icon, 
  value, 
  label, 
  color = 'blue' 
}) => {
  const animation = useAnimation();
  
  const colorClasses = {
    blue: {
      card: 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm ring-1 ring-blue-200/30 dark:ring-blue-700/30',
      icon: 'p-2 bg-blue-100 dark:bg-blue-900 rounded-lg',
      value: 'text-xl font-bold text-blue-600 dark:text-blue-400'
    },
    green: {
      card: 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm ring-1 ring-green-200/30 dark:ring-green-700/30',
      icon: 'p-2 bg-green-100 dark:bg-green-900 rounded-lg',
      value: 'text-xl font-bold text-green-600 dark:text-green-400'
    },
    orange: {
      card: 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm ring-1 ring-orange-200/30 dark:ring-orange-700/30',
      icon: 'p-2 bg-orange-100 dark:bg-orange-900 rounded-lg',
      value: 'text-xl font-bold text-orange-600 dark:text-orange-400'
    },
    purple: {
      card: 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm ring-1 ring-purple-200/30 dark:ring-purple-700/30',
      icon: 'p-2 bg-purple-100 dark:bg-purple-900 rounded-lg',
      value: 'text-xl font-bold text-purple-600 dark:text-purple-400'
    },
    pink: {
      card: 'bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm ring-1 ring-pink-200/30 dark:ring-pink-700/30',
      icon: 'p-2 bg-pink-100 dark:bg-pink-900 rounded-lg',
      value: 'text-xl font-bold text-pink-600 dark:text-pink-400'
    }
  };
  
  const classes = colorClasses[color];
  
  return (
    <motion.div
      className={`${classes.card} rounded-xl p-4 flex items-center space-x-3 shadow-sm transition-colors`}
      {...animation.fadeIn}
      whileHover={animation.hover}
    >
      <div className={classes.icon}>
        {icon}
      </div>
      <div>
        <div className={classes.value}>{value}</div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </motion.div>
  );
};