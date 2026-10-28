# Shared goal and sidebar: agent integration guide

These components reproduce the user's approved progress strip and sidebar references. They are part of the [garden art kit](projector-garden-art-direction.md), not a replacement screenshot to place over the application. The figures and wording must come from live state.

## Files to use

All implementation files below live in `mockup/projector-garden/`:

| File | Role |
|---|---|
| [projector-components.js](../mockup/projector-garden/projector-components.js) | Pure HTML builders: `goalStripHtml`, `sidebarHtml`, `accuracyRingHtml` |
| [projector-components.css](../mockup/projector-garden/projector-components.css) | Scoped `pg-*` classes and `--pg-*` design tokens; no global body or heading styles |
| [shared-star.svg](../mockup/projector-garden/assets/shared-star.svg) | Scalable faceted gold star, hand-authored SVG |
| [success-check.svg](../mockup/projector-garden/assets/success-check.svg) | Standalone scalable green check icon; ring builder uses equivalent inline paths |
| [practice-flower-document.png](../mockup/projector-garden/assets/practice-flower-document.png) | Transparent 1145×1374 botanical document artwork; built-in image generation |
| [mature-plant-kinds.png](../mockup/projector-garden/assets/mature-plant-kinds.png) | First atlas cell supplies the sunflower reward decoration; reused, not duplicated |
| [component-preview.html](../mockup/projector-garden/component-preview.html) | Isolated component review with display-state selector |
| [preview.html](../mockup/projector-garden/preview.html) | Components composed with the interactive garden |
| [projector-components.test.mjs](../mockup/projector-garden/projector-components.test.mjs) | Behaviour tests for progress, missing data, state transitions and escaping |

The original cropped references are saved as `references/shared-goal-reference.png` and `references/sidebar-reference.png`. They document visual intent and must not be used as runtime assets. Exact generated-art prompts are in [generation-prompts.json](../mockup/projector-garden/generation-prompts.json).

## How each component works

### Shared-goal strip

`goalStripHtml(stats, options)` renders the star, live total, flower count, remaining stars, accessible progress bar and sunflower. At wide sizes the heading and bar share a row; supporting text is below. At narrow sizes the bar stacks and the decorative sunflower hides.

Inputs come directly from `classStats`: `stars`, `flowers`, `perFlower` and `towardNext`. The fill is `towardNext / perFlower`, not total session stars divided by a fixed maximum. With 113 stars and eight present learners, the goal is 24, the remainder is 17, the fill is 70.83%, and seven stars remain. The screenshot's painted bar is illustrative; the component uses the actual calculation.

`options.capacity` defaults to 13 to match the current renderer. At capacity, the meter shows full and the label becomes “The garden is full.” `options.status` accepts `live`, `loading` or `waiting`. Loading/waiting hide stale totals. The progress element uses `role="progressbar"`, numerical ARIA values and a text equivalent. Singular labels are handled.

The sunflower is a CSS atlas viewport: `background-size:400% 300%` and `background-position:0 0` select the first cell of the 4×3 mature atlas. Keep a square element; do not stretch the sprite independently. It is decorative, not the next learner's species or an additional earned flower.

### Today's progress

`sidebarHtml` takes `present` and `finished` from `classStats`. The completed count is green; the whole sentence remains readable without colour. Present means learners with a recorded session attempt, not everyone enrolled. Do not infer completion from mastery or flower count.

No attempts displays “No one has started yet.” Waiting/loading have their own wording. Set `offline:true` while reconnecting to retain the last known figures with an explicit reconnect message. Do not reset the cards to zero on a temporary network error.

### Shared success

`stats.accuracy` is the share of recorded attempts earning three stars, as calculated by the existing statistics module. Do not substitute completion percentage. `null` means unknown and displays an em dash with “Waiting for answers.” Numeric zero displays `0%` with an empty ring; 100 fills the ring.

`accuracyRingHtml` draws two SVG circles. `pathLength="100"` makes `stroke-dasharray="83 100"` represent 83%. Rotation starts the arc at the top. The positive-result check appears only above zero; it is not an additional statistic. The ring is hidden from assistive technology because adjacent text announces the result once. The standalone `success-check.svg` is available for other placements, but never rasterise the ring itself.

### Practice card

The card uses `stats.tricky`, `stats.trickyCandidates` and the existing asynchronous `itemLabel` result (`label.title`, optional `label.prompt`). Text is escaped before interpolation into HTML. Do not pass HTML as a label.

The flower-document image is optional and decorative. Set `practiceArtwork:'flower-photo'` only for a task for which a flower-picture document is appropriate. By default no image renders. Do not show a flower flyer when the selected task is about tables, typing or another unrelated skill. An explicit item-ID/content mapping is preferable to guessing from title keywords.

When no eligible tricky item exists, the component follows the existing distinction: all eligible answers were right first time versus not enough answers yet. Waiting/loading show neutral future-practice copy. Long titles wrap; final fixed-stage integration must test the longest real title and prompt. Prefer removing optional art to reducing essential text below readable projector sizes.

## Suggested production integration

Keep the current application data flow. This task does not change its rules or database.

1. Copy `projector-components.js` into an appropriate production module directory, such as `pb_public/js/projector/`. Copy its stylesheet to `pb_public/css/` and selected images to `pb_public/assets/projector-garden/`.
2. Update the module's single `asset()` URL helper. For that suggested module destination, use `new URL('../../assets/projector-garden/' + name, import.meta.url).href`. Change the CSS atlas URL to `../assets/projector-garden/mature-plant-kinds.png` when the CSS lives in `pb_public/css/`. Paths in the kit are intentionally relative to the kit directory.
3. Load the component CSS after existing projector CSS. Use wrappers for the goal and sidebar. Component classes are scoped, but existing generic selectors such as `aside` can still affect wrapper layout; explicitly size wrappers within the 1920×1080 stage.
4. Replace the current milestone markup with `goalStripHtml(stats, {capacity:SLOT_COUNT})`. Replace or adapt the summary-card markup using `sidebarHtml(stats, options)`. Preserve the existing learner roster and name/privacy controls elsewhere; this summary component does not implement that roster.
5. Continue using `classStats` and `itemLabel` in the current `draw()` flow. Await the label and retain the existing draw-token stale-result guard. Pass current reconnect state into `offline`; use the existing initial-load/no-session branches for `status`.
6. Retain live subscriptions, topic header, all-attempt mastery history, scene updates and fit behaviour. The components are pure rendering helpers and perform no subscriptions, fetches, database writes or timers.

Illustrative wiring inside the current drawing path:

```js
import { goalStripHtml, sidebarHtml } from './projector-components.js';

// stats and label are the existing resolved values, not hard-coded fixtures.
const options = {
  status: 'live',
  offline: Boolean(state.sessionError || state.attemptsError),
  label,
  // Leave null unless content metadata explicitly selects this illustration.
  practiceArtwork: null,
};
const goalMarkup = goalStripHtml(stats, { capacity: SLOT_COUNT });
const cardsMarkup = sidebarHtml(stats, options);
// Include these strings in the existing page builder, with its roster retained.
```

For waiting use both builders with `null, {status:'waiting'}`. For initial loading use `status:'loading'`. Neither requires invented zero statistics. These strings are safe for the intended `innerHTML` integration because user-facing title/prompt copy is escaped and numerical values are normalised.

## Design and accessibility

Use the `--pg-*` variables to tune cream, navy, green, peach, radius, spacing and font. The source reference governs the generous rounded cards and botanical decorations. The hand-authored star is a scalable approximation of its painted reference. The regenerated document illustration and reused sunflower are intentionally separate images, not exact pixel cutouts.

Decorative images have empty alt text; all essential information is live HTML. Card headings retain a semantic hierarchy. Avoid adding separate live regions to every number inside the current `aria-live` stage, which would multiply announcements. There is no component motion, and no sound. Use the existing reduced-motion-aware plant animation separately.

Keep the main projector at its fixed 1920×1080 design size and scale the stage as the application already does. Container-relative type sizes in the cards adapt to card width. The isolated review page also supports 375px and 768px layouts for inspection; its scrolling controls are not part of the projected screen.

## Review and testing

Serve the repository root as described in the main handoff. Open `component-preview.html` and select live, waiting, loading, empty, full, reconnecting, all-clean, zero or long-title states. `?state=waiting` (and the other option values) supports direct state reviews. Then view `preview.html?stars=113` for the garden composition.

Run:

```sh
node --test mockup/projector-garden/projector-components.test.mjs mockup/projector-garden/garden-renderer.test.mjs
```

Before production integration, check the actual projector, the longest real practice prompt, name/privacy behaviour, asset paths after relocation, class membership changes, full/empty states and reconnect recovery. Do not copy the review page's labelled example values or controls into production.

The delivered [composed screenshot](../mockup/projector-garden/preview-ui-components.png) shows the new components inside the garden. Nine focused tests pass. Component render checks at 375, 768 and 1440 pixels, long-title checks at 375 and 1440 pixels, and composed-screen checks at 375 and 1920 pixels report no errors or warnings after fixes. The 1920×1080 stage fits above the separate review controls. Actual classroom projection remains a final integration check.
