import { z } from 'zod';

export const emailSchema = z.string().trim().toLowerCase().email('Email inválido');

export const passwordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(72, 'La contraseña no puede superar los 72 caracteres')
  .regex(/[A-Za-z]/, 'Debe contener al menos una letra')
  .regex(/\d/, 'Debe contener al menos un número');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
export type LoginInput = z.infer<typeof loginSchema>;
