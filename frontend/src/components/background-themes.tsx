import React from 'react';

// 原始海洋主題
export const OceanTheme = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    {/* Base ocean gradient */}
    <div className="absolute inset-0 bg-gradient-to-b from-sky-300 via-blue-600 to-indigo-800" />

    {/* Global blue tint to unify tones */}
    <div className="absolute inset-0 bg-blue-900/15" />

    {/* Soft radial highlights for depth */}
    <div className="absolute -top-28 -left-20 h-80 w-80 rounded-full bg-white/20 blur-[64px]" />
    <div className="absolute top-10 right-10 h-56 w-56 rounded-full bg-cyan-200/25 blur-[56px]" />
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-white/10 blur-[72px]" />

    {/* Light rays simulation with CSS */}
    <div className="absolute inset-x-0 top-0 h-[48vh] opacity-25">
      <div className="relative h-full">
        <div className="absolute inset-0 bg-gradient-to-b from-white/30 via-transparent to-transparent blur-sm" />
        <div className="absolute top-0 left-1/4 w-2 h-full bg-gradient-to-b from-white/20 to-transparent rotate-12 blur-sm" />
        <div className="absolute top-0 right-1/3 w-1 h-full bg-gradient-to-b from-white/15 to-transparent -rotate-12 blur-sm" />
      </div>
    </div>

    {/* Bottom vignette to anchor content */}
    <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-blue-950/40 to-transparent" />

    {/* Seaweed simulation with CSS shapes */}
    <div
      className="absolute bottom-0 left-0 w-48 md:w-64 opacity-70 saturate-90"
      style={{
        WebkitMaskImage: "linear-gradient(to top, black 55%, transparent 100%)",
        maskImage: "linear-gradient(to top, black 55%, transparent 100%)",
      }}
    >
      <div className="w-full h-96 bg-gradient-to-t from-green-800 via-green-600 to-green-400 opacity-60 blur-[0.5px]" />
      <div className="absolute bottom-0 left-4 w-8 h-80 bg-green-700 rounded-t-full opacity-70" />
      <div className="absolute bottom-0 right-6 w-6 h-64 bg-green-600 rounded-t-full opacity-60" />
    </div>
    <div
      className="absolute bottom-0 right-0 w-48 md:w-64 opacity-70 saturate-90"
      style={{
        WebkitMaskImage: "linear-gradient(to top, black 55%, transparent 100%)",
        maskImage: "linear-gradient(to top, black 55%, transparent 100%)",
      }}
    >
      <div className="w-full h-96 bg-gradient-to-t from-green-800 via-green-600 to-green-400 opacity-60 blur-[0.5px]" />
      <div className="absolute bottom-0 left-6 w-6 h-72 bg-green-700 rounded-t-full opacity-70" />
      <div className="absolute bottom-0 right-4 w-8 h-88 bg-green-600 rounded-t-full opacity-60" />
    </div>

    {/* Gentle floating particles */}
    <div className="absolute inset-0">
      <div className="absolute left-[10%] top-[30%] h-2.5 w-2.5 rounded-full bg-white/40 animate-pulse" />
      <div className="absolute left-[16%] top-[35%] h-2 w-2 rounded-full bg-white/35 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute left-[22%] top-[28%] h-1.5 w-1.5 rounded-full bg-white/35 animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute right-[12%] top-[38%] h-2.5 w-2.5 rounded-full bg-white/35 animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute right-[20%] top-[26%] h-1.5 w-1.5 rounded-full bg-white/30 animate-pulse" style={{ animationDelay: '1.5s' }} />
    </div>
  </div>
);

// 現代漸變主題 - 適合新版首頁
export const ModernGradientTheme = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    {/* 主漸變背景 */}
    <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-blue-600 to-teal-500 dark:from-purple-900 dark:via-blue-900 dark:to-teal-800" />
    
    {/* 動態圓形光暈 */}
    <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-r from-pink-500/30 to-yellow-500/30 blur-[80px] animate-pulse" />
    <div className="absolute top-1/4 -left-32 h-64 w-64 rounded-full bg-gradient-to-r from-cyan-500/25 to-blue-500/25 blur-[60px]" />
    <div className="absolute bottom-1/3 right-1/4 h-96 w-96 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-[90px]" />
    
    {/* 幾何圖形裝飾 */}
    <div className="absolute top-20 left-20 w-32 h-32 rounded-2xl bg-white/10 rotate-12 blur-sm" />
    <div className="absolute bottom-32 right-32 w-24 h-24 rounded-full bg-gradient-to-r from-yellow-400/20 to-orange-400/20 blur-sm" />
    
    {/* 浮動粒子 */}
    <div className="absolute inset-0">
      <div className="absolute left-[15%] top-[25%] h-3 w-3 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: '0s' }} />
      <div className="absolute left-[25%] top-[40%] h-2 w-2 rounded-full bg-cyan-300/60 animate-bounce" style={{ animationDelay: '1s' }} />
      <div className="absolute right-[20%] top-[30%] h-2.5 w-2.5 rounded-full bg-pink-300/50 animate-bounce" style={{ animationDelay: '2s' }} />
      <div className="absolute right-[35%] top-[45%] h-1.5 w-1.5 rounded-full bg-yellow-300/60 animate-bounce" style={{ animationDelay: '0.5s' }} />
    </div>
  </div>
);

// 學習專注主題
export const StudyFocusTheme = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    {/* 溫暖的漸變背景 */}
    <div className="absolute inset-0 bg-gradient-to-b from-amber-100 via-orange-200 to-rose-300 dark:from-gray-800 dark:via-slate-800 dark:to-gray-900" />
    
    {/* 書本和學習元素暗示 */}
    <div className="absolute top-0 left-0 w-full h-full opacity-20">
      {/* 書頁效果 */}
      <div className="absolute top-10 left-10 w-40 h-56 bg-white/40 rounded-lg shadow-lg rotate-6 blur-[1px]" />
      <div className="absolute top-16 left-16 w-40 h-56 bg-white/30 rounded-lg shadow-lg rotate-12 blur-[1px]" />
      
      {/* 右側書本 */}
      <div className="absolute bottom-20 right-20 w-32 h-44 bg-blue-200/40 rounded-lg shadow-lg -rotate-12 blur-[1px]" />
      <div className="absolute bottom-24 right-24 w-32 h-44 bg-green-200/30 rounded-lg shadow-lg -rotate-6 blur-[1px]" />
    </div>
    
    {/* 柔和的光線效果 */}
    <div className="absolute top-0 right-1/4 w-96 h-96 bg-gradient-radial from-yellow-200/30 to-transparent rounded-full blur-[40px]" />
    <div className="absolute bottom-1/3 left-1/3 w-64 h-64 bg-gradient-radial from-orange-200/25 to-transparent rounded-full blur-[50px]" />
    
    {/* 文字符號裝飾 */}
    <div className="absolute inset-0 opacity-10">
      <div className="absolute top-[20%] left-[10%] text-6xl font-serif text-blue-600 rotate-12">A</div>
      <div className="absolute top-[60%] right-[15%] text-4xl font-serif text-green-600 -rotate-12">語</div>
      <div className="absolute bottom-[30%] left-[20%] text-5xl font-serif text-purple-600 rotate-6">📚</div>
    </div>
  </div>
);

// 夜空星辰主題
export const StarryNightTheme = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    {/* 夜空背景 */}
    <div className="absolute inset-0 bg-gradient-to-b from-indigo-900 via-purple-900 to-blue-900" />
    
    {/* 星空效果 */}
    <div className="absolute inset-0">
      {/* 大星星 */}
      <div className="absolute top-[15%] left-[20%] w-2 h-2 bg-white rounded-full animate-pulse" />
      <div className="absolute top-[25%] right-[25%] w-1.5 h-1.5 bg-yellow-300 rounded-full animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-[45%] left-[15%] w-2.5 h-2.5 bg-blue-200 rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      <div className="absolute top-[60%] right-[20%] w-1.5 h-1.5 bg-pink-200 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
      <div className="absolute bottom-[30%] left-[30%] w-2 h-2 bg-cyan-200 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }} />
      
      {/* 小星星 */}
      <div className="absolute top-[10%] left-[40%] w-1 h-1 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '3s' }} />
      <div className="absolute top-[30%] left-[60%] w-1 h-1 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '2.5s' }} />
      <div className="absolute top-[50%] right-[40%] w-1 h-1 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '1.8s' }} />
      <div className="absolute bottom-[40%] right-[30%] w-1 h-1 bg-white/70 rounded-full animate-pulse" style={{ animationDelay: '2.2s' }} />
    </div>
    
    {/* 月亮 */}
    <div className="absolute top-10 right-16 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 opacity-80 blur-[1px]" />
    <div className="absolute top-12 right-18 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-300 opacity-60" />
    
    {/* 雲朵 */}
    <div className="absolute top-1/3 left-1/4 w-32 h-16 bg-white/10 rounded-full blur-[8px]" />
    <div className="absolute bottom-1/2 right-1/3 w-24 h-12 bg-white/8 rounded-full blur-[6px]" />
    
    {/* 極光效果 */}
    <div className="absolute top-0 left-0 w-full h-full opacity-30">
      <div className="absolute top-0 left-1/4 w-1 h-1/2 bg-gradient-to-b from-green-400 to-transparent blur-[2px] animate-pulse" style={{ animationDelay: '3s' }} />
      <div className="absolute top-0 right-1/3 w-1 h-1/3 bg-gradient-to-b from-purple-400 to-transparent blur-[2px] animate-pulse" style={{ animationDelay: '4s' }} />
    </div>
  </div>
);

// 簡潔商務主題
export const MinimalBusinessTheme = () => (
  <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
    {/* 簡潔背景 */}
    <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-950" />
    
    {/* 幾何圖形 */}
    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-blue-100/50 to-transparent dark:from-blue-900/30 rounded-full blur-3xl" />
    <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-r from-indigo-100/50 to-transparent dark:from-indigo-900/30 rounded-full blur-3xl" />
    
    {/* 網格紋理 */}
    <div 
      className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px'
      }}
    />
    
    {/* 裝飾線條 */}
    <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-200/50 to-transparent dark:via-blue-800/50" />
    <div className="absolute bottom-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-200/50 to-transparent dark:via-indigo-800/50" />
    
    {/* 浮動圓點 */}
    <div className="absolute top-[30%] left-[20%] w-2 h-2 rounded-full bg-blue-300/60 dark:bg-blue-600/60" />
    <div className="absolute top-[70%] right-[25%] w-1.5 h-1.5 rounded-full bg-indigo-300/60 dark:bg-indigo-600/60" />
    <div className="absolute bottom-[40%] left-[60%] w-1 h-1 rounded-full bg-blue-400/60 dark:bg-blue-500/60" />
  </div>
);

export const backgroundThemes = {
  ocean: OceanTheme,
  modern: ModernGradientTheme,
  study: StudyFocusTheme,
  starry: StarryNightTheme,
  minimal: MinimalBusinessTheme,
};

export type BackgroundThemeType = keyof typeof backgroundThemes;