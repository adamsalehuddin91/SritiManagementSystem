// Run: node scripts/generate-icons.js
// Generates placeholder PWA icons until real SRITI logo is available
const { createCanvas } = require('canvas')
const fs = require('fs')
const path = require('path')

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Green background (SRITI brand green)
  ctx.fillStyle = '#15803d'
  ctx.fillRect(0, 0, size, size)

  // White circle
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(size / 2, size * 0.42, size * 0.28, 0, Math.PI * 2)
  ctx.fill()

  // "S" letter
  ctx.fillStyle = '#15803d'
  ctx.font = `bold ${size * 0.32}px Arial`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('S', size / 2, size * 0.42)

  // "SRITI" text below
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${size * 0.1}px Arial`
  ctx.fillText('SRITI', size / 2, size * 0.78)

  return canvas.toBuffer('image/png')
}

const iconsDir = path.join(__dirname, '../public/icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generateIcon(192))
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generateIcon(512))

console.log('Icons generated: icon-192.png, icon-512.png')
