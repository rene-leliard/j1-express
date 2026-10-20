# J1 · TP — `Match`, les routes métier, OpenAPI

> Seul, entraide autorisée.
> Paliers : 🟢 indispensable · 🔵 attendu, avec des indices · 🔴 pour aller plus loin.
> Antisèches : [TypeScript](cheatsheets/typescript.md) · [Express](cheatsheets/express.md) · [pg et zod](cheatsheets/pg-zod.md) · [OpenAPI](cheatsheets/openapi.md) · [HTTP et REST](cheatsheets/http-rest.md)

Ce matin, on a construit ensemble. Cet après-midi, on vous donne la **cible** : le fichier de test, la forme des
réponses, les règles. À vous de retrouver les fichiers, les requêtes et les codes, avec les antisèches, le TD de
ce matin et Swagger UI. L'enseignant est là pour les questions, pas pour dicter.

Trois parties. D'abord une ressource **neuve**, `Match`, avec une table à créer, des règles métier et une action
qui n'est pas du CRUD. Ensuite deux routes métier qui réutilisent ce que vous avez : un match simulé entre deux
équipes, et le classement des joueurs. Enfin la **documentation** : `openapi.yaml` doit décrire tout ce que vous
avez écrit aujourd'hui, c'est un livrable du partiel.

**Ce que vous devez avoir ce soir**

- `make test` vert pour `04`, `05` et `06` ; `make test f=07` si vous êtes allé au bonus ;
- dans `docs/mon-tp.md` : les réponses aux questions posées en chemin, et trois lignes de bilan ;
- un commit par étape, poussé sur votre fork.

**Les étapes**

|     | Étape                                                           | Test             |
| --- | --------------------------------------------------------------- | ---------------- |
| 🟢  | 1.1 La table `match` et la ressource en lecture / écriture      |                  |
| 🟢  | 1.2 Les règles et le filtre `?status=`                          |                  |
| 🔵  | 1.3 Jouer un match : `POST /api/matches/{id}/play`              | `04-matches`     |
| 🔵  | 2.1 Un match simulé : `GET /api/teams/{id}/versus/{opponentId}` |                  |
| 🔵  | 2.2 Le classement : `GET /api/players/top`                      | `05-versus-top`  |
| 🔵  | 3. Le contrat OpenAPI                                           | `06-openapi`     |
| 🔴  | 4. Bonus : `X-Response-Time` et `/stats`                        | `bonus-07-stats` |

**Avant chaque étape, lisez le fichier de test.** Il dit exactement ce qu'on attend. Les énoncés ci-dessous
disent le _pourquoi_ et donnent des _indices_ ; le _quoi_ précis est dans le test.

---

## Partie 1 — `Match`, une ressource neuve

### 1.1 🟢 La table, et la ressource en lecture / écriture

Lisez `tests/04-matches.hurl` jusqu'au premier `POST …/play`. Un match, c'est deux équipes, et plus tard un score,
un gagnant et une date. Sa représentation :

```json
{ "id": 7, "status": "scheduled", "teamA": { "id": 1, "name": "…", "tag": "NUL" }, "teamB": { … },
  "score": null, "winner": null, "playedAt": null }
```

**La table.** Ajoutez-la à `api/db/schema.sql`, puis `make db-reset` (la base de test est recréée à chaque
`make test`, la base de dev par cette commande). Voici le modèle ; comprenez chaque ligne avant de la copier :

```sql
CREATE TABLE match (
  id        SERIAL PRIMARY KEY,
  team_a_id INTEGER NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  team_b_id INTEGER NOT NULL REFERENCES team (id) ON DELETE CASCADE,
  score_a   INTEGER,
  score_b   INTEGER,
  winner_id INTEGER REFERENCES team (id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ,
  CHECK (team_a_id <> team_b_id)
);
```

> Pourquoi `ON DELETE CASCADE` ici et `SET NULL` pour les joueurs ? Notez votre réponse dans `mon-tp.md`.

**La ressource.** Trois fichiers dans `src/matches/` (le dossier existe : il contient déjà `simulator.ts`), sur
le modèle de `Player` ce matin : une `interface Match` pour la **ligne** (`teamAId`, `scoreA`, `winnerId`,
`playedAt`…), une `interface MatchView` pour la **vue** ci-dessus, un `MatchSchema` (`teamAId`, `teamBId`
entiers positifs), un repository avec une constante `VIEW` et un routeur. Routes : `GET /`, `GET /:id`,
`POST /` (201 + `Location`), `DELETE /:id`. Montez-le dans `app.ts`.

Indices pour la vue :

- `status` se déduit de `played_at` : `CASE WHEN m.played_at IS NULL THEN 'scheduled' ELSE 'played' END` ;
- deux jointures sur `team` (une par équipe), `json_build_object` pour chacune ; une troisième, en `LEFT JOIN`,
  pour le tag du gagnant ;
- `score` est un tableau JSON ou `null` : `json_build_array(m.score_a, m.score_b)`, dans un `CASE` ;
- les alias avec une majuscule prennent des guillemets : `AS "teamA"`.

### 1.2 🟢 Les règles et le filtre

Toujours dans `04-matches.hurl` : une équipe ne joue pas contre elle-même (422 sur `teamBId`), une équipe
inconnue donne 422 sur le champ en cause, et `GET /api/matches?status=scheduled|played` filtre (400 sinon).

- Même équipe des deux côtés : la table le refuse (`CHECK`), mais le message serait obscur. Faites-le dans le
  schéma zod : `.refine((m) => m.teamAId !== m.teamBId, { path: ['teamBId'], message: '…' })`.
- Équipe inconnue : qui le détecte déjà, et avec quel `path` ? Vérifiez dans `src/db.ts`. Si le `path` renvoyé
  n'est pas celui attendu par le test, regardez comment `fieldOf` le calcule.
- Le filtre : un `MatchQuerySchema` avec `z.enum([...])`, et `findByStatus(status?)` dans le repository
  (`played_at IS NULL` ou `IS NOT NULL`).

### 1.3 🔵 Jouer un match : `POST /api/matches/{id}/play`

La fin de `04-matches.hurl`. Jouer un match, c'est appeler le simulateur **fourni** (`src/matches/simulator.ts`,
lisez son en-tête : `simulate(teamA, teamB, seed?)` attend deux équipes avec leur niveau moyen, `rating`), puis
**enregistrer** le résultat : `score_a`, `score_b`, `winner_id`, `played_at = now()`.

Dans l'ordre, dans le handler :

1. le match existe (404) ;
2. il n'est pas déjà joué (409, `HttpError(409, 'Match already played')`) ;
3. chaque équipe a un niveau : écrivez `ratingOf(teamId)` dans `TeamRepository`
   (`SELECT round(avg(rating))::int AS rating FROM player WHERE team_id = $1`, `null` si aucun joueur) ; sans
   joueur → 422 sur `teamAId` ou `teamBId` ;
4. `simulate(...)`, avec `?seed=` facultatif (un `SeedQuerySchema` avec `z.coerce.number().int().optional()`) ;
5. `recordResult(id, result)` dans le repository : un `UPDATE … WHERE id = $1 AND played_at IS NULL RETURNING
id` (pourquoi `AND played_at IS NULL` ? indice : deux requêtes en même temps) ;
6. répondre avec la vue relue.

> Question pour `mon-tp.md` : `winner` est un tag dans `MatchResult` mais un `winner_id` dans la table. Où
> faites-vous la conversion, et pourquoi là ?

```bash
make test f=04
```

Commit : `TP 1 : Match`.

---

## Partie 2 — Deux routes métier

### 2.1 🔵 Un match simulé : `GET /api/teams/{id}/versus/{opponentId}`

La première moitié de `tests/05-versus-top.hurl`. La même simulation que `play`, mais **rien n'est enregistré**
et la réponse est le `MatchResult` du simulateur tel quel (avec `rounds` et les `rating`). Même liste de
vérifications que `play` (404, 422 `opponentId` si même équipe, 422 `id` / `opponentId` si pas de joueur,
`?seed=`), dans `team.router.ts`. Deux paramètres de chemin : `req.params.id` et `req.params.opponentId`,
chacun passé par `parseId`.

### 2.2 🔵 Le classement : `GET /api/players/top`

La seconde moitié du test. `?limit=` (1 à 50, 10 par défaut) et `?country=` (insensible à la casse), tri par
`rating` décroissant, même représentation que `GET /api/players/:id`.

Deux pièges :

- `/top` doit être déclarée **avant** `/:id` dans `player.router.ts`, sinon « top » est pris pour un
  identifiant. Faites-le exprès dans le mauvais ordre une fois, pour voir la 404 ;
- un filtre optionnel dans une seule requête SQL : `WHERE $1::text IS NULL OR p.country = $1`, avec
  `country ?? null` dans les valeurs.

```bash
make test f=05
```

Commit : `TP 2 : versus et top`.

---

## Partie 3 — 🔵 Le contrat OpenAPI → `06-openapi.hurl`

`api/openapi.yaml` décrit `Game` en entier : chemins, paramètres, corps, réponses (y compris les erreurs),
schémas `Game` / `GameInput` / `GamePatch`, réponses réutilisables. Faites la même chose pour `Team`, `Player`
et `Match`. Le test vérifie la présence des chemins, des schémas et des réponses d'erreur ; Swagger UI
(http://localhost:8000/api/docs) vous montre le résultat à chaque rechargement de la page, sans redémarrage.

Par où commencer :

1. `/api/teams` et `/api/teams/{id}` : copiez le bloc de `Game`, renommez, ajoutez le paramètre `country` et le
   schéma `Team` avec son tableau `players` (un schéma `PlayerSummary` à part, pour le réutiliser) ;
2. `/api/players` : les cinq paramètres de recherche, l'en-tête `X-Total-Count` dans la réponse 200, `Player`
   avec `team` qui peut être `null` (en 3.1 : `type: [object, 'null']` ou `oneOf`), `PlayerInput` avec
   `birthDate` et `teamId` ; `/api/players/top` **avant** `/api/players/{id}` (ici l'ordre n'a pas d'importance
   technique, mais c'est plus lisible) ;
3. `/api/matches`, `/api/matches/{id}`, `/api/matches/{id}/play` avec ses réponses 200, 404, 409, 422 ;
   `/api/teams/{id}/versus/{opponentId}` ;
4. une erreur par étape : `curl -s localhost:8000/api/openapi.json | jq '.paths | keys'`, et le YAML cassé se voit
   dans `make logs`.

> Question pour `mon-tp.md` : trouvez une règle que votre code applique et que votre `openapi.yaml` ne dit pas
> (ou l'inverse). Que faudrait-il pour que les deux ne divergent jamais ?

```bash
make test f=06
make test        # 00 à 06 verts
```

Commit : `TP 3 : OpenAPI`.

---

## Partie 4 — 🔴 Bonus → `bonus-07-stats.hurl` (`make test f=07`)

1. **`X-Response-Time`** sur toutes les réponses, posé par votre `requestLogger`. Piège : dans `finish`, la
   réponse est partie, il est trop tard pour un en-tête. Il faut le poser juste avant l'envoi des en-têtes :
   intercepter `res.writeHead` (le remplacer par une fonction qui pose l'en-tête puis appelle l'original).
2. **`GET /api/teams/{id}/stats`** → `{ played, won, lost, averageRating }` : une seule requête avec
   `count(*) FILTER (WHERE …)` pour les trois compteurs, et `ratingOf` pour la moyenne (`null` sans joueur).

Commit : `bonus`.

---

## Bilan (`docs/mon-tp.md`)

Vos réponses aux questions, et trois lignes :

- ce que vous avez écrit aujourd'hui que Symfony faisait hier à votre place ;
- la brique dont vous comprenez mieux le rôle maintenant que vous l'avez branchée vous-même ;
- ce que vous documenteriez en premier dans `openapi.yaml` si vous n'aviez qu'une heure.

Puis `make test`, commit, push.
