import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import s3Client from '../config/cloudflare';
import env from '../config/env';
import path from 'path';

export const uploadToR2 = async (file: Express.Multer.File, folder: string = 'banners') => {
  const ext = path.extname(file.originalname) || '.jpg';
  const rawBase = path.basename(file.originalname, ext)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .slice(0, 40);
  const cleanBase = rawBase || 'banner';
  const uniqueName = `${folder}/${cleanBase}-${Date.now()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: env.CF_R2_BUCKET_NAME || 'kavion-exampaper',
    Key: uniqueName,
    Body: file.buffer,
    ContentType: file.mimetype || 'image/jpeg',
  });

  await s3Client.send(command);

  return `${env.CF_R2_PUBLIC_URL}/${uniqueName}`;
};

export const deleteFromR2 = async (fileUrl: string) => {
  try {
    if (!fileUrl) return false;
    const publicUrl = env.CF_R2_PUBLIC_URL;
    if (!fileUrl.startsWith(publicUrl)) return false;

    const key = fileUrl.replace(`${publicUrl}/`, '');
    if (!key) return false;

    const command = new DeleteObjectCommand({
      Bucket: env.CF_R2_BUCKET_NAME || 'kavion-exampaper',
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (err: any) {
    console.warn('[Cloudflare R2] Delete object error:', err?.message || err);
    return false;
  }
};
