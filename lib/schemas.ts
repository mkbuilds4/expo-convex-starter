import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().min(1, 'Enter a title').max(200, 'Title too long').transform((s) => s.trim()),
});

export type TaskFormData = z.infer<typeof taskSchema>;
