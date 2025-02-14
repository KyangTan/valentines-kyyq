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
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore"
import { uploadToVercelBlob } from "@/lib/storage"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

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
  { id: 1, label: "对方最好看的照片" },
  { id: 2, label: "日常感照片" },
  { id: 3, label: "对方最搞笑的照片" },
  { id: 4, label: "对方最可爱的照片" },
  { id: 5, label: "最喜欢的一趟旅行" }
] as const

type Gender = 'Kwan Yang' | 'Yong Qing' | null;

export default function ValentinesShowcase() {
  const [kyhearts, setKyHearts] = useState(0)
  const [yqhearts, setYqHearts] = useState(0)
  const [isSparkling, setIsSparkling] = useState(false)
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null, null, null])
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [heartConfigs, setHeartConfigs] = useState<HeartConfig[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGender, setSelectedGender] = useState<Gender>(null)
  const [heartScale, setHeartScale] = useState(1)
  const [lastClickTime, setLastClickTime] = useState(Date.now())
  const [showLoveModal, setShowLoveModal] = useState(false)
  const [bubbleSound] = useState(() => typeof Audio !== 'undefined' ? new Audio('/bubble.mp3') : null)

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

  // Replace the loading useEffect with this one
  useEffect(() => {
    if (!selectedGender) return;
    
    // Set up realtime listeners
    const unsubscribeKY = onSnapshot(doc(db, "valentines", "Kwan Yang"), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as ValentinesData;
        setKyHearts(data.hearts || 0);
      }
    });

    const unsubscribeYQ = onSnapshot(doc(db, "valentines", "Yong Qing"), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as ValentinesData;
        setYqHearts(data.hearts || 0);
      }
    });

    // Load images
    const loadImages = async () => {
      try {
        const docSnapSelected = await getDoc(doc(db, "valentines", selectedGender));
        
        // Reset images when changing gender
        setImages([null, null, null, null, null, null]);
        
        if (docSnapSelected.exists()) {
          const data = docSnapSelected.data() as ValentinesData;
          const loadedImages = [null, null, null, null, null, null];
          
          // Load images from the selected gender's data
          Object.entries(data.images || {}).forEach(([index, imageData]) => {
            loadedImages[parseInt(index)] = imageData.url;
          });
          setImages(loadedImages);
        }
      } catch (error) {
        console.error("Error loading images:", error);
      }
    };

    loadImages();

    // Cleanup listeners on unmount or when selectedGender changes
    return () => {
      unsubscribeKY();
      unsubscribeYQ();
    };
  }, [selectedGender]);

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
      }, { merge: true })

    } catch (error) {
      console.error("Error uploading image:", error)
      // You might want to show an error message to the user
    } finally {
      setIsLoading(false)
    }
  }

  const handleNextImage = () => {
    setCurrentImageIndex(prev => (prev + 1) % 6)
  }

  const handlePreviousImage = () => {
    setCurrentImageIndex(prev => (prev - 1 + 6) % 6)
  }

  const getUploadButtonLabel = () => {
    if (images[currentImageIndex]) {
      return `Replace ${IMAGE_PROMPTS[currentImageIndex].label} Photo`
    }
    return `Upload ${IMAGE_PROMPTS[currentImageIndex].label} Photo`
  }

  const handleHeartClick = async () => {
    try {
      // Reset and play bubble sound
      if (bubbleSound) {
        bubbleSound.currentTime = 0  // Reset to start
        bubbleSound.play().catch(console.error)
      }
      
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
      
      // Check if hearts reached 50
      if (newHeartCount === 50) {
        setShowLoveModal(true)
      }
      
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

  // Add the love letter modal JSX before the final return statement
  const LoveLetterModal = () => (
    <Dialog open={showLoveModal} onOpenChange={setShowLoveModal}>
      <DialogContent className="max-w-md bg-white/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold text-pink-600">
            A Love Letter For You 💝
          </DialogTitle>
        </DialogHeader>
        <div className="p-6 text-gray-700">
          <p className="mb-4 text-center italic">
            "Dearest {selectedGender === "Kwan Yang" ? "Yong Qing" : "Kwan Yang"},
          </p>
          <p className="mb-4 leading-relaxed text-center">
            I always feel that with you by my side, even the most ordinary days become meaningful. Whether it's having meals together, taking a walk, or casually chatting about little things, it all feels so comforting.
          </p>
          <p className="mb-4 leading-relaxed text-center">
            I'm truly grateful for your understanding and companionship, guiding each other to love more. Every day with you feels like a blessing. I hope we can continue like this—simple and happy—walking forward together. Thank you for being my perfect Valentine, today and always.
          </p>
          <p className="text-right">
            With all my love,<br />
            {selectedGender}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )

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

        {/* Easter Egg Tooltip */}
        <div className="group fixed bottom-4 right-4 z-20">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-600 backdrop-blur-sm">
            ?
          </div>
          <div className="absolute bottom-full right-0 mb-2 hidden rounded-lg bg-white/80 p-2 text-sm text-gray-600 backdrop-blur-sm group-hover:block">
            💝 Psst... there&apos;s an easter egg to discover!
          </div>
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
                  className="mx-auto max-h-5000 rounded-lg object-cover"
                />
                <div className="mt-2 flex items-center justify-center gap-2">
                  <span className="text-sm text-gray-500">
                    {IMAGE_PROMPTS[currentImageIndex].label} ({currentImageIndex + 1}/6)
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
             {/* Show Love Letter button when hearts >= 50 */}
             {((selectedGender === "Yong Qing" && kyhearts >= 50) || 
              (selectedGender === "Kwan Yang" && yqhearts >= 50)) && (
              <Button
                variant="outline"
                className="border-pink-200 bg-white/50 transition-colors hover:bg-pink-50"
                onClick={() => setShowLoveModal(true)}
              >
                Read Love Letter 💝
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      <LoveLetterModal />
      
      {/* Easter Egg Tooltip */}
      <div className="group fixed bottom-4 right-4 z-20">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-gray-600 backdrop-blur-sm">
          ?
        </div>
        <div className="absolute bottom-full right-0 mb-2 hidden rounded-lg bg-white/80 p-2 text-sm text-gray-600 backdrop-blur-sm group-hover:block">
          💝 Psst... there&apos;s an easter egg to discover!
        </div>
      </div>
    </div>
  )
}

