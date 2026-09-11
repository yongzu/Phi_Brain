import { Router } from 'express';
import { prisma } from '../prisma';

export const coursesRouter = Router();

coursesRouter.get('/', async (_req, res) => {
  const courses = await prisma.course.findMany({ orderBy: { createdAt: 'asc' } });
  res.json(courses);
});

coursesRouter.post('/', async (req, res) => {
  const { code, name, description } = req.body ?? {};
  if (!code || !name) {
    return res.status(400).json({ error: 'code와 name은 필수입니다.' });
  }
  const course = await prisma.course.create({ data: { code, name, description: description ?? null } });
  res.status(201).json(course);
});

coursesRouter.patch('/:id', async (req, res) => {
  const { code, name, description, archived, agentInstruction } = req.body ?? {};
  const course = await prisma.course.update({
    where: { id: req.params.id },
    data: { code, name, description, archived, agentInstruction },
  });
  res.json(course);
});

coursesRouter.delete('/:id', async (req, res) => {
  await prisma.course.delete({ where: { id: req.params.id } });
  res.status(204).end();
});

coursesRouter.get('/:id/archive', async (req, res) => {
  const courseId = req.params.id;

  const [fragments, insights, futureItems] = await Promise.all([
    prisma.journalFragment.findMany({
      where: { courses: { some: { courseId } } },
      include: { journal: true, fourF: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.insight.findMany({ where: { courseId }, orderBy: { createdAt: 'desc' } }),
    prisma.futureItem.findMany({ where: { courseId }, orderBy: { createdAt: 'desc' } }),
  ]);

  res.json({ fragments, insights, futureItems });
});
