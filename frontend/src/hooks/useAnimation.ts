import { useSettings } from '@/contexts/SettingsContext';

/**
 * 動畫設定 Hook
 * 根據用戶設定決定是否啟用動畫效果
 */
export function useAnimation() {
  const { isAnimationEnabled } = useSettings();

  // 基礎動畫變體
  const fadeIn = isAnimationEnabled
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    : {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 1 }
      };

  const slideUp = isAnimationEnabled
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
      }
    : {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, y: 0 }
      };

  const slideDown = isAnimationEnabled
    ? {
        initial: { opacity: 0, y: -20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 20 }
      }
    : {
        initial: { opacity: 1, y: 0 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, y: 0 }
      };

  const scale = isAnimationEnabled
    ? {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 }
      }
    : {
        initial: { opacity: 1, scale: 1 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 1, scale: 1 }
      };

  const stagger = isAnimationEnabled
    ? {
        animate: {
          transition: {
            staggerChildren: 0.1
          }
        }
      }
    : {
        animate: {
          transition: {
            staggerChildren: 0
          }
        }
      };

  // 過渡設定
  const transition = isAnimationEnabled
    ? { duration: 0.3, ease: 'easeOut' }
    : { duration: 0 };

  const springTransition = isAnimationEnabled
    ? { type: 'spring', stiffness: 300, damping: 30 }
    : { duration: 0 };

  // Hover 和 Tap 動畫
  const hover = isAnimationEnabled
    ? { scale: 1.05, transition: { duration: 0.2 } }
    : {};

  const tap = isAnimationEnabled
    ? { scale: 0.95, transition: { duration: 0.1 } }
    : {};

  // 頁面切換動畫
  const pageTransition = isAnimationEnabled
    ? {
        initial: { opacity: 0, x: 20 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -20 },
        transition: { duration: 0.3, ease: 'easeInOut' }
      }
    : {
        initial: { opacity: 1, x: 0 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 1, x: 0 },
        transition: { duration: 0 }
      };

  // 載入動畫
  const loading = isAnimationEnabled
    ? {
        animate: {
          rotate: 360,
          transition: {
            duration: 1,
            repeat: Infinity,
            ease: 'linear'
          }
        }
      }
    : {
        animate: {}
      };

  // 成功/錯誤動畫
  const bounce = isAnimationEnabled
    ? {
        animate: {
          scale: [1, 1.1, 1],
          transition: {
            duration: 0.3,
            times: [0, 0.5, 1]
          }
        }
      }
    : {
        animate: {}
      };

  return {
    isEnabled: isAnimationEnabled,
    fadeIn,
    slideUp,
    slideDown,
    scale,
    stagger,
    transition,
    springTransition,
    hover,
    tap,
    pageTransition,
    loading,
    bounce,
    
    // 便利方法
    withDelay: (delay: number) => isAnimationEnabled ? { delay } : { delay: 0 },
    withDuration: (duration: number) => isAnimationEnabled ? { duration } : { duration: 0 }
  };
}