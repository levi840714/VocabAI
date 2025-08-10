import Image from "next/image"

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

      {/* Light rays (subtle and blurred) */}
      <div className="absolute inset-x-0 top-0 h-[48vh] opacity-25">
        <div className="relative h-full">
          <Image src="/background/underwater-rays.png" alt="" fill className="object-cover blur-sm" priority />
        </div>
      </div>

      {/* Bottom vignette to anchor content */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-blue-950/40 to-transparent" />

      {/* Seaweed decorations with fade mask to blend into UI */}
      <div
        className="absolute bottom-0 left-0 w-48 md:w-64 opacity-70 saturate-90"
        style={{
          WebkitMaskImage: "linear-gradient(to top, black 55%, transparent 100%)",
          maskImage: "linear-gradient(to top, black 55%, transparent 100%)",
        }}
      >
        <Image
          src="/background/seaweed-left.png"
          alt=""
          width={512}
          height={512}
          className="w-full h-auto blur-[0.5px]"
          priority
        />
      </div>
      <div
        className="absolute bottom-0 right-0 w-48 md:w-64 opacity-70 saturate-90"
        style={{
          WebkitMaskImage: "linear-gradient(to top, black 55%, transparent 100%)",
          maskImage: "linear-gradient(to top, black 55%, transparent 100%)",
        }}
      >
        <Image
          src="/background/seaweed-right.png"
          alt=""
          width={512}
          height={512}
          className="w-full h-auto blur-[0.5px]"
          priority
        />
      </div>

      {/* Gentle floating particles */}
      <div className="absolute inset-0">
        <div className="absolute left-[10%] top-[30%] h-2.5 w-2.5 rounded-full bg-white/40" />
        <div className="absolute left-[16%] top-[35%] h-2 w-2 rounded-full bg-white/35" />
        <div className="absolute left-[22%] top-[28%] h-1.5 w-1.5 rounded-full bg-white/35" />
        <div className="absolute right-[12%] top-[38%] h-2.5 w-2.5 rounded-full bg-white/35" />
        <div className="absolute right-[20%] top-[26%] h-1.5 w-1.5 rounded-full bg-white/30" />
      </div>
    </div>
  )
}
