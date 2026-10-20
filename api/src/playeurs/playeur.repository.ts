import { BaseRepository } from "../repository.js";
import { query } from "../db.js";
import type {
    Playeur,
    PlayeurView,
    PlayeurSummary,
} from './playeur.schema.js';

const VIEW = `
  SELECT p.id, p.nickname, p.country, p.role, p.rating,
         CASE WHEN t.id IS NULL THEN NULL
              ELSE json_build_object(
                'id', t.id,
                'name', t.name,
                'tag', t.tag
              )
         END AS team
    FROM player p
    LEFT JOIN team t ON t.id = p.team_id
`;

class PlayeurRepository extends BaseRepository<Playeur> {
    constructor() {
        super('player', [
            'id',
            'nickname',
            'country',
            'role',
            'rating',
            'birth_date AS "birthDate"',
            'team_id AS "teamId"',
        ], 'nickname');
    }

    async findView(id: number): Promise<PlayeurView | null> {
        const [player] = await query<PlayeurView>(
            `${VIEW} WHERE p.id = $1`,
            [id],
        );
        return player ?? null;
    }

    findViews(): Promise<PlayeurView[]> {
        return query<PlayeurView>(`${VIEW} ORDER BY p.nickname`);
    }

    findByTeam(teamId: number): Promise<PlayeurSummary[]> {
        return query<PlayeurSummary>(
            `SELECT id, nickname, role, rating
       FROM player
      WHERE team_id = $1
      ORDER BY nickname`,
            [teamId],
        );
    }
}

export const playeurRepository = new PlayeurRepository();