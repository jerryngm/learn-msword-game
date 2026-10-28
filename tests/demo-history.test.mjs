import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from '../pb_public/js/word/undo.js';

test('demo undo and redo leave learner history intact', () => {
  const history = createHistory();
  const first = { doc: 'First', sel: { anchor: 0, focus: 0 } };
  const second = { doc: 'Second', sel: { anchor: 1, focus: 1 } };
  history.record(first, 'Edit');
  const demo = history.fork();
  assert.equal(demo.undo(second).doc, 'First');
  assert.equal(demo.redo(first).doc, 'Second');
  demo.record(second, 'Demo typing');
  assert.equal(history.size, 1);
  assert.equal(history.undo(second).doc, 'First');
  assert.equal(history.redo(first).doc, 'Second');
});

test('demo can preview an existing redo without consuming it', () => {
  const history = createHistory();
  history.record({ doc: 'Before' }, 'Delete');
  history.undo({ doc: 'After' });
  const demo = history.fork();
  assert.equal(demo.redo({ doc: 'Before' }).doc, 'After');
  assert.equal(history.canRedo, true);
  assert.equal(history.redo({ doc: 'Before' }).doc, 'After');
});
