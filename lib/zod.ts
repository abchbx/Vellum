import { z } from 'zod';

export const handleSchema = z
  .string()
  .min(3)
  .max(24)
  .regex(/^[a-z0-9_-]+$/, 'handle 只能包含小写字母、数字、下划线与连字符');

export const emailSchema = z.string().email();

export const passwordSchema = z.string().min(8).max(128);

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  handle: handleSchema,
  displayName: z.string().max(60).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const TAG_COLORS = [
  '#8A9A5B',
  '#C98A2E',
  '#3E7C6B',
  '#B4462A',
  '#6B675E',
  '#7A6FA8',
] as const;

export const statusEnum = z.enum(['seedling', 'budding', 'evergreen']);

export const noteCreateSchema = z.object({
  title: z.string().min(1).max(200),
  contentMd: z.string().max(200_000).optional().default(''),
  status: statusEnum.optional(),
  published: z.boolean().optional(),
  tagNames: z.array(z.string().max(30)).max(12).optional(),
});

export const noteUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  contentMd: z.string().max(200_000).optional(),
  status: statusEnum.optional(),
  published: z.boolean().optional(),
  tagNames: z.array(z.string().max(30)).max(12).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type NoteCreateInput = z.infer<typeof noteCreateSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateSchema>;
