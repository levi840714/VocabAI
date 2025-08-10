export default function BackgroundScene() {
  return (
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
  )
}