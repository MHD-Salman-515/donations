import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(options, (error, result) => {
        if (error) reject(error)
        else resolve(result)
      })
      .end(buffer)
  })
}

export function uploadDataUri(dataUri, options = {}) {
  return cloudinary.uploader.upload(dataUri, options)
}

export default cloudinary
