"use client"

import { useState, Suspense, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { Environment, Float, OrbitControls } from "@react-three/drei"
import { Heart, ChevronRight, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { FloatingHeart } from "./components/floating-heart"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { db } from "@/lib/firebase"
import { doc, setDoc, getDoc } from "firebase/firestore"
import { uploadToVercelBlob } from "@/lib/storage"

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

interface ImageData {
  url: string
  timestamp: number
  prompt: string
}

interface ValentinesData {
  images: { [key: number]: ImageData }
  hearts: number
}

const IMAGE_PROMPTS = [
  { id: 0, label: "最喜欢的合照" },
  { id: 1, label: "最难忘的回忆" },
  { id: 2, label: "对方最好看的照片" },
  { id: 3, label: "最喜欢的一趟旅行" }
] as const

export default function ValentinesShowcase() {
  const [hearts, setHearts] = useState(0)
  const [isSparkling, setIsSparkling] = useState(false)
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [heartConfigs, setHeartConfigs] = useState<HeartConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)

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

  // Load existing data
  useEffect(() => {
    const loadValentinesData = async () => {
      try {
        const docRef = doc(db, "valentines", "your_unique_id")
        const docSnap = await getDoc(docRef)
        
        if (docSnap.exists()) {
          const data = docSnap.data() as ValentinesData
          setHearts(data.hearts || 0)
          
          // Convert stored image data to array format
          const loadedImages = [null, null, null, null]
          Object.entries(data.images || {}).forEach(([index, imageData]) => {
            loadedImages[parseInt(index)] = imageData.url
          })
          setImages(loadedImages)
        }
      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadValentinesData()
  }, [])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      // Upload to Vercel Blob Storage
      const downloadURL = await uploadToVercelBlob(
        file, 
        `valentines/your_unique_id/${currentImageIndex}_`
      )

      // Update state
      setImages(prev => {
        const newImages = [...prev]
        newImages[currentImageIndex] = downloadURL
        return newImages
      })

      // Save to Firestore (keeping metadata in Firestore)
      const docRef = doc(db, "valentines", "your_unique_id")
      await setDoc(docRef, {
        images: {
          [currentImageIndex]: {
            url: downloadURL,
            timestamp: Date.now(),
            prompt: IMAGE_PROMPTS[currentImageIndex].label
          }
        },
        hearts
      }, { merge: true })

    } catch (error) {
      console.error("Error uploading image:", error)
      // You might want to show an error message to the user
    } finally {
      setIsLoading(false)
    }
  }

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % 4)
  }

  const handlePreviousImage = () => {
    setCurrentImageIndex(prev => (prev - 1 + 4) % 4)
  }

  const getUploadButtonLabel = () => {
    if (images[currentImageIndex]) {
      return `Replace ${IMAGE_PROMPTS[currentImageIndex].label} Photo`
    }
    return `Upload ${IMAGE_PROMPTS[currentImageIndex].label} Photo`
  }

  const handleHeartClick = async () => {
    try {
      const newHeartCount = hearts + 1
      setHearts(newHeartCount)
      setIsSparkling(true)
      
      console.log('newHeartCount', newHeartCount)

      // Update hearts in Firestore
      const docRef = doc(db, "valentines", "your_unique_id")
      await setDoc(docRef, { hearts: newHeartCount }, { merge: true })
      
      setTimeout(() => setIsSparkling(false), 1000)
    } catch (error) {
      console.error("Error updating hearts:", error)
    }
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
            {images.some(img => img !== null) && (
              <div className="mb-4">
                <img
                  src={images[currentImageIndex] || ''}
                  alt={`${IMAGE_PROMPTS[currentImageIndex].label} photo`}
                  className="mx-auto max-h-40 rounded-lg object-cover"
                />
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-500">
                    {IMAGE_PROMPTS[currentImageIndex].label} ({currentImageIndex + 1}/4)
                  </span>
                </div>
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
                {images[currentImageIndex] 
                  ? `Current: ${IMAGE_PROMPTS[currentImageIndex].label}`
                  : `Upload your ${IMAGE_PROMPTS[currentImageIndex].label} photo`}
              </Label>
              <div className="flex justify-center gap-2">
                <Input
                  id="picture"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="border-pink-200 bg-white/50 transition-colors hover:bg-pink-50"
                  onClick={handlePreviousImage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  className="border-pink-200 bg-white/50 transition-colors hover:bg-pink-50"
                  onClick={() => document.getElementById('picture')?.click()}
                  disabled={isLoading}
                >
                  {isLoading ? "Uploading..." : getUploadButtonLabel()}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="border-pink-200 bg-white/50 transition-colors hover:bg-pink-50"
                  onClick={handleNextImage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              {/* Progress indicators */}
              <div className="mt-2 flex justify-center gap-2">
                {IMAGE_PROMPTS.map((prompt, index) => (
                  <div
                    key={prompt.id}
                    className={`h-2 w-2 rounded-full transition-colors ${
                      currentImageIndex === index
                        ? 'bg-pink-500'
                        : images[index]
                        ? 'bg-pink-200'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Existing Send Love button */}
            <Button
              variant="outline"
              className="border-pink-200 bg-white/50 transition-colors hover:bg-pink-50"
              onClick={handleHeartClick}
            >
              Send Love
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

