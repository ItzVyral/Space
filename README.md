# Space

Application de design vectoriel 2D (Electron) — aussi simple que Figma, aussi complète qu'Illustrator/Affinity, avec le workflow Object/Edit Mode de Blender.

## Démarrage

```bash
npm install
npm run dev
```

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Lance l'app en dev (Electron + HMR) |
| `npm run build` | Build l'application |
| `npm run typecheck` | Vérification TypeScript + Svelte |
| `npm run lint` | ESLint |
| `npm test` | Tests unitaires Vitest (src/core) |
| `npm run test:coverage` | Tests unitaires avec couverture |
| `npm run assets:dmg` | Génère les assets de l'installeur DMG macOS (`build/`) |
| `npm run bin:*` | Packaging multi-OS (voir docs/ARCHITECTURE.md §9) |

## Documentation

- Architecture complète : `docs/ARCHITECTURE.md`
- Suivi local du projet (non versionné, voir AGENTS.md) : `TODO.md`, `LOGS.md`

Note : seul `README.md` est versionné parmi les fichiers Markdown (règle portée par `.gitignore`).