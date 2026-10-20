import { Router } from 'express';
import { HttpError } from '../errors.js';
import { parseId } from '../middlewares/params.js';
import { validate, validateQuery } from '../middlewares/validate.js';
import { teamRepository } from './team.repository.js';
import { TeamPatchSchema, TeamQuerySchema, TeamSchema, type TeamInput, type TeamQuery } from './team.schema.js';

export const teamRouter = Router();

teamRouter.get('/', validateQuery(TeamQuerySchema), async (_req, res) => {
  const { country } = res.locals.query as TeamQuery;
  res.json(await teamRepository.findByCountry(country));
});

teamRouter.get('/:id', async (req, res) => {
  const team = await teamRepository.findOneWithPlayers(parseId(req.params.id, 'Team'));
  if (!team) throw new HttpError(404, 'Team not found');
  res.json(team);
});

teamRouter.post('/', validate(TeamSchema), async (req, res) => {
  const team = await teamRepository.insert(req.body as TeamInput);
  res.status(201).location(`/api/teams/${team.id}`).json(team);
});

teamRouter.patch('/:id', validate(TeamPatchSchema), async (req, res) => {
  const team = await teamRepository.update(parseId(req.params.id, 'Team'), req.body);
  if (!team) throw new HttpError(404, 'Team not found');
  res.json(team);
});

teamRouter.delete('/:id', async (req, res) => {
  const deleted = await teamRepository.delete(parseId(req.params.id, 'Team'));
  if (!deleted) throw new HttpError(404, 'Team not found');
  res.sendStatus(204);
});
