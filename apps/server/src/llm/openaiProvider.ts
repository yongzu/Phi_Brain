import OpenAI from 'openai';
import { AiOutputContractSchema, buildAnalysisJsonSchema, type AiOutputContract } from '@phi-brain/shared';
import type { CourseRef, LlmProvider } from './types';
import { LlmProviderError } from './types';
import { buildSystemPrompt, buildUserPrompt } from './prompt';

export function createOpenAiProvider(apiKey: string, model = 'gpt-4.1'): LlmProvider {
  const client = new OpenAI({ apiKey });

  return {
    id: 'openai',
    async analyzeJournal(rawText: string, courses: CourseRef[]): Promise<AiOutputContract> {
      const schema = buildAnalysisJsonSchema(courses.map((c) => c.name));

      let response;
      try {
        response = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: buildSystemPrompt(courses) },
            { role: 'user', content: buildUserPrompt(rawText) },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'journal_analysis',
              strict: true,
              schema,
            },
          },
        });
      } catch (err) {
        const status = (err as { status?: number }).status;
        const retryable = status === 429 || (typeof status === 'number' && status >= 500);
        throw new LlmProviderError(`OpenAI API 호출 실패: ${(err as Error).message}`, 'openai', retryable, err);
      }

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new LlmProviderError('OpenAI 응답에 내용이 없습니다.', 'openai', false);
      }

      let json: unknown;
      try {
        json = JSON.parse(content);
      } catch (err) {
        throw new LlmProviderError('OpenAI 응답을 JSON으로 파싱할 수 없습니다.', 'openai', false, content);
      }

      const parsed = AiOutputContractSchema.safeParse(json);
      if (!parsed.success) {
        throw new LlmProviderError(
          `OpenAI 응답이 예상 스키마와 다릅니다: ${parsed.error.message}`,
          'openai',
          false,
          json,
        );
      }
      return parsed.data;
    },
  };
}
