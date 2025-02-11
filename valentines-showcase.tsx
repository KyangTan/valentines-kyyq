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

type Gender = 'Kwan Yang' | 'Yong Qing' | null;

export default function ValentinesShowcase() {
  const [kyhearts, setKyHearts] = useState(0)
  const [yqhearts, setYqHearts] = useState(0)
  const [isSparkling, setIsSparkling] = useState(false)
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [heartConfigs, setHeartConfigs] = useState<HeartConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGender, setSelectedGender] = useState<Gender>(null)
  const [heartScale, setHeartScale] = useState(1)
  const [lastClickTime, setLastClickTime] = useState(Date.now())

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
      if (!selectedGender) return;
      
      try {
        const docRefSelected = doc(db, "valentines", selectedGender)
        const docSnapSelected = await getDoc(docRefSelected)
        
        if (docSnapSelected.exists()) {
          const dataSelected = docSnapSelected.data() as ValentinesData
          if (selectedGender === "Kwan Yang") {
            setKyHearts(dataSelected.hearts || 0)
          } else {
            setYqHearts(dataSelected.hearts || 0)
          }
          
          // Convert stored image data to array format
          const loadedImages = [null, null, null, null]
          Object.entries(dataSelected.images || {}).forEach(([index, imageData]) => {
            loadedImages[parseInt(index)] = imageData.url
          })
          setImages(loadedImages)
        }

        const docRefOther = doc(db, "valentines", selectedGender === "Kwan Yang" ? "Yong Qing" : "Kwan Yang")
        const docSnapOther = await getDoc(docRefOther)
        if (docSnapOther.exists()) {
          const dataOther = docSnapOther.data() as ValentinesData
          if (selectedGender === "Kwan Yang") {
            setYqHearts(dataOther.hearts || 0)
          } else {
            setKyHearts(dataOther.hearts || 0)
          }
        }

      } catch (error) {
        console.error("Error loading data:", error)
      }
    }

    loadValentinesData()
  }, [selectedGender])

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsLoading(true)
    try {
      // Upload to Vercel Blob Storage
      const downloadURL = await uploadToVercelBlob(
        file, 
        `valentines/${selectedGender}/${currentImageIndex}_`
      )

      // Update state
      setImages(prev => {
        const newImages = [...prev]
        newImages[currentImageIndex] = downloadURL
        return newImages
      })
      // Save to Firestore (keeping metadata in Firestore)
      const docRef = doc(db, "valentines", selectedGender!)
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
      const now = Date.now()
      const timeSinceLastClick = now - lastClickTime
      
      // Increase heart scale for rapid clicks (within 500ms)
      if (timeSinceLastClick < 999999999) {
        setHeartScale(prev => Math.min(prev + 0.5, 1000000)) // Cap at 2.5x
      } else {
        setHeartScale(1) // Reset to normal
      }
      setLastClickTime(now)

      const newHeartCount = selectedGender === "Yong Qing" ? kyhearts + 1 : yqhearts + 1
      if (selectedGender === "Yong Qing") {
        setKyHearts(newHeartCount)
      } else {
        setYqHearts(newHeartCount)
      }
      setIsSparkling(true)
      
      if (selectedGender) {
        const docRef = doc(db, "valentines", selectedGender === "Kwan Yang" ? "Yong Qing" : "Kwan Yang")
        await setDoc(docRef, { hearts: newHeartCount }, { merge: true })
      }
      
      setTimeout(() => {
        setIsSparkling(false)
        setHeartScale(1) // Reset scale after animation
      }, 500)
    } catch (error) {
      console.error("Error updating hearts:", error)
    }
  }

  if (!selectedGender) {
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

        {/* Gender Selection UI */}
        <div className="relative z-10 flex min-h-screen items-center justify-center gap-4 p-4 md:p-8">
          <Card 
            className="w-48 cursor-pointer border-pink-200 bg-white/80 backdrop-blur-sm transition-all hover:scale-105"
            onClick={() => setSelectedGender('Kwan Yang')}
          >
            <CardHeader>
              <h2 className="text-center text-2xl font-bold text-blue-600">KY 大帅哥</h2>
            </CardHeader>
            <CardContent className="text-center">
              <span className="text-6xl">👨</span>
            </CardContent>
          </Card>

          <Card 
            className="w-48 cursor-pointer border-pink-200 bg-white/80 backdrop-blur-sm transition-all hover:scale-105"
            onClick={() => setSelectedGender('Yong Qing')}
          >
            <CardHeader>
              <h2 className="text-center text-2xl font-bold text-pink-600">YQ 大美女</h2>
            </CardHeader>
            <CardContent className="text-center">
              <span className="text-6xl">👩</span>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
              KY
              <Heart
                className={`size-8 transition-all duration-300
                  ${kyhearts > 0 ? "fill-blue-500 text-blue-500" : "text-gray-400"}
                  ${kyhearts > 0 ? "scale-110" : "scale-100"}
                `}
                style={selectedGender === "Yong Qing" ? { transform: `scale(${heartScale})` } : undefined}
              />
              <span className="text-2xl font-bold text-gray-700">{kyhearts}</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              YQ
              <Heart
                className={`size-8 transition-all duration-300
                  ${yqhearts > 0 ? "fill-purple-500 text-purple-500" : "text-gray-400"}
                  ${yqhearts > 0 ? "scale-110" : "scale-100"}
                `}
                style={selectedGender === "Kwan Yang" ? { transform: `scale(${heartScale})` } : undefined}
              />
              <span className="text-2xl font-bold text-gray-700">{yqhearts}</span>
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

