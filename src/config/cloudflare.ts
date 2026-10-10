import { S3Client } from '@aws-sdk/client-s3';
import env from './env';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${env.CF_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.CF_R2_ACCESS_KEY_ID,
    secretAccessKey: env.CF_R2_SECRET_ACCESS_KEY,
  },
});

export default s3Client;
