import { useEffect, useState } from 'react';

// 動態計算貼齊視窗底部所需的 bottom 偏移量
// - 考慮 iOS 安全區 (safe-area-inset-bottom)
// - 考慮行動瀏覽器工具列收合造成的 visualViewport 高度變化
// - 考慮虛擬鍵盤彈出覆蓋（若可偵測）
export function useFixedBottomOffset(baseGap = 16) {
  const [bottom, setBottom] = useState<number>(baseGap);

  useEffect(() => {
    const getSafeAreaBottom = () => {
      const root = document.documentElement;
      const val = getComputedStyle(root).getPropertyValue('--safe-area-bottom')?.trim();
      if (!val) return 0;
      // 可能為 '0px' 或類似，嘗試解析數值
      const px = Number.parseFloat(val);
      return Number.isFinite(px) ? px : 0;
    };

    const update = () => {
      const sab = getSafeAreaBottom();
      const vv = (window as any).visualViewport as VisualViewport | undefined;
      // 鍵盤或工具列導致的高度差
      const viewportDelta = vv ? (window.innerHeight - vv.height) : 0;
      // 預留 baseGap 與安全區及可見視窗差值
      const next = Math.max(baseGap, sab + viewportDelta + baseGap * 0.0);
      setBottom(next);
    };

    update();

    let raf = 0;
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, { passive: true });
    // 支援 visualViewport 事件（iOS Safari / Chrome Android）
    const vv = (window as any).visualViewport as VisualViewport | undefined;
    vv?.addEventListener('resize', onChange);
    vv?.addEventListener('scroll', onChange);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange);
      vv?.removeEventListener('resize', onChange);
      vv?.removeEventListener('scroll', onChange);
    };
  }, [baseGap]);

  return bottom;
}

