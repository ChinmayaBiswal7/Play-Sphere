import { useEffect, useRef, useCallback } from 'react'

export function useEngineAudio() {
  const ctxRef = useRef(null)
  const oscRef = useRef(null)
  const osc2Ref = useRef(null)
  const gainRef = useRef(null)
  const distRef = useRef(null)
  const startedRef = useRef(false)

  const start = useCallback(() => {
    if (startedRef.current) return
    startedRef.current = true
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ctxRef.current = ctx

    const gain = ctx.createGain()
    gain.gain.value = 0.18
    gainRef.current = gain

    const dist = ctx.createWaveShaper()
    const curve = new Float32Array(256)
    for (let i = 0; i < 256; i++) {
      const x = (i * 2) / 256 - 1
      curve[i] = (Math.PI + 200) * x / (Math.PI + 200 * Math.abs(x))
    }
    dist.curve = curve
    dist.oversample = '4x'
    distRef.current = dist

    // Primary V6 oscillator
    const osc = ctx.createOscillator()
    osc.type = 'sawtooth'
    osc.frequency.value = 60
    oscRef.current = osc

    // Harmonic layer
    const osc2 = ctx.createOscillator()
    osc2.type = 'square'
    osc2.frequency.value = 120
    osc2Ref.current = osc2

    const gain2 = ctx.createGain()
    gain2.gain.value = 0.05

    osc.connect(dist)
    dist.connect(gain)
    osc2.connect(gain2)
    gain2.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc2.start()
  }, [])

  const setRPM = useCallback((rpm) => {
    if (!ctxRef.current || !oscRef.current || !osc2Ref.current || !gainRef.current) return
    // Map 800-18000 RPM -> 40-480 Hz (V6 characteristic)
    const baseFreq = 40 + (rpm / 18000) * 440
    const now = ctxRef.current.currentTime
    oscRef.current.frequency.setTargetAtTime(baseFreq, now, 0.05)
    osc2Ref.current.frequency.setTargetAtTime(baseFreq * 2.01, now, 0.05)
    // Volume scales slightly with RPM
    gainRef.current.gain.setTargetAtTime(0.12 + (rpm / 18000) * 0.1, now, 0.05)
  }, [])

  const stop = useCallback(() => {
    if (!ctxRef.current || !gainRef.current) return
    gainRef.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.3)
  }, [])

  useEffect(() => {
    return () => {
      try {
        oscRef.current?.stop()
      } catch (e) {}
      try {
        osc2Ref.current?.stop()
      } catch (e) {}
      try {
        ctxRef.current?.close()
      } catch (e) {}
    }
  }, [])

  return { start, setRPM, stop }
}
