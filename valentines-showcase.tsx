"use client"

import { useState, Suspense, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { Environment, Float, OrbitControls } from "@react-three/drei"
import { Heart, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { FloatingHeart } from "./components/floating-heart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface HeartConfig {
  position: [number, number, number]
  scale: number
  rotationSpeed: number
  floatSpeed: number
  floatParams: {
    speed: number
    rotationIntensity: number
    floatIntensity: number
  }
}

export default function ValentinesShowcase() {
  const [hearts, setHearts] = useState(0)
  const [isSparkling, setIsSparkling] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [heartConfigs, setHeartConfigs] = useState<HeartConfig[]>([])

  // Generate random configurations once on mount
  useEffect(() => {
    const configs = Array(8).fill(null).map(() => ({
      position: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ] as [number, number, number],
      scale: 0.04 + Math.random() * 0.03,
      rotationSpeed: 0.5 + Math.random(),
      floatSpeed: 0.5 + Math.random(),
      floatParams: {
        speed: 1 + Math.random(),
        rotationIntensity: 0.5 + Math.random(),
        floatIntensity: 0.5 + Math.random()
      }
    }))
    setHeartConfigs(configs)
  }, []) // Empty dependency array means this runs once on mount

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % images.length)
  }

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
            {heartConfigs.map((config, i) => (
              <Float
                key={i}
                speed={config.floatParams.speed}
                rotationIntensity={config.floatParams.rotationIntensity}
                floatIntensity={config.floatParams.floatIntensity}
              >
                <FloatingHeart
                  position={config.position}
                  scale={config.scale}
                  rotationSpeed={config.rotationSpeed}
                  floatSpeed={config.floatSpeed}
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

            {/* Image preview */}
            {images.length > 0 && (
              <div className="mb-4">
                <img
                  src={images[currentImageIndex]}
                  alt={`Image ${currentImageIndex + 1}`}
                  className="mx-auto max-h-40 rounded-lg object-cover"
                />
                {images.length > 1 && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-500">
                      {currentImageIndex + 1} / {images.length}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Heart counter */}
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
          <CardFooter className="flex flex-col gap-4">
            {/* Upload button */}
            <div className="w-full">
              <Label htmlFor="picture" className="mb-2 block text-center text-sm text-gray-600">
                Add special photos
              </Label>
              <div className="flex justify-center gap-2">
                <Input
                  id="picture"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outline"
                  className="border-pink-200 bg-white/50 transition-colors hover:bg-pink-50"
                  onClick={() => document.getElementById('picture')?.click()}
                >
                  Upload Images
                </Button>
                {images.length > 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="border-pink-200 bg-white/50 transition-colors hover:bg-pink-50"
                    onClick={handleNextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Existing Send Love button */}
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

