# NexBrain

**Des problématiques aux projets réalisables.** Cinq agents IA (Gemma 4) aident à passer de l'intuition
à une décision explicable : explorer → imaginer → analyser → estimer → décider.

> NexBrain aide à choisir une idée à tester ; il ne garantit pas sa réussite commerciale.

Équipe NERDS : Azizi Mehdi · Mouad Elharti · Aissa Houari · Ahmed Mohssine

## Démarrage rapide (Docker)

```bash
cp .env.example .env          # renseigner GEMINI_API_KEY, ou laisser AI_MOCK=true
docker compose up --build     # db + redis + migrations + worker + web
```

Puis ouvrir http://localhost:3000.

## Développement local

Prérequis : Node ≥ 20.9, PostgreSQL 16, Redis 7 (ou `docker compose up db redis`).

```bash
npm install                   # génère aussi le client Prisma
cp .env.example .env
npm run db:migrate            # applique les migrations
npm run db:seed               # (facultatif) démo « Béni Mellal » : demo@nexbrain.ma / nexbrain-demo
npm run dev                   # web sur :3000
npm run worker:dev            # worker des agents (autre terminal)
npm test                      # tests unitaires (scoring, estimation, validation)
NEXBRAIN_TEST_URL=http://localhost:3000 npm test   # + tests d'intégration de l'API (serveur en AI_MOCK)
```

`AI_MOCK=true` renvoie des sorties simulées : tout le parcours fonctionne sans clé API.

Pour éprouver le **vrai chemin IA** (prompts, extraction JSON, relances, cache, tokens) sans clé :

```bash
node scripts/fake-gemini.mjs                       # faux serveur Gemini sur :8787
GEMINI_BASE_URL=http://localhost:8787 GEMINI_API_KEY=fake AI_MOCK=false npm run worker
```

## Architecture

```
Navigateur ──> Next.js (pages + Route Handlers /api/*) ──> PostgreSQL (Prisma)
                         │
                         └─ BullMQ ──> Redis ──> Worker : orchestrateur + 5 agents ──> Gemma 4 (API Gemini)
```

| Agent | Rôle | Garde-fou |
|---|---|---|
| 01 Explorateur | 10–20 problèmes selon ville, secteur, public | Aucune statistique inventée |
| 02 Innovateur | 2–3 solutions + MVP par problème | Un chatbot n'est pas une innovation suffisante |
| 03 Analyste | Concurrents, prix, risques, questions terrain | Sans recherche web → « analyse non vérifiée » |
| 04 Technique | Tâches, postes de coût, blocages | Totaux calculés en TypeScript, pas par le LLM |
| 05 Décideur | Argumentaire à partir du classement | Un score élevé ne prouve pas la réussite |

L'**orchestrateur** (`src/lib/orchestrator.ts`) n'est pas un 6ᵉ agent : il enchaîne
Explorateur → Innovateur → (Analyste ‖ Technique) → Décideur, trace chaque exécution
(état, tokens, logs), applique le quota, gère l'annulation et la reprise à l'agent en échec,
puis fige une version (`BrainstormVersion`).

### Arborescence

```
prisma/schema.prisma        modèle de données (comptes, brainstorms, idées, preuves, exécutions…)
src/lib/agents/             les 5 agents + schémas Zod de sortie
src/lib/ai/gemma.ts         client Gemma 4 : JSON validé par Zod, relance automatique
src/lib/ai/search.ts        recherche web (Tavily) pour l'Analyste
src/lib/scoring.ts          score pondéré, contraintes bloquantes, classement
src/lib/estimate.ts         coûts min/central/max, chemin critique, durée calendaire
src/lib/orchestrator.ts     workflow, traçabilité, reprise, versions
src/worker/index.ts         worker BullMQ
src/app/api/                routes API
src/app/(app)/              pages connectées : dashboard, assistant, résultats, fiche projet,
                            comparateur, mes idées, historique, paramètres
src/components/             UI (composants maison au style shadcn), graphiques Recharts
tests/                      tests Vitest
```

### API

| Fonction | Route | Méthodes |
|---|---|---|
| Auth / compte | `/api/auth/{register,login,logout,me}` | POST · GET |
| Brainstorms | `/api/brainstorms` | GET · POST |
| Contexte / édition | `/api/brainstorms/:id` | GET · PATCH · DELETE |
| Workflow IA | `/api/brainstorms/:id/run` (`{ startFrom? }`) | POST |
| Progression / retry / annulation | `/api/runs/:id` (`{ action: "retry" \| "cancel" }`) | GET · POST |
| Fiche idée | `/api/ideas/:id` | GET · PATCH |
| Comparateur | `/api/comparisons` | POST |
| Rapports / usage | `/api/reports` · `/api/usage` | GET · POST |
| Duplication | `/api/brainstorms/:id/duplicate` | POST |
| Sélection d'un problème | `/api/problems/:id` (`{ selected }`) | PATCH |
| Préférences | `/api/settings` (`{ name?, weights? }`) | PATCH |

Exports (`POST /api/reports`, `{ brainstormId, format, version? }`) : `JSON` (instantané complet),
`MARKDOWN` (rapport lisible), `PDF` (renvoie l'URL de `/report/:id`, page imprimable : le navigateur
l'enregistre en PDF avec tous les caractères — accents, arabe, symboles).

Tous les endpoints privés vérifient la session, la propriété de la ressource (404 sinon),
valident le corps avec Zod, et les routes sensibles sont limitées en débit (Redis).

### Fiabilité et coût IA

- **Anti-injection** (`src/lib/ai/untrusted.ts`) : saisies utilisateur, résultats web et sorties
  d'agents précédents sont placés dans des blocs `<donnees>` neutralisés, annoncés au modèle
  comme des données à ne jamais exécuter.
- **Garde-fou des sources** : sans recherche web, aucun élément ne peut rester « Fait sourcé ».
- **Quotas** : quota mensuel par utilisateur (`AI_MONTHLY_TOKEN_QUOTA`) et plafond par analyse
  (`AI_RUN_TOKEN_LIMIT`) ; un dépassement arrête l'analyse sans nouvelles tentatives.
- **Cache** : limité à une même analyse — une reprise après échec ne refacture pas les appels
  déjà réussis, mais une relance volontaire produit de nouvelles propositions.
- **Résilience** : 3 tentatives par analyse avec reprise à l'agent en échec ; au démarrage, le
  worker remet en file les analyses dont le job a disparu de Redis.

### Scoring

`Score = Σ(note × poids) / Σ(poids)`. Poids par défaut : faisabilité 30 %, coût 25 %, délai 20 %,
demande 15 %, potentiel commercial 10 %, modifiables par brainstorm. Les contraintes bloquantes
(coût minimal > budget, durée minimale > délai) sont vérifiées avant le classement.

Notes de coût et de délai : ratio estimé / disponible → 100 à 0 %, 50 à 100 %, 0 à partir de 150 %
(utiliser toute la ressource reste acceptable, mais sans marge).

## Interfaces

| Page | Contenu |
|---|---|
| `/dashboard` | Statistiques, activité récente, brainstormings récents |
| `/brainstorms/new` | Assistant en 4 étapes (Contexte, Ressources, Objectifs, Résumé), mode rapide/avancé, pondérations, prévisualisation, brouillon local |
| `/brainstorms/:id` | Suivi des agents en direct, décision argumentée, top 3, autres idées, problèmes à cocher, relance depuis un agent, export, duplication |
| `/ideas/:id` | Fiche projet à onglets : vue globale (radar), faisabilité, coût (scénarios + postes), délai (Gantt), marché (preuves sourcées), décision IA, MVP |
| `/compare` | 2 à 5 idées, pondérations ajustables en direct, barres + radar + tableau |
| `/brainstorms/:id/versions` | Comparaison de deux versions : contexte, pondérations, rangs et scores |
| `/report/:id` | Rapport imprimable / PDF d'une version |
| `/ideas`, `/history`, `/settings` | Idées filtrables et favoris, historique versionné, nom et pondérations par défaut, consommation IA |

## Reste à faire

- Composants shadcn/ui officiels : `components.json` est prêt (`npx shadcn@latest add …`) ; les composants
  actuels de `src/components/ui` sont écrits à la main dans le même style.
- Tester et affiner les prompts avec le vrai Gemma 4 (`GEMINI_API_KEY`).
- Recherche web de l'Analyste (`SEARCH_API_KEY`, Tavily) à valider en conditions réelles.
- Animations React Bits.
- Tests E2E navigateur dans la CI (la CI actuelle : lint, typage, tests unitaires, build et
  tests d'intégration de l'API sur le vrai chemin IA avec le faux serveur Gemini).
