import { z } from 'zod';

export const FourFTypeSchema = z.enum(['fact', 'feeling', 'finding', 'future']);

export const CourseConfidenceSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const FourFConfidenceSchema = z.object({
  type: FourFTypeSchema,
  confidence: z.number().min(0).max(1),
});

export const JournalFragmentAnalysisSchema = z.object({
  text: z.string().min(1),
  courses: z.array(CourseConfidenceSchema).min(1),
  four_f: z.array(FourFConfidenceSchema).min(1),
  insight: z.string().nullable(),
  future_item: z.string().nullable(),
});

export const AiOutputContractSchema = z.object({
  journal_summary: z.string(),
  fragments: z.array(JournalFragmentAnalysisSchema),
});

export type CourseConfidence = z.infer<typeof CourseConfidenceSchema>;
export type FourFConfidence = z.infer<typeof FourFConfidenceSchema>;
export type JournalFragmentAnalysis = z.infer<typeof JournalFragmentAnalysisSchema>;
export type AiOutputContract = z.infer<typeof AiOutputContractSchema>;

/**
 * JSON-schema shape used to request structured output from both the
 * Anthropic (tool-use) and OpenAI (response_format=json_schema) providers.
 * Kept as a plain object (not generated from the zod schema) so the two
 * SDKs' slightly different structured-output requirements are easy to
 * satisfy without fighting a generator.
 */
export function buildAnalysisJsonSchema(courseNames: string[]) {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['journal_summary', 'fragments'],
    properties: {
      journal_summary: { type: 'string' },
      fragments: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['text', 'courses', 'four_f', 'insight', 'future_item'],
          properties: {
            text: { type: 'string' },
            courses: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'confidence'],
                properties: {
                  name: { type: 'string', enum: [...courseNames, '기타'] },
                  confidence: { type: 'number' },
                },
              },
            },
            four_f: {
              type: 'array',
              minItems: 1,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['type', 'confidence'],
                properties: {
                  type: { type: 'string', enum: ['fact', 'feeling', 'finding', 'future'] },
                  confidence: { type: 'number' },
                },
              },
            },
            insight: { type: ['string', 'null'] },
            future_item: { type: ['string', 'null'] },
          },
        },
      },
    },
  } as const;
}
