'use client'

import * as React from 'react'
import { Canvas } from '@react-three/fiber'
import { Float, OrbitControls, ContactShadows, RoundedBox } from '@react-three/drei'

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <cylinderGeometry args={[0.3, 0.3, 0.22, 28]} />
      <meshStandardMaterial color="#13202a" roughness={0.55} metalness={0.25} />
    </mesh>
  )
}

function Bus() {
  return (
    <group rotation={[0, -0.5, 0]}>
      {/* body */}
      <RoundedBox args={[3.3, 1.35, 1.45]} radius={0.24} smoothness={5} castShadow>
        <meshStandardMaterial color="#F76C3C" roughness={0.32} metalness={0.18} />
      </RoundedBox>
      {/* window band */}
      <RoundedBox args={[2.75, 0.52, 1.48]} radius={0.12} position={[0, 0.28, 0]}>
        <meshStandardMaterial color="#0E2730" roughness={0.08} metalness={0.5} />
      </RoundedBox>
      {/* roof accent */}
      <RoundedBox args={[3.05, 0.14, 1.32]} radius={0.06} position={[0, 0.74, 0]}>
        <meshStandardMaterial color="#0FA6A6" roughness={0.4} metalness={0.2} />
      </RoundedBox>
      {/* headlights */}
      <mesh position={[1.66, -0.12, 0.46]}>
        <boxGeometry args={[0.06, 0.2, 0.24]} />
        <meshStandardMaterial color="#F7B733" emissive="#F7B733" emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[1.66, -0.12, -0.46]}>
        <boxGeometry args={[0.06, 0.2, 0.24]} />
        <meshStandardMaterial color="#F7B733" emissive="#F7B733" emissiveIntensity={0.7} />
      </mesh>
      {/* wheels */}
      <Wheel position={[1.02, -0.66, 0.66]} />
      <Wheel position={[-1.02, -0.66, 0.66]} />
      <Wheel position={[1.02, -0.66, -0.66]} />
      <Wheel position={[-1.02, -0.66, -0.66]} />
    </group>
  )
}

interface Bus3DSceneProps {
  /** Disable drag-to-orbit (still auto-rotates). */
  interactive?: boolean
}

export function Bus3DScene({ interactive = true }: Bus3DSceneProps) {
  const [reduce, setReduce] = React.useState(false)
  React.useEffect(() => {
    setReduce(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  }, [])

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [4.6, 1.9, 5.6], fov: 32 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
    >
      <React.Suspense fallback={null}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 5]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
        <pointLight position={[-5, 2, 3]} intensity={35} color="#F76C3C" />
        <pointLight position={[5, 1, -4]} intensity={28} color="#0FA6A6" />
        <Float speed={reduce ? 0 : 1.4} rotationIntensity={reduce ? 0 : 0.4} floatIntensity={reduce ? 0 : 0.7}>
          <Bus />
        </Float>
        <ContactShadows position={[0, -1.15, 0]} opacity={0.34} blur={2.6} scale={11} far={4} color="#0E2730" />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          enableRotate={interactive}
          autoRotate={!reduce}
          autoRotateSpeed={1.1}
          minPolarAngle={Math.PI / 3.2}
          maxPolarAngle={Math.PI / 2.05}
        />
      </React.Suspense>
    </Canvas>
  )
}

export default Bus3DScene
