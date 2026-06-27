import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'reviews',
    timestamp: new Date().toISOString(),
  });
});

export default router;
