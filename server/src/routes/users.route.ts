import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { authenticateToken, requireRole } from '../middlewares/auth.middleware';
import { orgWhere } from '../middlewares/org.guard';

const router = Router();

// GET /users - list agents for assignment
router.get('/users', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  const role = req.query.role as string;
  try {
    const users = await prisma.user.findMany({
      where: {
        ...orgWhere(req),
        ...(role ? { role: role as 'ADMIN' | 'DRIVER' } : {})
      },
      select: { id: true, name: true, email: true, role: true }
    });
    res.json({ success: true, data: users });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
