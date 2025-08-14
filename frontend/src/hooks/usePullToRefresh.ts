import { useEffect, useRef, useState } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // 觸發刷新的距離閾值 (px)
  maxPull?: number;   // 最大下拉距離 (px)
  resistance?: number; // 阻力係數 (0-1)
  enabled?: boolean;   // 是否啟用
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  maxPull = 120,
  resistance = 0.3,
  enabled = true
}: UsePullToRefreshOptions) => {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 檢查是否可以觸發下拉刷新
  const canPullToRefresh = () => {
    if (!enabled || isRefreshing) return false;
    
    // 檢查是否在頁面頂部
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    return scrollTop === 0;
  };

  // 處理觸摸開始
  const handleTouchStart = (e: TouchEvent) => {
    if (!canPullToRefresh()) return;
    
    startY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  // 處理觸摸移動
  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging.current || !canPullToRefresh()) return;
    
    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;
    
    if (deltaY > 0) {
      // 下拉時阻止默認滾動
      e.preventDefault();
      
      // 計算下拉距離（加入阻力）
      const distance = Math.min(deltaY * resistance, maxPull);
      setPullDistance(distance);
      setIsPulling(distance > 10);
    }
  };

  // 處理觸摸結束
  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    
    isDragging.current = false;
    
    // 檢查是否達到刷新閾值
    if (pullDistance >= threshold && !isRefreshing) {
      triggerRefresh();
    } else {
      // 重置狀態
      resetPull();
    }
  };

  // 觸發刷新
  const triggerRefresh = async () => {
    setIsRefreshing(true);
    setIsPulling(false);
    
    try {
      await onRefresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 500); // 顯示刷新完成動畫
    }
  };

  // 重置下拉狀態
  const resetPull = () => {
    setIsPulling(false);
    setPullDistance(0);
  };

  // 手動觸發刷新
  const manualRefresh = () => {
    if (!isRefreshing) {
      triggerRefresh();
    }
  };

  // 綁定事件監聽器
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    // 被動監聽以提高性能
    const options = { passive: false };
    
    container.addEventListener('touchstart', handleTouchStart, options);
    container.addEventListener('touchmove', handleTouchMove, options);
    container.addEventListener('touchend', handleTouchEnd, options);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, threshold, maxPull, resistance, isRefreshing, pullDistance]);

  // 計算刷新進度
  const refreshProgress = Math.min(pullDistance / threshold, 1);
  const canRefresh = pullDistance >= threshold;

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    refreshProgress,
    canRefresh,
    manualRefresh,
    // 內聯樣式用於動畫
    pullStyle: {
      transform: `translateY(${Math.min(pullDistance, maxPull)}px)`,
      transition: isDragging.current ? 'none' : 'transform 0.3s ease-out'
    }
  };
};