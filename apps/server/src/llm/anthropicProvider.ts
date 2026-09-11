import Anthropic from '@anthropic-ai/sdk';
import { AiOutputContractSchema, buildAnalysisJsonSchema, type AiOutputContract } from '@phi-brain/shared';
import type { CourseRef, LlmProvider } from './types';
import { LlmProviderError } from './types';
import { buildSystemPrompt, buildUserPrompt } from './prompt';

const TOOL_NAME = 'record_analysis';

export function createAnthropicProvider(apiKey: string, model = 'claude-sonnet-5'): LlmProvider {
  const client = new Anthropic({ apiKey });

  return {
    id: 'anthropic',
    async analyzeJournal(rawText: string, courses: CourseRef[]): Promise<AiOutputContract> {
      const schema = buildAnalysisJsonSchema(courses.map((c) => c.name));

      let response;
      try {
        response = await client.messages.create({
          model,
          max_tokens: 4096,
          system: buildSystemPrompt(courses),
          messages: [{ role: 'user', content: buildUserPrompt(rawText) }],
          tools: [
            {
              name: TOOL_NAME,
              description: '저널 분석 결과를 구조화된 형태로 기록합니다.',
              input_schema: schema as unknown as Anthropic.Tool.InputSchema,
            },
          ],
          tool_choice: { type: 'tool', name: TOOL_NAME },
        });
      } catch (err) {
        const status = (err as { status?: number }).status;
        const retryable = status === 429 || (typeof status === 'number' && status >= 500);
        throw new LlmProviderError(`Anthropic API 호출 실패: ${(err as Error).message}`, 'anthropic', retryable, err);
      }

      const toolUse = response.content.find((block) => block.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new LlmProviderError('Anthropic 응답에서 구조화된 결과를 찾을 수 없습니다.', 'anthropic', false);
      }

      const parsed = AiOutputContractSchema.safeParse(toolUse.input);
      if (!parsed.success) {
        throw new LlmProviderError(
          `Anthropic 응답이 예상 스키마와 다릅니다: ${parsed.error.message}`,
          'anthropic',
          false,
          toolUse.input,
        );
      }
      return parsed.data;
    },
  };
}
