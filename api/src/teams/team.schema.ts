import { z } from 'zod';
import type { PlayeurSummary } from '../playeurs/playeur.schema.js';

export interface Team {
  id: number;
  name: string;
  tag: string;
  country: string;
}

export const TeamQuerySchema = z.object({
  country: z
    .string()
    .regex(/^[A-Za-z]{2}$/)
    .transform((s) => s.toUpperCase())
    .optional(),
});

export const TeamSchema = z.object({
  tag: z.string().regex(/^[A-Z0-9]{2,5}$/),
  country: z.string().regex(/^[A-Z]{2}$/),
  name: z.string().min(2).max(50),
});

export interface TeamWithPlayers extends Team {
  players: PlayeurSummary[];
}


export const TeamPatchSchema = TeamSchema.partial();

export type TeamQuery = z.infer<typeof TeamQuerySchema>;
export type TeamInput = z.infer<typeof TeamSchema>;