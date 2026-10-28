import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goalStripHtml, sidebarHtml, accuracyRingHtml } from './projector-components.js';
const stats = { stars:113, flowers:4, perFlower:24, towardNext:17, present:8, finished:1, accuracy:83, tricky:{item:'example'}, trickyCandidates:1 };
test('shared goal uses the remainder, not total stars, and handles a full garden',()=>{
  const html=goalStripHtml(stats);
  assert.match(html,/113 stars together/); assert.match(html,/7 stars to our next flower/);
  assert.match(html,/aria-valuemax="24" aria-valuenow="17"/);
  const full=goalStripHtml({...stats,flowers:13,towardNext:0});
  assert.match(full,/The garden is full/); assert.match(full,/aria-valuenow="24"/);
});
test('loading and waiting do not show stale earned results',()=>{
  for(const status of ['loading','waiting']) {
    assert.doesNotMatch(goalStripHtml(stats,{status}),/113 stars together/);
    assert.doesNotMatch(sidebarHtml(stats,{status}),/83%|1<\/span> of 8/);
  }
});
test('unknown accuracy differs from zero accuracy and rings are proportional',()=>{
  assert.match(sidebarHtml({...stats,accuracy:null}),/Waiting for answers/);
  assert.match(sidebarHtml({...stats,accuracy:0}),/>0%/);
  assert.match(accuracyRingHtml(83),/stroke-dasharray="83 100"/);
  assert.doesNotMatch(accuracyRingHtml(0),/class="pg-ring-check"/);
  assert.match(accuracyRingHtml(100),/stroke-dasharray="100 100"/);
});
test('task copy is escaped and flower-document art is explicitly selected',()=>{
  const options={label:{title:'<img src=x onerror=alert(1)>',prompt:'A & B'},practiceArtwork:'flower-photo'};
  const html=sidebarHtml(stats,options);
  assert.match(html,/&lt;img src=x/); assert.match(html,/A &amp; B/); assert.match(html,/class="pg-document"/);
  assert.doesNotMatch(sidebarHtml(stats,{label:options.label}),/class="pg-document"/);
  assert.doesNotMatch(sidebarHtml({...stats,tricky:null},options),/class="pg-document"/);
});
test('empty, clean, singular and reconnect cases retain useful wording',()=>{
  assert.match(sidebarHtml({...stats,present:0,finished:0,tricky:null,trickyCandidates:0}),/No one has started yet/);
  assert.match(sidebarHtml({...stats,tricky:null}),/Everything so far was right first time/);
  assert.match(goalStripHtml({...stats,flowers:1,towardNext:23}),/1 star to our next flower/);
  assert.match(goalStripHtml({...stats,flowers:1}),/1 flower grown/);
  assert.match(sidebarHtml(stats,{offline:true}),/Reconnecting/);
});
