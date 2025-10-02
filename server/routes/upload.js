import express from 'express'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'

const router = express.Router()

// Configure Cloudinary (env vars preferred; fallbacks kept for parity with current setup)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

// Multer in-memory storage
const storage = multer.memoryStorage()
const upload = multer({ storage })

// POST /api/upload
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' })

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: 'auto' }, (error, result) => {
          if (error) reject(error)
          else resolve(result)
        })
        .end(req.file.buffer)
    })

    res.json({ url: result.secure_url, public_id: result.public_id })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Failed to upload image' })
  }
})

export default router
