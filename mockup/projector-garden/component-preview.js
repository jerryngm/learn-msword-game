import { goalStripHtml, sidebarHtml } from './projector-components.js';
const state = document.getElementById('state');
const requested = new URLSearchParams(location.search).get('state');
if ([...state.options].some(o => o.value === requested)) state.value = requested;
function draw() {
  const stats = { stars:113, flowers:4, perFlower:24, towardNext:17, present:8, finished:1, accuracy:83, tricky:{item:'design-example'}, trickyCandidates:1 };
  const options = { status:'live', label:{title:'Add a flower photo to the flyer'}, practiceArtwork:'flower-photo' };
  if (state.value === 'loading' || state.value === 'waiting') options.status = state.value;
  if (state.value === 'empty') Object.assign(stats,{stars:0,flowers:0,perFlower:3,towardNext:0,present:0,finished:0,accuracy:null,tricky:null,trickyCandidates:0});
  if (state.value === 'full') Object.assign(stats,{stars:312,flowers:13,towardNext:0});
  if (state.value === 'reconnecting') options.offline = true;
  if (state.value === 'clean') Object.assign(stats,{accuracy:100,tricky:null});
  if (state.value === 'zero') stats.accuracy = 0;
  if (state.value === 'long') { options.label.title = 'Practise adding a picture, adjusting its size and moving it beside your text'; options.practiceArtwork = null; }
  document.getElementById('goal').innerHTML = goalStripHtml(stats,options);
  document.getElementById('cards').innerHTML = sidebarHtml(stats,options);
}
state.addEventListener('change',draw);
draw();
