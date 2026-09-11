import { Router } from 'express';
import { prisma } from '../prisma';

export const fragmentsRouter = Router();

// Replace this fragment's course assignments with a user-corrected set.
// body: { courseIds: string[] }
fragmentsRouter.patch('/:id/courses', async (req, res) => {
  const fragmentId = req.params.id;
  const { courseIds } = req.body ?? {};
  if (!Array.isArray(courseIds)) {
    return res.status(400).json({ error: 'courseIds 배열이 필요합니다.' });
  }

  await prisma.$transaction([
    prisma.fragmentCourse.deleteMany({ where: { fragmentId } }),
    prisma.fragmentCourse.createMany({
      data: courseIds.map((courseId: string) => ({
        fragmentId,
        courseId,
        confidence: 1,
        source: 'user',
        userCorrected: true,
      })),
    }),
  ]);

  const updated = await prisma.journalFragment.findUnique({
    where: { id: fragmentId },
    include: { courses: { include: { course: true } } },
  });
  res.json(updated);
});

// Replace this fragment's 4F classifications.
// body: { types: string[] }
fragmentsRouter.patch('/:id/four-f', async (req, res) => {
  const fragmentId = req.params.id;
  const { types } = req.body ?? {};
  if (!Array.isArray(types)) {
    return res.status(400).json({ error: 'types 배열이 필요합니다.' });
  }

  await prisma.$transaction([
    prisma.fourFClassification.deleteMany({ where: { fragmentId } }),
    prisma.fourFClassification.createMany({
      data: types.map((type: string) => ({ fragmentId, type, confidence: 1, source: 'user' })),
    }),
  ]);

  const updated = await prisma.journalFragment.findUnique({
    where: { id: fragmentId },
    include: { fourF: true },
  });
  res.json(updated);
});
