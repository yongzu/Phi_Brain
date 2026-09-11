import type { AiOutputContract, FType } from '@phi-brain/shared';
import type { CourseRef, LlmProvider } from './types';

/**
 * Deterministic, no-API-key provider used for local development and the
 * verification flow before real Anthropic/OpenAI keys exist. Not meant to
 * be smart — just structurally valid and good enough to exercise the full
 * analyze -> review -> save -> archive pipeline.
 */
export function createMockProvider(): LlmProvider {
  return {
    id: 'mock',
    async analyzeJournal(rawText: string, courses: CourseRef[]): Promise<AiOutputContract> {
      const paragraphs = rawText
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

      const fragments = paragraphs.map((text) => {
        const firstLine = text.split('\n')[0].trim();
        const matched = courses.find(
          (c) => c.code.toLowerCase() === firstLine.toLowerCase() || c.name === firstLine,
        );
        const courseName = matched?.name ?? '기타';
        const body = matched ? text.split('\n').slice(1).join('\n').trim() || text : text;

        const fourF: FType = /느꼈|인상깊|충격|놀랐/.test(body)
          ? 'feeling'
          : /통찰|깨달았|정리하자면|의미는/.test(body)
            ? 'finding'
            : /다음에|해볼가|할 것이다|계획이다/.test(body)
              ? 'future'
              : 'fact';

        return {
          text: body,
          courses: [{ name: courseName, confidence: matched ? 0.95 : 0.4 }],
          four_f: [{ type: fourF, confidence: 0.7 }],
          insight: fourF === 'finding' ? body.slice(0, 80) : null,
          future_item: fourF === 'future' ? body.slice(0, 120) : null,
        };
      });

      return {
        journal_summary: `[mock] ${fragments.length}개 조각으로 분석되었습니다.`,
        fragments,
      };
    },
  };
}
