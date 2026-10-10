import { z } from 'zod';

const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    LLM_PROVIDER: z.enum(['mock', 'anthropic']).default('mock'),
    ANTHROPIC_API_KEY: z
      .string()
      .optional()
      .transform((value) => (value ? value : undefined)),
    ANTHROPIC_MODEL: z.string().min(1).default('claude-haiku-4-5-20251001'),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    RATE_LIMIT_PER_MIN: z.coerce.number().int().positive().default(20),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    KNOWLEDGE_DIR: z.string().optional(),
    STREAM_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
    MOCK_TOKEN_DELAY_MS: z.coerce.number().int().min(0).default(25),
    MOCK_ANALYSIS_DELAY_MS: z.coerce.number().int().min(0).default(400),
  })
  .refine((env) => env.LLM_PROVIDER !== 'anthropic' || env.ANTHROPIC_API_KEY !== undefined, {
    message: 'ANTHROPIC_API_KEY is required when LLM_PROVIDER=anthropic',
    path: ['ANTHROPIC_API_KEY'],
  });

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${problems}`);
  }
  return result.data;
}
