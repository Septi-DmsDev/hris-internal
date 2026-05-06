import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Username, email, atau no. telepon wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;
