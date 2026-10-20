import type { Team } from "./team.schema.js";
import { BaseRepository } from "../repository.js";
import { query } from "../db.js";
import type { TeamWithPlayers } from './team.schema.js';
import { playeurRepository } from '../playeurs/playeur.repository.js';

class TeamRepository extends BaseRepository<Team> {
  constructor() {
    super('team', ['id', 'name', 'tag', 'country'], 'name');
  }

  findByCountry(country?: string): Promise<Team[]> {
    if (!country) { return query<Team>(`${this.select} ORDER BY name`) }
    return query<Team>(
      `SELECT id, name, tag, country
         FROM team
        WHERE country = $1
        ORDER BY name`,
      [country],
    );
  }

  async findOneWithPlayers(id: number): Promise<TeamWithPlayers | null> {
    const team = await this.findOne(id);
    if (!team) return null;
    const players = await playeurRepository.findByTeam(team.id);
    return { ...team, players };
  }
}

export const teamRepository = new TeamRepository();