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
  type: 'tween',
  ease: 'anticipate',
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
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    setIsDragging(false);
    
    // 只在非首頁且向右滑動距離超過閾值時觸發返回
    if (!isHomePage && offset.x > 100 && velocity.x > 0) {
      // 觸發返回導航
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className={`min-h-screen ${isMobile ? 'pb-20' : ''}`}>
      <BackgroundScene />
      <div className="relative z-10" ref={constraintsRef}>
        <Header />
        <main className={`container mx-auto p-4 max-w-5xl ${isMobile ? 'pb-6' : ''}`}>
          <motion.div
            key={location.pathname}
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            drag={!isHomePage && isMobile ? "x" : false}
            dragConstraints={{ left: 0, right: 200 }}
            dragElastic={0.2}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            dragMomentum={false}
            whileDrag={{ scale: 0.98 }}
            className={`touch-pan-y ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{
              cursor: !isHomePage && isMobile ? 'grab' : 'default'
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