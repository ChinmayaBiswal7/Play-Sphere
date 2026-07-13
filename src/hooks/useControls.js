import { useEffect, useRef } from 'react'

export function useControls() {
  const keys = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    ers: false,
    reset: false,
  })

  useEffect(() => {
    window.__f1Controls = keys.current
    const down = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.current.forward  = true; break
        case 'KeyS': case 'ArrowDown':  keys.current.backward = true; break
        case 'KeyA': case 'ArrowLeft':  keys.current.left     = true; break
        case 'KeyD': case 'ArrowRight': keys.current.right    = true; break
        case 'Space':                   keys.current.brake    = true; e.preventDefault(); break
        case 'ShiftLeft': case 'ShiftRight': keys.current.ers = true; break
        case 'KeyR':                    keys.current.reset    = true; break
      }
    }
    const up = (e) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp':    keys.current.forward  = false; break
        case 'KeyS': case 'ArrowDown':  keys.current.backward = false; break
        case 'KeyA': case 'ArrowLeft':  keys.current.left     = false; break
        case 'KeyD': case 'ArrowRight': keys.current.right    = false; break
        case 'Space':                   keys.current.brake    = false; break
        case 'ShiftLeft': case 'ShiftRight': keys.current.ers = false; break
        case 'KeyR':                    keys.current.reset    = false; break
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      if (window.__f1Controls === keys.current) delete window.__f1Controls
    }
  }, [])

  return keys
}
