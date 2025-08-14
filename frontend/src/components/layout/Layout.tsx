import React, { useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, PanInfo } from 'framer-motion';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import { useDeviceDetection } from '@/hooks/useDeviceDetection';
import BackgroundScene from '@/components/background-scene';

interface LayoutProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    x: 100,
  },
  in: {
    opacity: 1,
    x: 0,
  },
  out: {
    opacity: 0,
    x: -100,
  },
};

const pageTransition = {
  type: 'tween' as const,
  ease: 'anticipate' as const,
  duration: 0.3,
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const constraintsRef = useRef(null);
  const { isMobile } = useDeviceDetection();
  const isHomePage = location.pathname === '/';
  const [isDragging, setIsDragging] = useState(false);

  // 監聽路由變化，自動滾動到頂部
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  // 處理滑動開始
  const handleDragStart = () => {
    setIsDragging(true);
  };

  // 處理滑動手勢
  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    setIsDragging(false);
    
    // 提高靈敏度：降低距離閾值並增加速度權重
    const swipeDistance = offset.x;
    const swipeVelocity = velocity.x;
    
    // 如果向右滑動距離超過60px，或者速度夠快（超過500px/s）
    const shouldNavigateBack = !isHomePage && swipeDistance > 60 && swipeVelocity > 0 && 
                              (swipeDistance > 80 || swipeVelocity > 500);
    
    if (shouldNavigateBack) {
      // 觸發返回導航
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
    // 如果沒有觸發返回，頁面會自動透過 dragConstraints 和 dragElastic 彈回原位置
  };

  return (
    <div className={`safe-area-content ${isMobile ? 'pb-20' : ''}`}>
      <BackgroundScene />
      <div className="relative z-10" ref={constraintsRef}>
        <Header />
        <main className={`container mx-auto p-4 max-w-5xl ${isMobile ? 'pb-6' : ''}`}>
          <motion.div
            key={location.pathname}
            initial="initial"
            animate={isDragging ? "in" : { ...pageVariants.in, x: 0 }}
            exit="out"
            variants={pageVariants}
            transition={isDragging ? pageTransition : { ...pageTransition, type: "spring", stiffness: 400, damping: 30 }}
            drag={!isHomePage && isMobile ? "x" : false}
            dragConstraints={{ left: 0, right: 150 }}
            dragElastic={0.2}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            dragMomentum={false}
            dragTransition={{ power: 0.4, timeConstant: 150 }}
            whileDrag={{ scale: 0.99, rotateY: 2 }}
            className={`touch-pan-y select-none ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{
              cursor: !isHomePage && isMobile ? 'grab' : 'default',
              touchAction: !isHomePage && isMobile ? 'pan-y' : 'auto'
            }}
          >
            {children}
          </motion.div>
        </main>
        <BottomNavigation />
      </div>
    </div>
  );
};

export default Layout;