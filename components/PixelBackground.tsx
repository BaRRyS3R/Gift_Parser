'use client'

import { useEffect, useRef } from 'react'

const PixelBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // Set canvas size to window size
        const resizeCanvas = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
        }
        resizeCanvas()
        window.addEventListener('resize', resizeCanvas)

        // Pixel size
        const pixelSize = 20
        const cols = Math.floor(canvas.width / pixelSize)
        const rows = Math.floor(canvas.height / pixelSize)

        // Create pixel array
        const pixels: { x: number; y: number; color: string }[] = []
        for (let i = 0; i < cols * rows; i++) {
            const x = (i % cols) * pixelSize
            const y = Math.floor(i / cols) * pixelSize
            const hue = Math.random() * 360
            pixels.push({
                x,
                y,
                color: `hsl(${hue}, 50%, 50%)`
            })
        }

        // Animation
        let frame = 0
        const animate = () => {
            frame++
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            pixels.forEach((pixel) => {
                const offset = Math.sin(frame * 0.01 + pixel.x * 0.01) * 5
                ctx.fillStyle = pixel.color
                ctx.fillRect(pixel.x, pixel.y + offset, pixelSize - 1, pixelSize - 1)
            })

            requestAnimationFrame(animate)
        }
        animate()

        return () => {
            window.removeEventListener('resize', resizeCanvas)
        }
    }, [])

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full -z-10"
            style={{ opacity: 0.3 }}
        />
    )
}

export default PixelBackground 