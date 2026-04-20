"use client"

import { useCallback, useEffect, useRef, useState } from "react"

interface Point {
  x: number
  y: number
}

export interface Stroke {
  id: string
  points: Point[]
  color: string
  width: number
}

interface Props {
  isSharer: boolean
  strokes: Stroke[]
  onStroke: (stroke: Stroke) => void
  onClear: () => void
}

const COLORS = ["#ffffff", "#f87171", "#fbbf24", "#4ade80", "#60a5fa", "#e879f9"]
const WIDTHS = [3, 7, 14]

export default function ScreenShareAnnotation({ isSharer, strokes, onStroke, onClear }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const redrawRef = useRef<(live?: Point[], liveColor?: string, liveWidth?: number) => void>(() => {})
  const currentPoints = useRef<Point[]>([])
  const [drawMode, setDrawMode] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [color, setColor] = useState("#fbbf24")
  const [width, setWidth] = useState(7)

  const redraw = useCallback(
    (livePoints?: Point[], liveColor?: string, liveWidth?: number) => {
      const canvas = canvasRef.current
      if (!canvas || canvas.width === 0 || canvas.height === 0) return
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      function drawPath(points: Point[], c: string, w: number) {
        if (points.length < 2) return
        ctx!.beginPath()
        ctx!.strokeStyle = c
        ctx!.lineWidth = w
        ctx!.lineCap = "round"
        ctx!.lineJoin = "round"
        ctx!.moveTo(points[0].x * canvas!.width, points[0].y * canvas!.height)
        for (let i = 1; i < points.length; i++) {
          ctx!.lineTo(points[i].x * canvas!.width, points[i].y * canvas!.height)
        }
        ctx!.stroke()
      }

      for (const stroke of strokes) {
        drawPath(stroke.points, stroke.color, stroke.width)
      }
      if (livePoints && livePoints.length > 1) {
        drawPath(livePoints, liveColor ?? color, liveWidth ?? width)
      }
    },
    [strokes, color, width],
  )

  useEffect(() => {
    redrawRef.current = redraw
  }, [redraw])

  useEffect(() => {
    redraw()
  }, [redraw])

  // Set up ResizeObserver once; always calls latest redraw via ref
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const sync = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      redrawRef.current()
    }
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  function getPoint(e: React.MouseEvent<HTMLCanvasElement>): Point {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    }
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    e.preventDefault()
    setIsDrawing(true)
    currentPoints.current = [getPoint(e)]
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return
    currentPoints.current.push(getPoint(e))
    redraw(currentPoints.current, color, width)
  }

  function finishStroke() {
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentPoints.current.length > 1) {
      onStroke({
        id: crypto.randomUUID(),
        points: [...currentPoints.current],
        color,
        width,
      })
    }
    currentPoints.current = []
  }

  return (
    <div className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{
          cursor: drawMode ? "crosshair" : "default",
          pointerEvents: isSharer && drawMode ? "auto" : "none",
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={finishStroke}
        onMouseLeave={finishStroke}
      />

      {isSharer && (
        <div className="absolute top-3 left-3 flex flex-col items-center gap-2 bg-stone-900/90 border border-stone-700 rounded-xl p-2 z-10">
          <button
            onClick={() => setDrawMode((d) => !d)}
            className={`w-8 h-8 rounded-lg text-base transition-colors flex items-center justify-center ${
              drawMode
                ? "bg-amber-600 text-white"
                : "bg-stone-700 text-stone-300 hover:bg-stone-600"
            }`}
            title={drawMode ? "Exit draw mode" : "Annotate screen"}
          >
            ✏️
          </button>

          {drawMode && (
            <>
              <div className="flex flex-col gap-1.5">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: color === c ? "#f59e0b" : "rgba(255,255,255,0.15)",
                    }}
                  />
                ))}
              </div>

              <div className="flex flex-col gap-1.5 items-center">
                {WIDTHS.map((w) => (
                  <button
                    key={w}
                    onClick={() => setWidth(w)}
                    className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
                      width === w ? "bg-amber-700" : "bg-stone-700 hover:bg-stone-600"
                    }`}
                  >
                    <div
                      className="rounded-full"
                      style={{
                        width: Math.min(w + 2, 16),
                        height: Math.min(w + 2, 16),
                        backgroundColor: color,
                      }}
                    />
                  </button>
                ))}
              </div>

              <button
                onClick={onClear}
                className="w-7 h-7 rounded bg-red-800 hover:bg-red-700 text-white text-xs flex items-center justify-center transition-colors"
                title="Clear all annotations"
              >
                ✕
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
