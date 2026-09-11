import type { AiOutputContract } from '@phi-brain/shared';

export interface CourseRef {
  name: string;
  code: string;
  description?: string | null;
}

export interface LlmProvider {
  readonly id: string;
  analyzeJournal(rawText: string, courses: CourseRef[]): Promise<AiOutputContract>;
}

export class LlmProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: string,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'LlmProviderError';
  }
}
