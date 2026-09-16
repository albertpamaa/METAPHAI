# Games architecture

MetaphAI Games is a static, multilingual layer shared by educational games. The common layer is deliberately independent of World Bank data so future games (for example, Country Shape) can use other local sources.

## Shared modules

- `game-registry.mjs`: active games, capabilities, scoring namespace and data requirements.
- `game-routes.mjs`: the 15 equivalent routes for every games page.
- `games-i18n.mjs`: complete UI copy for the 15 supported languages.
- `game-daily.mjs`: local date keys, seeded PRNG and deterministic shuffle.
- `game-storage.mjs`: versioned `metaphai_games_v1` state, safe parsing, sessions, completion and streak statistics.
- `game-share.mjs`: spoiler-free result grid and Web Share/Clipboard fallback.
- `game-ui.mjs`: reusable statistics rendering.

World Data Quiz owns only `world-data-quiz-core.mjs`, `world-data-quiz-ui.mjs` and its build script. It consumes the central WDI registry, countries and existing formatting/change modules; it does not redefine them.

## Daily challenges

`scripts/build-world-data-quiz.mjs` generates 380 days from the build date. The seed is `worldDataQuiz:v1:YYYY-MM-DD`, independent of language. Existing files for today or earlier are preserved; future files may be refreshed after validated WDI updates. The browser downloads only its one compact daily JSON plus the indicator registry.

The generator uses exact common years and exact historical endpoints. It excludes aggregates/nulls, uses the existing change semantics, rejects exact or displayed ties and selects nearby ranked values as plausible distractors.

## Storage and streaks

`metaphai_games_v1` contains `schemaVersion`, per-game `stats`, and daily `sessions`. Sessions store stable IDs, answers, hint state, score and progress—not HTML or translations. Completion is idempotent by local challenge date. A streak increments only when the previous completed local date is exactly one day earlier; a missed day resets it to one.

## Adding another game

1. Register it in `game-registry.mjs` and add localized routes.
2. Add complete strings for all languages.
3. Implement game-specific core/UI modules without coupling the shared layer to its dataset.
4. Add prerendered, useful no-JS content and stable sitemap URLs.
5. Add deterministic/data validation, storage, accessibility, RTL and route tests.

Do not duplicate country identities, indicator metadata, formatters, change formulas, language detection, storage, streak or sharing logic.
