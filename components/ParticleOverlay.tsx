"use client"

import { useEffect, useState, useMemo, memo, useCallback } from "react"
import Particles, {
  initParticlesEngine,
  type IParticlesProps,
} from "@tsparticles/react"
import { loadSlim } from "@tsparticles/slim"

type ParticleOptions = NonNullable<IParticlesProps["options"]>

export type ParticleEffect =
  | "snow"
  | "rain"
  | "embers"
  | "fog"
  | "night"
  | "none"

// fps cap applied to all tsParticles configs to prevent speed runaway
const BASE: Partial<ParticleOptions> = { fpsLimit: 30 }

const PARTICLE_CONFIGS: Record<
  Exclude<ParticleEffect, "none" | "fog" | "night">,
  ParticleOptions
> = {
  snow: {
    ...BASE,
    fullScreen: { enable: false },
    particles: {
      number: { value: 45 },
      color: { value: "#ffffff" },
      opacity: { value: { min: 0.25, max: 0.55 } },
      size: { value: { min: 2, max: 4 } },
      move: {
        enable: true,
        // At fpsLimit:30, speed:0.2 ≈ ~6px/s — floats gently down
        speed: { min: 0.2, max: 0.6 },
        direction: "bottom",
        straight: true,
        outModes: { default: "destroy" },
        drift: { min: -0.3, max: 0.3 },
      },
      wobble: {
        enable: true,
        distance: 3,
        speed: { min: -0.5, max: 0.5 },
      },
    },
  },

  rain: {
    ...BASE,
    fullScreen: { enable: false },
    particles: {
      number: { value: 180 },
      color: { value: "#aad4f5" },
      opacity: { value: 0.35 },
      size: { value: { min: 1, max: 1.5 } },
      move: {
        enable: true,
        speed: { min: 18, max: 26 },
        direction: "bottom-right",
        straight: true,
        outModes: { default: "out" },
        angle: { offset: 0, value: 20 },
      },
      shape: { type: "circle" },
    },
  },

  embers: {
    ...BASE,
    fullScreen: { enable: false },
    particles: {
      number: { value: 40 },
      color: { value: ["#ff6600", "#ff9900", "#ffcc00", "#ff4400"] },
      opacity: {
        value: { min: 0.15, max: 0.7 },
        animation: {
          enable: true,
          speed: 0.3,
          sync: false,
          startValue: "random",
          destroy: "none",
        },
      },
      size: { value: { min: 1, max: 2.5 } },
      move: {
        enable: true,
        // speed:0.3 at fpsLimit:30 ≈ ~9px/s — embers drift lazily upward
        speed: { min: 0.2, max: 0.45 },
        direction: "top",
        straight: false,
        outModes: { default: "out" },
        drift: { min: -1, max: 1 },
      },
    },
  },
}

// --- CSS-based fog: radial gradient blobs animated with keyframes ---
function FogOverlay() {
  return (
    <div className='absolute inset-0 overflow-hidden pointer-events-none'>
      <style>{`
        @keyframes fog-a {
          0%   { transform: translate(0%,   0%)   scale(1);    opacity: 0.055; }
          40%  { transform: translate(7%,   4%)   scale(1.08); opacity: 0.075; }
          100% { transform: translate(0%,   0%)   scale(1);    opacity: 0.055; }
        }
        @keyframes fog-b {
          0%   { transform: translate(0%,   0%)   scale(1);    opacity: 0.04; }
          50%  { transform: translate(-6%,  3%)   scale(0.93); opacity: 0.06; }
          100% { transform: translate(0%,   0%)   scale(1);    opacity: 0.04; }
        }
        @keyframes fog-c {
          0%   { transform: translate(0%,   0%)   scale(1);    opacity: 0.06; }
          35%  { transform: translate(4%,  -5%)   scale(1.05); opacity: 0.04; }
          100% { transform: translate(0%,   0%)   scale(1);    opacity: 0.06; }
        }
        @keyframes fog-d {
          0%   { transform: translate(0%,   0%)   scale(1);    opacity: 0.05; }
          60%  { transform: translate(-5%,  6%)   scale(1.1);  opacity: 0.07; }
          100% { transform: translate(0%,   0%)   scale(1);    opacity: 0.05; }
        }
        @keyframes fog-e {
          0%   { transform: translate(0%,   0%)   scale(1);    opacity: 0.035; }
          45%  { transform: translate(8%,  -3%)   scale(0.95); opacity: 0.055; }
          100% { transform: translate(0%,   0%)   scale(1);    opacity: 0.035; }
        }
      `}</style>

      {/* blob 1 — lower-left */}
      <div
        style={{
          position: "absolute",
          left: "-10%",
          bottom: "5%",
          width: "55%",
          height: "35%",
          background:
            "radial-gradient(ellipse at center, rgba(200,200,200,1) 0%, transparent 70%)",
          filter: "blur(40px)",
          animation: "fog-a 28s ease-in-out infinite",
        }}
      />
      {/* blob 2 — right */}
      <div
        style={{
          position: "absolute",
          right: "-5%",
          top: "30%",
          width: "50%",
          height: "30%",
          background:
            "radial-gradient(ellipse at center, rgba(210,210,220,1) 0%, transparent 70%)",
          filter: "blur(50px)",
          animation: "fog-b 34s ease-in-out infinite",
        }}
      />
      {/* blob 3 — top-center */}
      <div
        style={{
          position: "absolute",
          left: "20%",
          top: "-5%",
          width: "60%",
          height: "28%",
          background:
            "radial-gradient(ellipse at center, rgba(190,190,200,1) 0%, transparent 70%)",
          filter: "blur(45px)",
          animation: "fog-c 22s ease-in-out infinite",
        }}
      />
      {/* blob 4 — center */}
      <div
        style={{
          position: "absolute",
          left: "30%",
          top: "40%",
          width: "45%",
          height: "32%",
          background:
            "radial-gradient(ellipse at center, rgba(200,205,210,1) 0%, transparent 70%)",
          filter: "blur(55px)",
          animation: "fog-d 38s ease-in-out infinite",
        }}
      />
      {/* blob 5 — bottom-right */}
      <div
        style={{
          position: "absolute",
          right: "5%",
          bottom: "-5%",
          width: "42%",
          height: "28%",
          background:
            "radial-gradient(ellipse at center, rgba(195,195,205,1) 0%, transparent 70%)",
          filter: "blur(42px)",
          animation: "fog-e 25s ease-in-out infinite",
        }}
      />
    </div>
  )
}

// --- Night mode: dark overlay + faint slow stars via tsParticles ---
const NIGHT_OPTIONS: ParticleOptions = {
  fpsLimit: 30,
  fullScreen: { enable: false },
  particles: {
    number: { value: 120 },
    color: { value: ["#ffffff", "#fffbe6", "#e8e8ff"] },
    opacity: {
      value: { min: 0.1, max: 0.6 },
      animation: {
        enable: true,
        speed: 0.2,
        sync: false,
        startValue: "random",
        destroy: "none",
      },
    },
    size: { value: { min: 0.5, max: 1.5 } },
    move: {
      enable: true,
      speed: { min: 0.02, max: 0.08 },
      direction: "none",
      random: true,
      straight: false,
      outModes: { default: "out" },
    },
    shape: { type: "circle" },
  },
}

function NightOverlay() {
  const [engineReady, setEngineReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setEngineReady(true))
  }, [])

  const noop = useCallback(async () => {}, [])

  return (
    <div className='absolute inset-0 pointer-events-none'>
      {/* Dark tint — deepens the background into night */}
      <div className='absolute inset-0 bg-stone-950/55' />
      {/* Blue-black vignette at edges */}
      <div
        className='absolute inset-0'
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 30%, rgba(5,8,20,0.65) 100%)",
        }}
      />
      {/* Stars */}
      {engineReady && (
        <Particles
          id='particle-overlay-night'
          particlesLoaded={noop}
          options={NIGHT_OPTIONS}
          className='absolute inset-0 w-full h-full'
        />
      )}
    </div>
  )
}

// --- Main component ---

interface ParticleOverlayProps {
  effect: ParticleEffect
}

function ParticleOverlayInner({ effect }: ParticleOverlayProps) {
  const [engineReady, setEngineReady] = useState(false)

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    }).then(() => setEngineReady(true))
  }, [])

  const options = useMemo<ParticleOptions | null>(() => {
    if (effect === "none" || effect === "fog" || effect === "night") return null
    return PARTICLE_CONFIGS[effect]
  }, [effect])

  const noop = useCallback(async () => {}, [])

  if (effect === "fog") return <FogOverlay />
  if (effect === "night") return <NightOverlay />
  if (!engineReady || !options) return null

  return (
    <Particles
      key={effect}
      id={`particle-overlay-${effect}`}
      particlesLoaded={noop}
      options={options}
      className='absolute inset-0 w-full h-full'
    />
  )
}

export default memo(ParticleOverlayInner)
