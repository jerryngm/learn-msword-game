import assert from 'node:assert/strict';
import test from 'node:test';
import { gardenSvg, SLOT_COUNT, BED_COUNT } from './garden-renderer.js';
import { growingSymbol } from '../../pb_public/js/projector/garden-scene.js';
const count = svg => (svg.match(/class="garden-plant/g) ?? []).length;
test('shared growth changes at one-third and two-thirds of the goal', () => {
  assert.equal(growingSymbol(7, 24), 'p-seed');
  assert.equal(growingSymbol(8, 24), 'p-sprout');
  assert.equal(growingSymbol(15, 24), 'p-sprout');
  assert.equal(growingSymbol(16, 24), 'p-leafy');
});
test('exactly one next plant grows until the shared beds are full', () => {
  assert.equal(count(gardenSvg({ flowers: 0 })), 1);
  assert.equal(count(gardenSvg({ flowers: 4 })), 5);
  assert.equal(count(gardenSvg({ flowers: SLOT_COUNT })), SLOT_COUNT);
  assert.equal(count(gardenSvg({ flowers: 100 })), SLOT_COUNT);
});
test('waiting clears earned plants and mastery overflow keeps its capacity', () => {
  const bed = Array.from({ length: 30 }, () => ({ symbol: 'p-rose' }));
  assert.equal(count(gardenSvg({ waiting: true, flowers: 10, bed })), 0);
  assert.equal(count(gardenSvg({ flowers: 13, bed })), SLOT_COUNT + BED_COUNT);
});
test('untrusted symbol identifiers cannot inject SVG attributes', () => {
  assert(!gardenSvg({ flowers: 1, kinds: ['p-rose" onload="alert(1)'] }).includes('onload'));
});
