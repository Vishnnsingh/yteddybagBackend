import { Router } from 'express';
import {
  loginWithEmail,
  getGoogleAuthUrl,
  googleCallback,
  refreshAccessToken,
  logout,
  getMe,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/login', loginWithEmail);
router.post('/refresh', refreshAccessToken);
router.post('/refresh-token', refreshAccessToken);
router.get('/google/url', getGoogleAuthUrl);
router.get('/google/callback', googleCallback);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

export default router;

