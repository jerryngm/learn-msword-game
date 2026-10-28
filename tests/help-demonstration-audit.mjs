// Read-only browser audit helper. Invoke runHelpAudit(page) against the local app.
// Timings are accelerated; these checks verify state, not animation smoothness.
export async function runHelpAudit(page) {
  return page.evaluate(async () => {
    const topics = await Promise.all(Array.from({ length: 8 }, (_, i) => import(`/js/content/topic-${i + 1}.js`)));
    const { mountWord, getInternals } = await import('/js/word/index.js');
    const { createHints } = await import('/js/word/hints.js');
    const { caretRect } = await import('/js/word/selection.js');
    const nativeTimeout = window.realTimeout ?? window.setTimeout;
    window.setTimeout = (fn, ms, ...args) => nativeTimeout(fn, Math.min(ms, 8), ...args);
    const pause = () => new Promise(resolve => nativeTimeout(resolve, 20));
    document.body.innerHTML = '<main id="audit" style="height:100vh"></main>';
    const host = document.querySelector('#audit');
    const reports = [];
    const originalWarn = console.warn;
    let warnings = [];
    console.warn = (...args) => { warnings.push(args.join(' ')); originalWarn(...args); };
    const snapshot = (root) => ({ text: root.querySelector('.wd-page')?.innerText, page: root.querySelector('.wd-page')?.innerHTML, pageStyle: root.querySelector('.wd-page')?.style.cssText, zoom: root.querySelector('.wd-zl')?.textContent, inputs: [...root.querySelectorAll('.bs input')].map(el => ({ name: el.className || el.dataset.print || el.dataset.new, value: el.value })), menus: [...root.querySelectorAll('.wm-menu,.wd-dlg,.bs')].map(e => e.textContent.slice(0, 160)), typing: [...root.querySelectorAll('.dm-typed')].map(e => e.textContent) });
    try {
      for (const mission of topics.flatMap(t => t.missions)) {
        if ((mission.mock ?? 'word') !== 'word') continue;
        const word = mountWord(host, { doc: mission.startDoc ?? '', tabs: mission.tabs ?? ['home'] });
        const w = getInternals(word);
        let prerequisiteValid = true;
        const ctx = { learner: { name: 'Lan' }, saved: null, opened: null, commands: [], selection: null };
        const off = word.on('command', e => { if (!e.menu) ctx.commands.push(e.id); });
        word.on('saved', e => { ctx.saved = e; });
        async function perform(script) {
          for (const step of script) {
            if (step.select) word.select(step.select.from, step.select.to);
            if (step.target) {
              const pos = /^doc:(\d+),(\d+)$/.exec(step.target);
              const cell = /^cell:(\d+),(\d+),(\d+)(?:,(\d+))?$/.exec(step.target);
              const placeholder = /^placeholder:(\d+)$/.exec(step.target);
              const picture = /^picture:(\d+)(?::(\w+))?$/.exec(step.target);
              if (pos) {
                word.select({ p: +pos[1], offset: +pos[2] });
                if (step.click === 'right') {
                  const r = caretRect(w.page, { p: +pos[1], offset: +pos[2] });
                  w.page.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: r.left, clientY: r.top + r.height / 2 }));
                }
              } else if (cell) {
                const p = word.getDoc().p.findIndex(p => p.cell?.table === +cell[1] && p.cell.row === +cell[2] && p.cell.col === +cell[3]);
                if (p >= 0) word.select({ p, offset: +(cell[4] ?? 0) });
              } else if (placeholder) {
                const p = +placeholder[1]; word.select({ p, offset: 0 }, { p, offset: word.getDoc().p[p].length });
              } else if (picture) {
                const el = w.page.querySelector(`.wd-picture[data-picture="${picture[1]}"]`);
                const target = picture[2] ? el?.querySelector(`[data-handle="${picture[2]}"]`) : el;
                if (target) {
                  const r = target.getBoundingClientRect(); const x = r.left + r.width / 2, y = r.top + r.height / 2;
                  target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
                  if (step.drag) {
                    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x + step.drag.dx, clientY: y + step.drag.dy, buttons: 1 }));
                    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: x + step.drag.dx, clientY: y + step.drag.dy }));
                  }
                }
              } else {
                const el = w.commandEl(step.target);
                if (el) { el.click(); if (el.matches('input,textarea')) el.focus(); }
              }
            }
            if (step.type !== undefined) {
              const input = document.activeElement;
              if (input?.matches('input')) { input.value = step.type; input.dispatchEvent(new Event('input', { bubbles: true })); }
              else for (const part of step.type.split(/(\n)/)) w.page.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: part === '\n' ? 'insertParagraph' : 'insertText', data: part === '\n' ? null : part }));
            }
            if (step.key) {
              const parts = step.key.split('+'); const key = parts.at(-1);
              const active = document.activeElement;
              if (active?.matches('input') && key === 'ArrowUp' && active.type === 'number') { active.stepUp(); active.dispatchEvent(new Event('input', { bubbles: true })); }
              else if (['Backspace', 'Delete'].includes(key)) w.page.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: key === 'Backspace' ? 'deleteContentBackward' : 'deleteContentForward' }));
              else if (key === 'Enter') w.page.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertParagraph' }));
              else if (key === 'Space' || (key.length === 1 && !parts.includes('Ctrl') && !parts.includes('Alt'))) w.page.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, cancelable: true, inputType: 'insertText', data: key === 'Space' ? ' ' : key }));
              else (active?.matches('input') ? active : w.page).dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true, ctrlKey: parts.includes('Ctrl'), shiftKey: parts.includes('Shift'), altKey: parts.includes('Alt') }));
            }
            await pause();
          }
        }
        for (let i = 0; i < mission.steps.length; i++) {
          const step = mission.steps[i];
          const script = step.demo;
          const result = { mission: mission.id, step: i + 1, text: step.text.en, prerequisiteValid, script, warnings: [] };
          warnings = [];
          const before = JSON.stringify(word.getDoc()); const selection = JSON.stringify(word.selection);
          const initial = snapshot(w.root);
          const states = new Map();
          const observer = new MutationObserver(() => { const s = snapshot(w.root); states.set(JSON.stringify(s), s); });
          observer.observe(w.root, { subtree: true, childList: true, attributes: true, characterData: true });
          const hints = createHints(word, { hint1: step.hint ?? mission.hint, spotlight: step.spotlight ?? mission.spotlight, demo: script });
          await hints.show(1); result.hint = Boolean(w.root.querySelector('.wg-hint'));
          await hints.show(2); result.spotlight = Boolean(w.root.querySelector('.is-spot-target,.is-spot-btn'));
          const emitted = [];
          const eventOffs = ['change', 'command', 'saved', 'goal'].map(name => word.on(name, event => emitted.push({ name, id: event?.id, menu: event?.menu, demoRunning: w.demoRunning })));
          await hints.show(3); result.yourTurn = Boolean(w.root.querySelector('.wg-yourturn'));
          eventOffs.forEach(off => off()); result.eventsDuringDemo = emitted;
          result.documentPreserved = before === JSON.stringify(word.getDoc()); result.selectionPreserved = selection === JSON.stringify(word.selection);
          result.initial = initial; result.states = [...states.values()]; result.warnings = [...warnings];
          result.restored = snapshot(w.root);
          observer.disconnect();
          hints.destroy();
          result.cleanup = !w.root.querySelector('.wg-demo,.wg-yourturn,.wg-hint,.wg-again');
          await perform(script);
          result.expected = snapshot(w.root);
          const clean = value => value?.replace(/ is-selected| is-demo-placeholder/g, '');
          const sameEffect = (a, b) => clean(a.page) === clean(b.page) && a.pageStyle === b.pageStyle && a.zoom === b.zoom;
          result.requiresDocumentEffect = !sameEffect(result.initial, result.expected);
          result.observedExpectedEffect = result.states.some(s => sameEffect(s, result.expected));
          ctx.selection = word.selection;
          try { result.prerequisiteAfter = Boolean(step.done(word.getDoc(), ctx)); } catch (error) { result.prerequisiteError = String(error); result.prerequisiteAfter = false; }
          prerequisiteValid &&= result.prerequisiteAfter;
          reports.push(result);
        }
        off(); word.destroy();
      }
    } finally { console.warn = originalWarn; window.setTimeout = nativeTimeout; }
    return reports;
  });
}

export async function runExplorerHelpAudit(page) {
  return page.evaluate(async () => {
    const { mount } = await import('/js/mocks/explorer.js');
    const { missions } = await import('/js/content/topic-1.js');
    const mission = missions.find(m => m.mock === 'explorer');
    const native = window.realTimeout ?? window.setTimeout;
    window.setTimeout = (fn, ms, ...args) => native(fn, Math.min(ms, 8), ...args);
    document.body.innerHTML = '<main id="explorer-audit" style="height:900px"></main>';
    const host = document.querySelector('#explorer-audit');
    const events = [];
    const mock = mount(host, { mission, learner: { name: 'Lan' }, onOpen: name => events.push(name) });
    const results = [];
    try {
      for (let i = 0; i < mission.steps.length; i++) {
        const before = host.innerHTML;
        const count = events.length;
        const observed = [];
        const observer = new MutationObserver(() => observed.push(host.textContent));
        observer.observe(host, { subtree: true, childList: true, characterData: true });
        await mock.demo(mission.steps[i].demo);
        observer.disconnect();
        results.push({ mission: mission.id, step: i + 1,
          effect: observed.some(text => i === 0 ? text.includes('About_Me_Lan.docx') : /Your file is opening in Word/.test(text)),
          noProgress: events.length === count,
          restored: host.innerHTML === before,
          cleanup: !host.querySelector('.wg-demo,.dm-layer') && host.querySelectorAll('.mk-ex').length === 1 });
        mock.resolve(mission.steps[i].spotlight)?.dispatchEvent(new MouseEvent(i ? 'dblclick' : 'click', { bubbles: true }));
      }
    } finally { mock.destroy(); window.setTimeout = native; }
    return results;
  });
}
