import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDoc, textOf } from '../pb_public/js/word/model.js';
import { practiceText, punctuationReminder, instructionPair } from '../pb_public/js/content/text-rules.js';
import * as t1 from '../pb_public/js/content/topic-1.js';
import * as t2 from '../pb_public/js/content/topic-2.js';
import * as t3 from '../pb_public/js/content/topic-3.js';
import * as t4 from '../pb_public/js/content/topic-4.js';
import * as t6 from '../pb_public/js/content/topic-6.js';
import * as t7 from '../pb_public/js/content/topic-7.js';
import * as t8 from '../pb_public/js/content/topic-8.js';

const find = (rows, id) => rows.find(row => row.id === id);

test('ordinary text tolerates commas, full stops and spacing, but preserves words and numbers', () => {
  assert.equal(practiceText(' Buy bread,  milk. '), 'Buy bread milk');
  assert.notEqual(practiceText('breadmilk'), practiceText('bread milk'));
  assert.notEqual(practiceText('$3.50'), practiceText('$350'));
  assert.notEqual(practiceText('1,000'), practiceText('1000'));
  assert.notEqual(practiceText("Lan's"), practiceText('Lans'));
});

test('typing and personal introductions accept missing punctuation with a reminder', () => {
  const item = t1.items.find(i => i.expectedText === 'I like tea.');
  for (const value of ['I like tea.', 'I like tea', 'I  like tea']) assert.equal(item.check(createDoc(value)), true);
  for (const value of ['I like', 'I like coffee', 'Ilike tea']) assert.equal(item.check(createDoc(value)), false);
  const name = find(t1.missions, 't1-m-type-name');
  for (const value of ['My name is Jerry', 'My name is Nguyễn Văn An']) {
    assert.equal(name.goal.check(createDoc(value), {}), true);
    assert.ok(name.completionReminder(createDoc(value)));
  }
  assert.equal(name.goal.check(createDoc('My name is'), {}), false);
  assert.equal(name.completionReminder(createDoc('My name is Jerry.')), null);
  const about = find(t1.missions, 't1-m-about-me');
  const doc = createDoc('About me\nMy name is Jerry I live in Melbourne');
  assert.equal(about.goal.check(doc, {}), true);
  assert.ok(about.completionReminder(doc));
  assert.equal(about.goal.check(createDoc("About me\nMy name is Jerry I live in"), {}), false);
});

test('spelling requires corrected words and real spelling commands, regardless of punctuation', () => {
  const mission = find(t2.missions, 't2-m-spelling');
  const ctx = { commands: ['spelling.bread', 'spelling.milk', 'spelling.apples'] };
  assert.equal(mission.goal.check(createDoc('Buy bread milk and apples'), ctx), true);
  assert.equal(mission.goal.check(createDoc('Buy bread milk and apples'), {}), false);
  assert.equal(mission.goal.check(createDoc('Buy bred milk and apples'), ctx), false);
});

test('punctuation, capitalization and undo/redo lessons remain strict', () => {
  const punctuation = find(t2.missions, 't2-m-punctuation');
  assert.equal(punctuation.goal.check(createDoc('Buy bread milk eggs and rice')), false);
  assert.equal(punctuation.goal.check(createDoc('Buy bread, milk, eggs and rice.')), true);
  assert.equal(punctuation.goal.check(createDoc('Buy bread, milk, eggs, and rice.')), true);
  assert.equal(find(t2.items, 't2-punctuation-stop').check('I like tea'), false);
  assert.equal(find(t2.items, 't2-capitals-monday').check('monday'), false);
  const redo = find(t2.items, 't2-redo-do');
  assert.equal(redo.check(createDoc('Tea'), { commands: ['qat.undo', 'qat.redo'] }), false);
  assert.equal(redo.check(createDoc('Tea.'), { commands: ['qat.undo', 'qat.redo'] }), true);
  const recovery = find(t2.missions, 't2-m-recovery');
  assert.equal(recovery.goal.check(createDoc('Shopping list\nBread\nMilk\nSugar'), { commands: ['qat.undo', 'qat.redo'] }), false);
  assert.equal(recovery.goal.check(createDoc('Shopping list\nBread\nMilk'), { commands: ['qat.undo'] }), false);
  assert.equal(recovery.goal.check(createDoc('Shopping list\nBread\nMilk'), { commands: ['qat.undo', 'qat.redo'] }), true);
});

test('formatting, lists and pictures retain their skill requirements without full stops', () => {
  for (const topic of [t3, t4, t6]) {
    // Target documents are actual content, not test substitutes.
    const candidates = topic.missions.filter(m => m.targetDoc && /[.,]/.test(textOf(createDoc(m.targetDoc))));
    assert.ok(candidates.length);
    let checked = 0;
    for (const m of candidates) {
      const doc = JSON.parse(JSON.stringify(createDoc(m.targetDoc)));
      if (!m.goal.check(doc, {})) continue; // Some goals also require command/selection evidence.
      for (const p of doc.p) for (const run of p.runs ?? []) run.text = run.text.replace(/[.,]/g, '');
      assert.equal(m.goal.check(doc, {}), true, m.id);
      assert.ok(punctuationReminder(doc, m.targetDoc), m.id);
      assert.equal(m.goal.check(createDoc(''), {}), false, `${m.id}: empty work`);
      checked++;
    }
    assert.ok(checked > 0);
  }
});

test('reminders distinguish punctuation differences from exact answers and wrong words', () => {
  assert.ok(punctuationReminder('Buy bread milk', 'Buy bread, milk.'));
  assert.equal(punctuationReminder('Buy bread, milk.', 'Buy bread, milk.'), null);
  assert.equal(punctuationReminder('Buy bread rice', 'Buy bread, milk.'), null);
  assert.equal(punctuationReminder('350', '3.50'), null);
});

test('typing instructions quote and emphasize complete phrases safely in both languages', () => {
  const html = instructionPair({ en: 'Type Lan Nguyen.', vi: 'Gõ Lan Nguyen.' }, { demo: [{ type: 'Lan Nguyen' }] });
  assert.equal((html.match(/<strong>&quot;Lan Nguyen&quot;<\/strong>/g) ?? []).length, 2);
  assert.match(instructionPair({ en: 'Type "Hello".', vi: 'Gõ “Hello”.' }, { demo: [{ type: 'Hello' }] }), /&quot;<strong>Hello<\/strong>&quot;/);
  const escaped = instructionPair({ en: 'Type <img>.', vi: 'Gõ <img>.' }, { demo: [{ type: '<img>' }] });
  assert.ok(!escaped.includes('<img>'));
  assert.match(escaped, /&lt;img&gt;/);
});

test('reworked missions accept learner names, lenient selections and realistic capstones', () => {
  const hello = find(t2.missions, 't2-m-hello');
  assert.equal(hello.steps.length, 2);
  assert.equal(hello.goal.check(createDoc('Hello, Lan.\nWelcome to class.'), {}), true);
  assert.equal(find(t2.missions, 't2-m-days').steps.length, 3);
  const copy = find(t2.missions, 't2-m-copy-address');
  assert.equal(copy.goal.check(createDoc('Tuesday class\n9 am, Room 4\nThursday class\n9 am, Room 4'), { commands: ['home.clipboard.copy', 'home.clipboard.paste'] }), true);

  const indent = find(t3.missions, 't3-m-recipe-indent');
  const indentStart = createDoc(indent.startDoc);
  assert.equal(indent.steps[0].done(indentStart, { selection: { from: { p: 1, offset: 0 }, to: { p: 2, offset: 8 } } }), true);
  assert.equal(indent.steps[0].done(indentStart, { selection: { from: { p: 1, offset: 0 }, to: { p: 1, offset: 14 } } }), false);

  const note = find(t4.missions, 't4-m-neighbour-note');
  for (const signoff of ['Thank you, Lan', 'Thank you, Nguyễn Văn An', 'Thank you Minh']) {
    const doc = createDoc(`Dear Mai,\nPlease water my plants.\nI am away today.\n${signoff}`);
    assert.equal(note.goal.check(doc, {}), true, signoff);
  }
  assert.equal(note.goal.check(createDoc('Dear Mai,\nPlease water my plants.\nI am away today.\nThank you'), {}), false);
  assert.ok(note.completionReminder(createDoc('Dear Mai\nPlease water my plants\nI am away today\nThank you Minh')));
  assert.equal(note.completionReminder(createDoc('Dear Mai,\nPlease water my plants.\nI am away today.\nThank you, Minh')), null);

  const replaceItem = find(t7.items, 't7-placeholder-replace-do');
  assert.equal(replaceItem.check(createDoc('Nguyễn Thị Hoa\nPhone: 0400 123 456 | Melbourne\nSkills:\n[Your skills]\n[Optional interests]')), true);
  assert.equal(replaceItem.check(createDoc('[Your name]\nPhone: 0400 123 456 | Melbourne\nSkills:\n[Your skills]\n[Optional interests]')), false);
  const resumeMission = find(t7.missions, 't7-m-fill-resume');
  assert.equal(resumeMission.goal.check(createDoc('Jerry Tran\nPhone: 0400 123 456 | Melbourne\nSkills:\ncooking and cleaning'), {}), true);
  assert.equal(resumeMission.goal.check(createDoc('[Your name]\nPhone: 0400 123 456 | Melbourne\nSkills:\nCooking and cleaning'), {}), false);

  assert.equal(t8.items.filter(i => i.skill === 't8-plan-doc').length, 6);
  const [flyer, menu, invite] = t8.missions;
  assert.equal(menu.steps.length, 10);
  const doneCtx = name => ({ saved: { folder: ['Documents'], name }, commands: ['file.print.copies.1'] });
  assert.equal(flyer.goal.check(flyer.targetDoc, doneCtx('Festival_Flyer')), true);
  assert.equal(menu.goal.check(menu.targetDoc, doneCtx('Cafe_Menu')), true);
  assert.equal(invite.goal.check(invite.targetDoc, doneCtx('Class_Invitation')), true);
  assert.equal(flyer.steps[3].skill, 't6-insert-picture');
  assert.equal(menu.steps[3].skill, 't6-insert-picture');
  assert.equal(invite.steps[2].skill, 't6-insert-picture');
});
