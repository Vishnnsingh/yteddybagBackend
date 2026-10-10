import path from 'path';
import fs from 'fs';
import multer from 'multer';
import env from '../config/env';
import AppError from '../utils/AppError';

const uploadDir = path.join(__dirname, '../../', env.UPLOAD_DIR);
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: env.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|pdf/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (!allowed.test(ext)) {
      return cb(new AppError('Only images and PDF files are allowed', 400));
    }
    return cb(null, true);
  },
});

export default upload;
