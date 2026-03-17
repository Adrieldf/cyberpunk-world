'use client'

import { useRef, useState, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react'

// Pre-defined neon cyberpunk palette matching Tailwind v4 config
const NEON_COLORS = [
  '#ff00ff', // Primary (Magenta)
  '#00ffff', // Secondary (Cyan)
  '#ff003c', // Accent (Red)
  '#fcee0a', // Synth (Yellow)
  '#b026ff', // Synth (Purple)
  '#ffffff', // White
]

interface SignCanvasProps {
  onConfirm?: (base64Image: string) => void
  onClose?: () => void
}

export function SignCanvas({ onConfirm, onClose }: SignCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState(NEON_COLORS[0])
  const [brushSize, setBrushSize] = useState(4)

  // Initialize canvas context
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set high-DPI scaling for crisp lines
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Fill background with a very subtle dark tint so it's not entirely transparent
    // Or leave it transparent. Let's make it fully transparent so the signature floats.
    // We just need to make sure lines are smooth.
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  // Helper to get exact coordinates for both mouse and touch
  const getCoordinates = (e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    
    // Handle touch events
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    
    // Handle mouse events
    return {
      x: e.nativeEvent.offsetX,
      y: e.nativeEvent.offsetY
    }
  }

  const startDrawing = (e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent scrolling on touch
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  const draw = (e: ReactMouseEvent<HTMLCanvasElement> | ReactTouchEvent<HTMLCanvasElement>) => {
    e.preventDefault() // Prevent scrolling on touch
    if (!isDrawing) return

    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = color

    // Cyberpunk glow effect on brush! We use standard canvas shadows.
    ctx.shadowBlur = brushSize * 2
    ctx.shadowColor = color
    ctx.lineWidth = brushSize

    ctx.stroke()
  }

  const stopDrawing = () => {
    const ctx = canvasRef.current?.getContext('2d')
    if (ctx) {
      ctx.closePath()
    }
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Get Base64 image
    const dataUrl = canvas.toDataURL('image/png')
    
    if (onConfirm) {
      onConfirm(dataUrl)
    } else {
      console.log('Signature saved:', dataUrl)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-black/60 border border-white/10 rounded-xl backdrop-blur-xl shadow-neon-primary relative max-w-lg w-full">
      
      {/* Optional Close Button */}
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
        >
          ✕
        </button>
      )}

      <h2 className="text-xl font-bold text-white tracking-widest mb-4 uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
        Sign Authorization
      </h2>

      {/* Canvas Area */}
      <div className="relative rounded-lg overflow-hidden border-2 border-white/20 bg-black/40 mb-6 w-full cursor-crosshair">
        {/* Adds a slight grid backdrop behind the canvas */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-cyber-grid bg-[length:15px_15px]"></div>
        
        <canvas
          ref={canvasRef}
          width={400} // Logical width
          height={200} // Logical height
          className="w-full h-[200px] block touch-none relative z-10"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>

      {/* Controls Container */}
      <div className="flex flex-col w-full gap-4">
        
        <div className="flex items-center justify-between w-full">
          {/* Color Picker */}
          <div className="flex gap-2">
            {NEON_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${color === c ? 'scale-125 border-white' : 'border-transparent'}`}
                style={{ 
                  backgroundColor: c,
                  boxShadow: color === c ? `0 0 10px ${c}` : 'none'
                }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>

          {/* Brush Size */}
          <div className="flex items-center gap-3">
            <span className="text-white/70 text-sm font-mono uppercase tracking-wider">Size</span>
            <input 
              type="range" 
              min="1" 
              max="15" 
              value={brushSize} 
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-24 accent-primary" // Uses our Tailwind magenta
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-2 justify-between w-full">
          <button 
            onClick={clearCanvas}
            className="px-6 py-2 bg-white/5 border border-white/20 text-white rounded font-mono uppercase tracking-wider hover:bg-white/10 transition-colors w-full"
          >
            Clear Data
          </button>
          
          <button 
            onClick={handleConfirm}
            className="px-6 py-2 bg-primary/20 border border-primary text-white rounded font-mono uppercase tracking-wider hover:bg-primary/40 hover:shadow-neon-primary transition-all w-full"
          >
            Confirm
          </button>
        </div>

      </div>
    </div>
  )
}
