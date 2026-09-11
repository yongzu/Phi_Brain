import { Router } from 'express';
import { FUTURE_ITEM_STATUSES } from '@phi-brain/shared';
import { prisma } from '../prisma';

export const futureItemsRouter = Router();

futureItemsRouter.get('/', async (req, res) => {
  const status = req.query.status as string | undefined;
  const items = await prisma.futureItem.findMany({
    where: status ? { status } : undefined,
    include: { course: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(items);
});

futureItemsRouter.patch('/:id', async (req, res) => {
  const { status, dueDate } = req.body ?? {};
  if (status && !FUTURE_ITEM_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status는 ${FUTURE_ITEM_STATUSES.join(', ')} 중 하나여야 합니다.` });
  }
  const item = await prisma.futureItem.update({
    where: { id: req.params.id },
    data: {
      status,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      appliedAt: status === 'applied' ? new Date() : undefined,
    },
  });
  res.json(item);
});
