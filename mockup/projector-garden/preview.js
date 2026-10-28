import { gardenSvg, SLOT_COUNT } from './garden-renderer.js';
import { PLANT_KINDS, mountPlantSymbols } from '../../pb_public/js/plants.js';
import { STARS_PER_LEARNER } from '../../pb_public/js/projector/class-stats.js';
import { goalStripHtml, sidebarHtml } from './projector-components.js';
const $ = (id) => document.getElementById(id);
try {
  const response = await fetch('./assets/existing-plant-symbols.svg');
  if (!response.ok) throw new Error(`Plant symbols failed to load (${response.status})`);
  $('symbols').innerHTML = await response.text();
  mountPlantSymbols();
  const perFlower = STARS_PER_LEARNER * 8;
  const kinds = PLANT_KINDS.map(k => k.symbol);
  for (const kind of PLANT_KINDS) $('kind').add(new Option(kind.en, kind.symbol));
  const query = new URLSearchParams(location.search);
  if (query.has('stars')) $('stars').value = query.get('stars');
  if (query.has('mastery')) $('mastery').value = query.get('mastery');
  let previous = null;
  function draw() {
    const stars = Number($('stars').value);
    const flowers = Math.floor(stars / perFlower);
    const towardNext = stars % perFlower;
    const waiting = $('waiting').checked;
    const mastery = Number($('mastery').value);
    const bed = Array.from({ length: mastery }, (_, i) => ({ key: `example-${i}`, symbol: kinds[i % kinds.length] }));
    const shownKinds = [...kinds];
    if ($('kind').value) shownKinds[flowers % shownKinds.length] = $('kind').value;
    $('scene').innerHTML = gardenSvg({ flowers, towardNext, perFlower, kinds: shownKinds, bed, waiting,
      newFrom: previous != null && flowers > previous.flowers ? previous.flowers : SLOT_COUNT,
      grew: previous != null && stars > previous.stars });
    const stats = { stars, flowers, perFlower, towardNext, present: 8, finished: 1, accuracy: 83, tricky: { item: 'art-review-example' }, trickyCandidates: 1 };
    const options = { status: waiting ? 'waiting' : 'live', label: { title: 'Add a flower photo to the flyer' }, practiceArtwork: 'flower-photo' };
    $('goal-strip').innerHTML = goalStripHtml(stats, options);
    $('sidebar').innerHTML = sidebarHtml(stats, options);
    $('star-value').textContent = stars;
    $('mastery-value').textContent = mastery;
    previous = waiting ? null : { stars, flowers };
  }
  document.querySelectorAll('[data-stars]').forEach(button => button.addEventListener('click', () => {
    $('stars').value = button.dataset.stars;
    $('waiting').checked = false;
    draw();
  }));
  ['stars', 'mastery', 'waiting', 'kind'].forEach(id => $(id).addEventListener('input', draw));
  draw();
} catch (error) {
  $('error').textContent = `${error.message}. Serve the repository root over HTTP to open this preview.`;
  throw error;
}
