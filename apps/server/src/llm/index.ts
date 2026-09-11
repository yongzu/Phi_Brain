import type { AiOutputContract } from '@phi-brain/shared';
import type { CourseRef, LlmProvider } from './types';
import { LlmProviderError } from './types';
import { createAnthropicProvider } from './anthropicProvider';
import { createOpenAiProvider } from './openaiProvider';
import { createMockProvider } from './mockProvider';

export { LlmProviderError };
export type { LlmProvider, CourseRef };

function buildProvider(id: string): LlmProvider | null {
  switch (id) {
    case 'anthropic': {
      const key = process.env.ANTHROPIC_API_KEY;
      return key ? createAnthropicProvider(key, process.env.ANTHROPIC_MODEL) : null;
    }
    case 'openai': {
      const key = process.env.OPENAI_API_KEY;
      return key ? createOpenAiProvider(key, process.env.OPENAI_MODEL) : null;
    }
    case 'mock':
      return createMockProvider();
    default:
      return null;
  }
}

/**
 * Returns a provider that calls the primary provider and, only on a
 * retryable error (rate limit / quota / 5xx), falls back once to the
 * fallback provider. A missing API key for a provider is treated as "not
 * configured", not a crash — resolved lazily so the server can boot before
 * any keys exist.
 */
export function getLlmProvider(): LlmProvider {
  const primaryId = process.env.LLM_PROVIDER || 'mock';
  const fallbackId = process.env.LLM_FALLBACK_PROVIDER;

  return {
    id: `${primaryId}${fallbackId ? `+${fallbackId}` : ''}`,
    async analyzeJournal(rawText: string, courses: CourseRef[]): Promise<AiOutputContract> {
      const primary = buildProvider(primaryId);
      if (!primary) {
        throw new LlmProviderError(
          `LLM_PROVIDER="${primaryId}"가 설정되었지만 해당 API 키가 없습니다. .env를 확인하세요.`,
          primaryId,
          false,
        );
      }

      try {
        return await primary.analyzeJournal(rawText, courses);
      } catch (err) {
        const isRetryable = err instanceof LlmProviderError && err.retryable;
        const fallback = fallbackId ? buildProvider(fallbackId) : null;
        if (!isRetryable || !fallback) throw err;
        return fallback.analyzeJournal(rawText, courses);
      }
    },
  };
}
