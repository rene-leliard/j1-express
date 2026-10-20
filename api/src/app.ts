// Création de l'application Express et ORDRE des middlewares : l'ordre des app.use() est l'ordre
// d'exécution. Le serveur (app.listen) est dans server.ts, pour pouvoir importer l'app sans ouvrir de port.
import express from 'express';
import { docsRouter } from './docs.router.js';
import { gameRouter } from './games/game.router.js';
import { healthRouter } from './health.router.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';
import { requireJson } from './middlewares/requireJson.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { teamRouter } from './teams/team.router.js';
import { playeurRouter } from './playeurs/playeur.rooter.js';

const app = express();

app.use(requestLogger); // log de toutes les requêtes, avant tout autre middleware

// 1. Lire les corps JSON dans req.body (sinon req.body vaut undefined). JSON illisible → erreur 400.
app.use(express.json());
// 2. Une écriture sans Content-Type: application/json → 415, avant même d'atteindre une route.
app.use(requireJson);

// 3. Les routeurs : un par ressource, monté sous son préfixe.
app.use('/api/health', healthRouter);
app.use('/api', docsRouter); // /api/docs (Swagger UI) et /api/openapi.json
app.use('/api/games', gameRouter);
app.use('/api/teams', teamRouter);
app.use('/api/players', playeurRouter);

// 4. Aucune route n'a répondu → 404 en JSON.
app.use(notFound);
// 5. Toujours en dernier, 4 paramètres : transforme toute erreur en réponse JSON.
app.use(errorHandler);

export default app;
