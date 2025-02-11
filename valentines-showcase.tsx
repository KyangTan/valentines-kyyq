"use client"

import { useState, Suspense } from "react"
import { Canvas } from "@react-three/fiber"
import { Environment, Float, OrbitControls } from "@react-three/drei"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { FloatingHeart } from "./components/floating-heart"

export default function ValentinesShowcase() {
  const [hearts, setHearts] = useState(0)
  const [isSparkling, setIsSparkling] = useState(false)

  return (
    <div className="relative min-h-screen w-full">
      {/* 3D Scene */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 20], fov: 45 }}>
          <Suspense fallback={null}>
            <Environment preset="sunset" />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            {/* Multiple floating hearts */}
            {[...Array(8)].map((_, i) => (
              <Float
                key={i}
                speed={1 + Math.random()}
                rotationIntensity={0.5 + Math.random()}
                floatIntensity={0.5 + Math.random()}
              >
                <FloatingHeart
                  // position={[1.657772506051911, 0.35793396370240593, 0.09771778513089302]}
                  position={[(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10]}
                  scale={0.04 + Math.random() * 0.03}
                  rotationSpeed={0.5 + Math.random()}
                  floatSpeed={0.5 + Math.random()}
                />
              </Float>
            ))}

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              maxPolarAngle={Math.PI / 2}
              minPolarAngle={Math.PI / 2}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* UI Card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 md:p-8">
        <Card
          className={`max-w-md border-pink-200 bg-white/80 backdrop-blur-sm
            ${isSparkling ? "animate-sparkle" : ""}
          `}
        >
          <CardHeader>
            <h1 className="bg-gradient-to-r from-red-400 to-pink-600 bg-clip-text text-center text-3xl font-bold text-transparent md:text-4xl">
              Happy Valentine&apos;s Day!
            </h1>
          </CardHeader>
          <CardContent className="text-center">
            <p className="mb-6 text-lg text-gray-600">
              Roses are red, violets are blue,
              <br />
              This message is special,
              <br />
              Just like you! 💝
            </p>
            <div className="flex items-center justify-center gap-2">
              <Heart
                className={`size-8 transition-all
                  ${hearts > 0 ? "fill-red-500 text-red-500" : "text-gray-400"}
                  ${hearts > 0 ? "scale-110" : "scale-100"}
                `}
              />
              <span className="text-2xl font-bold text-gray-700">{hearts}</span>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button
              variant="outline"
              className="border-pink-200 bg-white/50 transition-colors hover:bg-pink-50"
              onClick={() => {
                setHearts((prev) => prev + 1)
                setIsSparkling(true)
                setTimeout(() => setIsSparkling(false), 1000)
              }}
            >
              Send Love
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

