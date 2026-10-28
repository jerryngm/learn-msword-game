# Projector garden art direction and integration handoff

Approved direction, 27 October 2026: a welcoming 2.5D farm garden that learners gradually beautify together. Audience: middle-aged and senior adult learners, viewing a classroom projector while working on their laptops. This is a fresh project; no data migration is requested. This delivery is an art kit and reference renderer, not a change to the live projector.

## Start here

- [Approved visual concept](../mockup/projector-garden/approved-shared-garden.png)
- [Seed / sprout / leafy progression study](../mockup/projector-garden/growth-progression.png)
- [Interactive reference preview](../mockup/projector-garden/preview.html)
- [Full-garden browser screenshot](../mockup/projector-garden/preview-full.png)
- [Machine-readable asset map](../mockup/projector-garden/asset-manifest.json)
- [Exact generation prompts](../mockup/projector-garden/generation-prompts.json)
- [Shared-goal and sidebar component integration guide](projector-garden-ui-components.md)
- [Isolated UI component preview](../mockup/projector-garden/component-preview.html)
- [Garden with the completed UI components](../mockup/projector-garden/preview-ui-components.png)

Serve the repository root, not just `pb_public`, to load the preview and its imports:

```sh
python3 -m http.server 8094 --bind 127.0.0.1
# Open http://127.0.0.1:8094/mockup/projector-garden/preview.html
```

Check the port before starting; reuse an existing server if appropriate and stop your server afterward. The preview is deliberately outside the production public directory. The controls and sidebar values are labelled design examples; they do not connect to PocketBase. Query parameters `?stars=40&mastery=0` select a review state. Controls allow each leafy species, waiting, progression, full beds, and mastery overflow to be inspected.

## Visual contract

Keep dimensional timber beds, rich soil, a sun, clouds, fruit tree, trellis, palm, bird, butterfly, bee and watering can. Leave clear empty soil for future contributions. Earned plants should supply the main colour and visible change. Use large dark text on warm cream cards. The garden is the primary content; statistics are secondary. Never print the user's explanatory slogan about beautifying the garden together.

Use leaf silhouettes to reveal species before flowering. Seed and earliest sprout art is shared in this kit; leafy and mature art varies across all 12 existing plant kinds. This is an intentional visual extension of the current generic leafy stage, not a change to thresholds. Avoid rankings, exaggerated winner highlights, or decorations that imply unearned progress. A brief growth animation can acknowledge a new contribution; reduced-motion users get the static result.

The approved concept's fruit markers are illustrative. Current shared slots rotate through present learners' plant kinds; they are not individually owned plants. Do not attach a learner identity to a shared slot without defining new attribution behaviour. Keep individual recognition through the existing learner roster and mastered-skill flowers. The kit's small foreground soil strip remains part of the same landscape but retains the separate mastery data source.

## Source-verified game rules

Read these owners before implementation:

| Owner | Contract |
|---|---|
| [class-stats.js](../pb_public/js/projector/class-stats.js) | `classStats`, `masteredFlowers`, session star totals, completion and accuracy |
| [garden-scene.js](../pb_public/js/projector/garden-scene.js) | `growingSymbol`, 13 shared slots, 22 mastery slots, waiting and animation inputs |
| [class-garden.js](../pb_public/js/projector/class-garden.js) | Live subscriptions, learner kinds, history, initial-paint animation suppression, session reset, reconnect and privacy display |
| [plants.js](../pb_public/js/plants.js) | All 12 plant keys, learner choice/fallback and sprite symbols |
| [rules.js](../pb_public/js/rules.js) | Personal skill stages and mastery, distinct from shared growth |

`perFlower = 3 × max(1, present)`, where present means distinct learners with attempts in the current session. Shared flower count is `floor(stars / perFlower)`. Only the NEXT shared slot shows a growing plant, chosen from `towardNext = stars % perFlower`:

| Fraction of next flower earned | Art |
|---|---|
| Below 1/3 | Seed |
| At least 1/3 and below 2/3 | Sprout |
| At least 2/3 | Leafy |
| Goal reached | Mature flower is added; next slot starts as a seed |

For eight present learners, each flower takes 24 stars. The progression illustration's 4/24, 8/24 and 16/24 represent progress toward the NEXT flower, not necessarily total session stars. The preview uses totals 28, 32 and 40 (one existing bloom plus those remainders). Do not show many independent immature shared plants simultaneously. At 13 blooms the shared beds are full; no extra active plant appears. Waiting shows no earned plants.

Mature shared plants cycle through the present learners' kinds. The proposed leafy variant follows the SAME next kind so its leaf shape matches its eventual bloom. This rotation can change when the roster changes; preserving an immutable species per slot would be a separate product decision.

Personal mastery comes from clean attempts on two different days per learner/skill, using all-attempt history for present learners. The front strip shows the newest 22 mastered-skill flowers, not one plant per learner. Personal learner gardens also have bud and wilted states; those are outside the current projector's stage sequence. This kit does not supply new bud or wilted raster sprites. Keep the existing symbols if later extending it to those screens.

## Assets and code

| File | Purpose |
|---|---|
| `assets/garden-background.png` | 1536×1024 opaque scene, empty soil, no baked UI text or earned plants |
| `assets/growth-stages.png` | 2172×724 RGBA atlas; three 724×724 frames: seed, sprout, generic leafy |
| `assets/leafy-plant-kinds.png` | 1448×1086 RGBA atlas; 4 columns × 3 rows, 362×362 cells |
| `assets/mature-plant-kinds.png` | Matching 1448×1086 RGBA mature atlas, same ordering |
| `assets/existing-plant-symbols.svg` | Snapshot of the projector's base SVG definitions, fallback/reference only |
| `garden-renderer.js` | Reference `gardenSvg` with the existing input shape, depth sorting, caps, soil anchors and atlas rendering |
| `projector-theme.css` | Palette, typography, cream cards, layout and reduced-motion-safe growth animation |
| `preview.js` | Design controls; never copy example statistics into live code |
| `projector-components.js` / `projector-components.css` | Shared-goal strip, completion card, SVG accuracy ring and practice card; see the UI component guide |
| `assets/shared-star.svg` / `assets/success-check.svg` | Scalable UI icons |
| `assets/practice-flower-document.png` | Separate transparent document illustration; optional for relevant practice tasks |

Both species atlases use `PLANT_KINDS` order: sunflower, tomato, lotus, apricot, rose, tulip, chilli, lavender, hibiscus, orchid, peach, marigold. These are illustrated game assets, not botanical identification references. Yellow apricot blossom follows the existing game's hoa mai convention.

PNG transparency is real alpha, verified from the files. Images were generated using the built-in image tool. Treat the atlases as integration candidates: fine edge colour fringes and tight gutters should be checked at target size, particularly mature flowers near cell edges. The reference uses uniform cells; refine individual frame rectangles/anchors if final art review finds clipping. Do not flatten these atlases onto an opaque background. The full-screen approved render and progression study are references, not runtime UI backgrounds.

## Integration route

1. Copy selected runtime assets into an owning directory under `pb_public`, such as `assets/projector-garden/`. Keep mockups and review controls outside production.
2. Adapt the reference renderer in the existing `garden-scene.js` boundary; update asset URLs/imports for the destination. Its external `gardenSvg` argument shape already matches the current caller. Preserve the 13/22 limits and map new background coordinates deliberately. The new shared slot order is five rear, four left, four right; this is placement only.
3. Keep `classStats`, `masteredFlowers`, live subscriptions, learner identity and privacy settings as owners of live data. Reuse `newFrom`, `grew`, and each mastery entry's `isNew`; suppress arrival animations on initial load and on session changes as current code does.
4. Transfer the design tokens and card hierarchy into `projector.css` and the existing HTML builder. Retain loading, waiting, reconnect, empty accuracy and tricky-item states. Keep text live and accessible; never bake figures or learner names into images.
5. Keep the existing 1920×1080 stage fit. The review preview stretches the 3:2 scene modestly to fit its panel; final integration should settle the panel ratio and camera crop with no loss of the foreground strip. Test 1080p and the actual classroom projector.
6. Ambient creatures are baked into this scene plate. Do not overlay duplicates from the old SVG scene. Separating them into animated assets is future work; the supplied runtime animation is plant arrival only.

## Verification and limits

The kit has focused Node assertions for stage boundaries, one active shared plant, slot capacity, mastery overflow, waiting and unsafe symbol fallback. PNG dimensions and transparency were inspected. Chrome headless screenshots were used to check placement and the full garden. A direct Playwright attempt was blocked by a local `node_modules` access hook; it did not run. Headless Chrome emitted macOS display-link warnings but produced screenshots successfully.

Before shipping integration, test changing class membership, all 12 kinds, full beds, waiting → live → new session, reconnect, privacy/name display, reduced motion and projector readability. The kit is not yet wired to the live projector. No database changes, migrations, commits or deployment were made.
