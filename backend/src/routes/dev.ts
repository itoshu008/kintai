// backend/src/routes/dev.ts
import { Router, type Request, type Response, type NextFunction } from 'express';
import 'dotenv/config';

const router = Router();

// ON/OFF とトークン保護（本番は OFF 推奨）
const DEV_ENABLED = process.env.DEV_API_ENABLED === 'true';
const DEV_TOKEN   = process.env.DEV_TOKEN || '';

router.use((req: Request, res: Response, next: NextFunction) => {
  if (!DEV_ENABLED) return res.status(404).json({ error: 'Not Found' });
  const token = req.header('x-dev-token');
  if (DEV_TOKEN && token !== DEV_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
});

router.get('/ping', (_req, res) => res.json({ pong: true, at: new Date().toISOString() }));
router.post('/echo', (req, res) => res.json({ youSent: req.body }));

export default router;
