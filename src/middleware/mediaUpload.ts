import path from 'path';
import fs from 'fs';
import multer from 'multer';
import env from '../config/env';
import AppError from '../utils/AppError';

const uploadDir = path.join(__dirname, '../../', env.UPLOAD_DIR, 'banners');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.memoryStorage();

// Multer instance supporting both images and videos up to 50MB
const mediaUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif|svg|mp4|webm|mov|m4v|ogg/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    const isMimeValid =
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/') ||
      allowed.test(ext);

    if (!isMimeValid) {
      return cb(new AppError('Only image (JPG, PNG, WebP, GIF) and video (MP4, WebM, MOV) files are allowed', 400));
    }
    return cb(null, true);
  },
});

export default mediaUpload;
