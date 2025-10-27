"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls, Environment, useGLTF } from "@react-three/drei"
import { Suspense, useState } from "react"
import { Card } from "@/components/ui/card"

function Model3D({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene} scale={1.5} />
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#8b5cf6" wireframe />
    </mesh>
  )
}

export function AssetShowcase3D() {
  const [currentAsset, setCurrentAsset] = useState(0)

  const assets = [
    {
      name: "Fantasy Sword",
      model: "/assets/3d/duck.glb", // Using sample model
      description: "Medieval weapon asset",
    },
    {
      name: "Treasure Chest",
      model: "/assets/3d/duck.glb",
      description: "Interactive prop",
    },
    {
      name: "Magic Potion",
      model: "/assets/3d/duck.glb",
      description: "Consumable item",
    },
    {
      name: "Shield",
      model: "/assets/3d/duck.glb",
      description: "Defensive equipment",
    },
  ]

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl p-6 md:p-12 shadow-xl">
      <div className="text-center mb-8">
        <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Asset Showcase</h3>
        <p className="text-muted-foreground text-base md:text-lg">
          See what you can create with our AI-powered pipeline
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-center">
        {/* 3D Viewer */}
        <div className="aspect-square rounded-xl overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <Suspense fallback={<LoadingFallback />}>
              <Model3D url={assets[currentAsset].model} />
              <OrbitControls autoRotate autoRotateSpeed={2} enableZoom={false} />
              <Environment preset="studio" />
              <ambientLight intensity={0.5} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
            </Suspense>
          </Canvas>
        </div>

        {/* Asset List */}
        <div className="space-y-3">
          {assets.map((asset, index) => (
            <button
              key={index}
              onClick={() => setCurrentAsset(index)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                currentAsset === index
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                  : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-foreground">{asset.name}</h4>
                  <p className="text-sm text-muted-foreground">{asset.description}</p>
                </div>
                {currentAsset === index && <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}
