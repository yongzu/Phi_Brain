import { Router } from 'express';
import { GENERAL_COURSE_CODE, type AiOutputContract } from '@phi-brain/shared';
import { prisma } from '../prisma';
import { getLlmProvider, LlmProviderError } from '../llm';

export const journalsRouter = Router();

journalsRouter.get('/', async (req, res) => {
  const date = req.query.date as string | undefined;
  if (!date) return res.status(400).json({ error: 'date 쿼리 파라미터가 필요합니다.' });

  const journal = await prisma.journal.findFirst({
    where: { date },
    include: {
      fragments: { include: { courses: { include: { course: true } }, fourF: true, insights: true, futureItems: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(journal);
});

journalsRouter.post('/analyze', async (req, res) => {
  const { rawText } = req.body ?? {};
  if (!rawText || typeof rawText !== 'string') {
    return res.status(400).json({ error: 'rawText가 필요합니다.' });
  }

  const courses = await prisma.course.findMany({ where: { archived: false } });
  if (courses.length === 0) {
    return res.status(400).json({ error: '등록된 과목이 없습니다. 먼저 과목을 시드/생성하세요.' });
  }

  try {
    const provider = getLlmProvider();
    const result: AiOutputContract = await provider.analyzeJournal(
      rawText,
      courses.map((c) => ({ name: c.name, code: c.code, description: c.description })),
    );
    res.json(result);
  } catch (err) {
    if (err instanceof LlmProviderError) {
      return res.status(err.retryable ? 503 : 502).json({
        error: err.message,
        providerId: err.providerId,
        detail: err.cause ?? null,
      });
    }
    console.error(err);
    res.status(500).json({ error: '분석 중 알 수 없는 오류가 발생했습니다.' });
  }
});

journalsRouter.post('/save', async (req, res) => {
  const { date, rawText, fragments } = req.body ?? {};
  if (!date || !rawText || !Array.isArray(fragments)) {
    return res.status(400).json({ error: 'date, rawText, fragments가 필요합니다.' });
  }

  const courses = await prisma.course.findMany();
  const courseByName = new Map(courses.map((c) => [c.name, c]));
  const generalCourse = courses.find((c) => c.code === GENERAL_COURSE_CODE);

  let cursor = 0;
  const journal = await prisma.$transaction(async (tx) => {
    const created = await tx.journal.create({ data: { date, rawText } });

    for (const frag of fragments) {
      const start = rawText.indexOf(frag.text, cursor);
      const startPosition = start >= 0 ? start : 0;
      const endPosition = startPosition + (frag.text?.length ?? 0);
      cursor = start >= 0 ? start + frag.text.length : cursor;

      const fragment = await tx.journalFragment.create({
        data: {
          journalId: created.id,
          rawText: frag.text,
          startPosition,
          endPosition,
        },
      });

      const courseEntries = (frag.courses ?? []) as Array<{ name: string; confidence: number }>;
      const resolvedCourses = courseEntries.length > 0 ? courseEntries : [{ name: '기타', confidence: 0 }];
      for (const cc of resolvedCourses) {
        const course = courseByName.get(cc.name) ?? generalCourse;
        if (!course) continue;
        await tx.fragmentCourse.upsert({
          where: { fragmentId_courseId: { fragmentId: fragment.id, courseId: course.id } },
          update: { confidence: cc.confidence, source: 'ai' },
          create: { fragmentId: fragment.id, courseId: course.id, confidence: cc.confidence, source: 'ai' },
        });
      }

      const fourFEntries = (frag.four_f ?? []) as Array<{ type: string; confidence: number }>;
      for (const ff of fourFEntries) {
        await tx.fourFClassification.upsert({
          where: { fragmentId_type: { fragmentId: fragment.id, type: ff.type } },
          update: { confidence: ff.confidence, source: 'ai' },
          create: { fragmentId: fragment.id, type: ff.type, confidence: ff.confidence, source: 'ai' },
        });
      }

      const primaryCourse = courseByName.get(resolvedCourses[0]?.name) ?? generalCourse;
      if (frag.insight && primaryCourse) {
        await tx.insight.create({
          data: { courseId: primaryCourse.id, fragmentId: fragment.id, content: frag.insight },
        });
      }
      if (frag.future_item && primaryCourse) {
        await tx.futureItem.create({
          data: { courseId: primaryCourse.id, fragmentId: fragment.id, content: frag.future_item },
        });
      }
    }

    return tx.journal.findUniqueOrThrow({
      where: { id: created.id },
      include: { fragments: { include: { courses: true, fourF: true, insights: true, futureItems: true } } },
    });
  });

  res.status(201).json(journal);
});
