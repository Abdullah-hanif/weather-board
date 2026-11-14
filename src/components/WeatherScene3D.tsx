import { useEffect, useRef } from 'react'

interface Props {
  condition?: string
  reduced?: boolean
  className?: string
}

const MODES = [
  'clear',
  'partly',
  'cloud',
  'rain',
  'drizzle',
  'thunder',
  'snow',
  'fog',
  'wind',
] as const

type SceneMode = (typeof MODES)[number]

function asMode(condition?: string): SceneMode {
  return MODES.includes(condition as SceneMode) ? (condition as SceneMode) : 'cloud'
}

/** Professional “weather orb” scene — glass shell + condition-driven interior */
export function WeatherScene3D({ condition, reduced, className = '' }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const modeRef = useRef<SceneMode>(asMode(condition))

  useEffect(() => {
    modeRef.current = asMode(condition)
  }, [condition])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let disposed = false
    let raf = 0
    let cleanup: (() => void) | undefined

    void (async () => {
      const THREE = await import('three')
      if (disposed || !hostRef.current) return

      const prefersReduced =
        reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60)
      camera.position.set(0, 0.15, 5.4)

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.15
      host.appendChild(renderer.domElement)

      const root = new THREE.Group()
      scene.add(root)

      // Soft studio backdrop
      const hemi = new THREE.HemisphereLight(0xb8e0ff, 0x1a403c, 0.85)
      scene.add(hemi)
      const key = new THREE.DirectionalLight(0xfff0d6, 1.35)
      key.position.set(3.5, 4.5, 2.5)
      scene.add(key)
      const rim = new THREE.DirectionalLight(0x66d4c8, 0.55)
      rim.position.set(-3, 1, -2)
      scene.add(rim)

      // Floor glow disc
      const floor = new THREE.Mesh(
        new THREE.CircleGeometry(2.4, 64),
        new THREE.MeshBasicMaterial({
          color: 0x1a6b6b,
          transparent: true,
          opacity: 0.18,
        }),
      )
      floor.rotation.x = -Math.PI / 2
      floor.position.y = -1.35
      root.add(floor)

      // Glass orb shell
      const glass = new THREE.Mesh(
        new THREE.SphereGeometry(1.55, 64, 64),
        new THREE.MeshPhysicalMaterial({
          color: 0xffffff,
          metalness: 0,
          roughness: 0.12,
          transmission: 0.92,
          thickness: 0.65,
          ior: 1.4,
          transparent: true,
          opacity: 1,
          clearcoat: 1,
          clearcoatRoughness: 0.08,
          envMapIntensity: 1,
        }),
      )
      root.add(glass)

      // Inner glow shell
      const innerGlow = new THREE.Mesh(
        new THREE.SphereGeometry(1.42, 48, 48),
        new THREE.MeshBasicMaterial({
          color: 0x7ec8c2,
          transparent: true,
          opacity: 0.08,
          side: THREE.BackSide,
        }),
      )
      root.add(innerGlow)

      // Sun
      const sunLight = new THREE.PointLight(0xffb14a, 2.2, 8, 2)
      root.add(sunLight)
      const sunMat = new THREE.MeshStandardMaterial({
        color: 0xffc15a,
        emissive: 0xff8a1a,
        emissiveIntensity: 1.1,
        roughness: 0.3,
      })
      const sun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 48, 48), sunMat)
      const sunGroup = new THREE.Group()
      sunGroup.add(sun)
      ;[0.58, 0.78, 1.02].forEach((s, i) => {
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(1, 32, 32),
          new THREE.MeshBasicMaterial({
            color: 0xffc56d,
            transparent: true,
            opacity: 0.2 - i * 0.05,
            depthWrite: false,
          }),
        )
        halo.scale.setScalar(s)
        sunGroup.add(halo)
      })
      root.add(sunGroup)

      // Cloud puffs inside orb
      const cloudGroup = new THREE.Group()
      root.add(cloudGroup)
      const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xf4f8fb,
        roughness: 0.95,
        metalness: 0,
        transparent: true,
        opacity: 0.9,
      })
      const puffGeo = new THREE.SphereGeometry(0.28, 24, 24)
      const puffLayout = [
        [-0.55, 0.15, 0.35, 1.1],
        [-0.15, 0.28, 0.15, 1.35],
        [0.35, 0.18, 0.3, 1.05],
        [0.65, -0.05, 0.05, 0.85],
        [-0.75, -0.2, 0.1, 0.9],
        [0.1, -0.25, 0.4, 0.95],
      ] as const
      for (const [x, y, z, s] of puffLayout) {
        const puff = new THREE.Mesh(puffGeo, cloudMat)
        puff.position.set(x, y, z)
        puff.scale.setScalar(s)
        cloudGroup.add(puff)
      }

      // Particles
      const COUNT = prefersReduced ? 160 : 500
      const particleGeo = new THREE.BufferGeometry()
      const positions = new Float32Array(COUNT * 3)
      const seeds = new Float32Array(COUNT)
      for (let i = 0; i < COUNT; i++) {
        const r = 0.3 + Math.random() * 1.05
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
        positions[i * 3 + 1] = r * Math.cos(phi)
        positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
        seeds[i] = Math.random()
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const particleMat = new THREE.PointsMaterial({
        color: 0x9fd0ff,
        size: 0.035,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
      const particles = new THREE.Points(particleGeo, particleMat)
      root.add(particles)

      // Lightning
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.008, 1.4, 6),
        new THREE.MeshBasicMaterial({ color: 0xfff3b0, transparent: true, opacity: 0 }),
      )
      root.add(bolt)
      const flash = new THREE.Mesh(
        new THREE.SphereGeometry(1.5, 24, 24),
        new THREE.MeshBasicMaterial({
          color: 0xdceeff,
          transparent: true,
          opacity: 0,
          side: THREE.BackSide,
        }),
      )
      root.add(flash)

      const target = {
        sun: new THREE.Color(0xffc15a),
        emissive: new THREE.Color(0xff8a1a),
        cloud: new THREE.Color(0xf4f8fb),
        particle: new THREE.Color(0x9fd0ff),
        glow: new THREE.Color(0x7ec8c2),
        floor: new THREE.Color(0x1a6b6b),
      }

      const setTargets = (mode: SceneMode) => {
        if (mode === 'clear') {
          target.sun.set(0xffc15a)
          target.emissive.set(0xff8a1a)
          target.cloud.set(0xffffff)
          target.particle.set(0xffe0a8)
          target.glow.set(0x7ec8ff)
          target.floor.set(0xc4783a)
        } else if (mode === 'partly') {
          target.sun.set(0xffd27a)
          target.emissive.set(0xf0a020)
          target.cloud.set(0xf2f6fa)
          target.particle.set(0xcfe0f5)
          target.glow.set(0x89c4c0)
          target.floor.set(0x1a6b6b)
        } else if (mode === 'rain' || mode === 'drizzle') {
          target.sun.set(0xa8b8c8)
          target.emissive.set(0x4d6478)
          target.cloud.set(0xb8c6d4)
          target.particle.set(0x7eb6ff)
          target.glow.set(0x3d6a82)
          target.floor.set(0x2a5568)
        } else if (mode === 'thunder') {
          target.sun.set(0x8a9aac)
          target.emissive.set(0x3a4d60)
          target.cloud.set(0x9aaab8)
          target.particle.set(0xffe566)
          target.glow.set(0x2a3d52)
          target.floor.set(0x243648)
        } else if (mode === 'snow') {
          target.sun.set(0xdbe7f2)
          target.emissive.set(0x8aa4bc)
          target.cloud.set(0xffffff)
          target.particle.set(0xffffff)
          target.glow.set(0xa9c2d8)
          target.floor.set(0x6f8fa8)
        } else if (mode === 'fog') {
          target.sun.set(0xc5d0da)
          target.emissive.set(0x6d7f91)
          target.cloud.set(0xd8e0e8)
          target.particle.set(0xc9d5e0)
          target.glow.set(0x8a9aab)
          target.floor.set(0x5a6e7a)
        } else {
          target.sun.set(0xc9d6e2)
          target.emissive.set(0x6f849a)
          target.cloud.set(0xe8eef5)
          target.particle.set(0xb7d0e8)
          target.glow.set(0x5d7a92)
          target.floor.set(0x3f5a63)
        }
      }

      const resize = () => {
        const w = host.clientWidth || 1
        const h = host.clientHeight || 1
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h, false)
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(host)

      const clock = new THREE.Clock()
      let flashTimer = 1.8
      const home = positions.slice()

      const tick = () => {
        raf = requestAnimationFrame(tick)
        const dt = Math.min(clock.getDelta(), 0.05)
        const t = clock.elapsedTime
        const mode = modeRef.current
        setTargets(mode)

        sunMat.color.lerp(target.sun, 0.08)
        sunMat.emissive.lerp(target.emissive, 0.08)
        cloudMat.color.lerp(target.cloud, 0.08)
        particleMat.color.lerp(target.particle, 0.1)
        ;(innerGlow.material as InstanceType<typeof THREE.MeshBasicMaterial>).color.lerp(
          target.glow,
          0.08,
        )
        ;(floor.material as InstanceType<typeof THREE.MeshBasicMaterial>).color.lerp(
          target.floor,
          0.08,
        )

        const sunny = mode === 'clear' || mode === 'partly'
        const rainy = mode === 'rain' || mode === 'drizzle' || mode === 'thunder'
        const snowy = mode === 'snow'
        const misty = mode === 'fog'
        const windy = mode === 'wind'

        sunGroup.visible = sunny || misty
        sunGroup.position.set(sunny ? (mode === 'partly' ? 0.55 : 0.05) : -0.35, sunny ? 0.35 : 0.55, 0.15)
        sunMat.emissiveIntensity = mode === 'clear' ? 1.25 : mode === 'partly' ? 0.85 : 0.3
        sunLight.intensity = sunny ? 2.4 : misty ? 0.5 : 0.25
        sunLight.position.copy(sunGroup.position)

        cloudGroup.visible = mode !== 'clear'
        cloudMat.opacity = misty ? 0.45 : mode === 'thunder' ? 0.95 : 0.88
        cloudGroup.scale.setScalar(misty ? 1.15 : 1)

        particles.visible = rainy || snowy || misty || windy || mode === 'partly'
        particleMat.size = snowy ? 0.05 : misty ? 0.07 : rainy ? 0.028 : 0.03
        particleMat.opacity = misty ? 0.4 : 0.9

        if (!prefersReduced) {
          root.rotation.y = t * 0.18
          glass.rotation.y = -t * 0.08
          camera.position.x = Math.sin(t * 0.25) * 0.2
          camera.position.y = 0.15 + Math.sin(t * 0.3) * 0.06
          camera.lookAt(0, 0, 0)

          sun.rotation.y = t * 0.4
          sunGroup.scale.setScalar(1 + Math.sin(t * 2) * 0.03)

          cloudGroup.rotation.y = Math.sin(t * 0.35) * 0.15
          cloudGroup.position.y = Math.sin(t * 0.6) * 0.04

          const arr = particleGeo.attributes.position.array as Float32Array
          for (let i = 0; i < COUNT; i++) {
            const ix = i * 3
            if (rainy) {
              arr[ix + 1] -= (mode === 'drizzle' ? 1.2 : 2.2) * dt
              arr[ix] += Math.sin(t + seeds[i]) * 0.15 * dt
              if (arr[ix + 1] < -1.2) {
                arr[ix + 1] = 1.2
                arr[ix] = home[ix] * 0.9
                arr[ix + 2] = home[ix + 2] * 0.9
              }
            } else if (snowy) {
              arr[ix + 1] -= 0.35 * dt
              arr[ix] += Math.sin(t * 0.8 + seeds[i] * 8) * 0.25 * dt
              if (arr[ix + 1] < -1.2) arr[ix + 1] = 1.2
            } else if (misty || windy || mode === 'partly') {
              const angle = t * (windy ? 0.7 : 0.25) + seeds[i] * Math.PI * 2
              const r = 0.45 + seeds[i] * 0.9
              arr[ix] = Math.cos(angle) * r
              arr[ix + 2] = Math.sin(angle) * r
              arr[ix + 1] = (home[ix + 1] || 0) * 0.7 + Math.sin(t + seeds[i] * 6) * 0.15
            }
          }
          particleGeo.attributes.position.needsUpdate = true

          if (mode === 'thunder') {
            flashTimer -= dt
            const flashMat = flash.material as InstanceType<typeof THREE.MeshBasicMaterial>
            const boltMat = bolt.material as InstanceType<typeof THREE.MeshBasicMaterial>
            if (flashTimer < 0) {
              flashMat.opacity = 0.35
              boltMat.opacity = 0.95
              bolt.position.set((Math.random() - 0.5) * 0.8, 0.1, 0.4)
              flashTimer = 1.4 + Math.random() * 2.2
            } else {
              flashMat.opacity *= 0.88
              boltMat.opacity *= 0.84
            }
          } else {
            ;(flash.material as InstanceType<typeof THREE.MeshBasicMaterial>).opacity = 0
            ;(bolt.material as InstanceType<typeof THREE.MeshBasicMaterial>).opacity = 0
          }
        }

        renderer.render(scene, camera)
      }
      tick()

      cleanup = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        renderer.dispose()
        glass.geometry.dispose()
        ;(glass.material as InstanceType<typeof THREE.Material>).dispose()
        innerGlow.geometry.dispose()
        ;(innerGlow.material as InstanceType<typeof THREE.Material>).dispose()
        sun.geometry.dispose()
        sunMat.dispose()
        puffGeo.dispose()
        cloudMat.dispose()
        particleGeo.dispose()
        particleMat.dispose()
        floor.geometry.dispose()
        ;(floor.material as InstanceType<typeof THREE.Material>).dispose()
        bolt.geometry.dispose()
        ;(bolt.material as InstanceType<typeof THREE.Material>).dispose()
        flash.geometry.dispose()
        ;(flash.material as InstanceType<typeof THREE.Material>).dispose()
        if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement)
      }
    })()

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      cleanup?.()
    }
  }, [reduced])

  return (
    <div
      ref={hostRef}
      className={`scene3d ${className}`}
      aria-hidden="true"
      data-condition={asMode(condition)}
    />
  )
}
