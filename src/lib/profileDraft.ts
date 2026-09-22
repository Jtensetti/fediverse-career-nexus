import { z } from 'zod';

export const profileAppearanceSchema = z.object({
  fullname: z.string().trim().min(2).max(100),
  headline: z.string().trim().max(200),
  bio: z.string().max(5000),
  location: z.string().trim().max(120),
});
export type ProfileAppearance = z.infer<typeof profileAppearanceSchema>;
export type ProfileImages = { avatar?: File | null; header?: File | null };
export function validProfileImage(file: File): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size > 0 && file.size <= 10 * 1024 * 1024;
}
