import { Router } from 'express';
import { HttpError } from '../errors.js';
import { parseId } from '../middlewares/params.js';
import { playeurRepository } from './playeur.repository.js';
import { validate } from '../middlewares/validate.js';
import {
    PlayeurPatchSchema,
    PlayeurSchema,
    type PlayeurInput,
    type PlayeurPatch,
} from './playeur.schema.js';
export const playeurRouter = Router();

playeurRouter.get('/', async (_req, res) => {
    res.json(await playeurRepository.findViews());
});

playeurRouter.get('/:id', async (req, res) => {
    const player = await playeurRepository.findView(
        parseId(req.params.id, 'Player'),
    );

    if (!player) throw new HttpError(404, 'Player not found');
    res.json(player);
});

playeurRouter.post('/', validate(PlayeurSchema), async (req, res) => {
    const player = await playeurRepository.insert(req.body as PlayeurInput);
    const view = await playeurRepository.findView(player.id);
    res.status(201).location(`/api/players/${player.id}`).json(view);
});

playeurRouter.patch('/:id', validate(PlayeurPatchSchema), async (req, res) => {
    const id = parseId(req.params.id, 'Player');
    const player = await playeurRepository.update(id, req.body as PlayeurPatch);
    if (!player) throw new HttpError(404, 'Player not found');
    res.json(await playeurRepository.findView(id));
});

playeurRouter.delete('/:id', async (req, res) => {
    const deleted = await playeurRepository.delete(parseId(req.params.id, 'Player'));
    if (!deleted) throw new HttpError(404, 'Player not found');
    res.sendStatus(204);
});
