import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    module: 'search',
    timestamp: new Date().toISOString(),
  });
});

export default router;
