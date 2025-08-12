import { useState, useEffect } from 'react';

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  isTouchDevice: boolean;
}

export const useDeviceDetection = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 0,
    screenHeight: 0,
    isTouchDevice: false,
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // 檢測觸控設備
      const isTouchDevice = 'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0 || 
                           navigator.maxTouchPoints > 0;
      
      // 根據螢幕寬度判斷設備類型
      const isMobile = screenWidth < 768; // Tailwind md breakpoint
      const isTablet = screenWidth >= 768 && screenWidth < 1024; // Tailwind lg breakpoint
      const isDesktop = screenWidth >= 1024;
      
      // 額外檢查：如果是觸控設備且螢幕較小，優先視為手機
      const finalIsMobile = isMobile || (isTouchDevice && screenWidth < 900);
      const finalIsTablet = !finalIsMobile && isTablet;
      const finalIsDesktop = !finalIsMobile && !finalIsTablet;

      setDeviceInfo({
        isMobile: finalIsMobile,
        isTablet: finalIsTablet,
        isDesktop: finalIsDesktop,
        screenWidth,
        screenHeight,
        isTouchDevice,
      });
    };

    // 初始化
    updateDeviceInfo();

    // 監聽視窗大小變化
    window.addEventListener('resize', updateDeviceInfo);
    
    // 監聽螢幕方向變化（主要針對手機）
    window.addEventListener('orientationchange', () => {
      // 延遲一點執行，確保螢幕尺寸已更新
      setTimeout(updateDeviceInfo, 100);
    });

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
};