import { z } from 'zod';

export interface Playeur {
    id: number;
    nickname: string;
    country: string;
    role: string | null;
    rating: number;
    birthDate: Date | null;
    teamId: number | null;
}

export const PlayeurQuerySchema = z.object({
    country: z
        .string()
        .regex(/^[A-Za-z]{2}$/)
        .transform((s) => s.toUpperCase())
        .optional(),
});

export const PlayeurSchema = z.object({
    nickname: z.string().trim().min(2).max(30),
    country: z.string().regex(/^[A-Z]{2}$/),
    role: z.string().max(30).nullish(),
    rating: z.number().int().min(0).max(3000).optional(),
    birthDate: z.iso.date().refine((value) => {
        const today = new Date();

        const cutoff = [
            today.getFullYear() - 13,
            String(today.getMonth() + 1).padStart(2, '0'),
            String(today.getDate()).padStart(2, '0'),
        ].join('-');

        return value <= cutoff;
    }, {
        message: 'Le joueur doit avoir au moins 13 ans',
    }).transform((value) => new Date(`${value}T00:00:00Z`)).nullish(),
    teamId: z.number().int().positive().nullish(),
});

export interface PlayeurView {
    id: number;
    nickname: string;
    country: string;
    role: string | null;
    rating: number;
    team: {
        id: number;
        name: string;
        tag: string;
    } | null;
}

export interface PlayeurSummary {
    id: number;
    nickname: string;
    role: string | null;
    rating: number;
}

export const PlayeurPatchSchema = PlayeurSchema.partial();


export type PlayeurQuery = z.infer<typeof PlayeurQuerySchema>;
export type PlayeurInput = z.infer<typeof PlayeurSchema>;
export type PlayeurPatch = z.infer<typeof PlayeurPatchSchema>;
