// Free practice (#/free): a blank document with every built ribbon tab, no goal and no score.
import { mountWord } from "../word/index.js";
import { bi, biPair, label, labelPair } from "../i18n.js";

const TIP = { en: "Try any button. Undo is always here ↶", vi: "Cứ thử bấm bất kỳ nút nào. Nút Undo luôn ở đây ↶" };
const UNDO = { en: "↶ Undo", vi: "Hoàn tác" };

function initialsOf(name) {
  const words = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  // Array.from takes whole code points, so a name starting with an emoji keeps its glyph.
  return words.map((w) => Array.from(w)[0]).slice(0, 2).join("");
}

export function render(root, { learner } = {}) {
  root.innerHTML = `
    <main class="wg-free">
      <header class="wg-free-bar">
        <span class="wg-free-ico" aria-hidden="true">✏️</span>
        <h1>${bi("freeTitle")}</h1>
        <p>${biPair(TIP)}</p>
        <button type="button" class="btn-sm" id="freeUndo" aria-label="${labelPair(UNDO)}">${biPair(UNDO)}</button>
        <a class="btn-sm" href="#/home" aria-label="${label("backHome")}">🏠 ${bi("backHome")}</a>
      </header>
      <div class="wg-free-host" id="freeHost"></div>
    </main>`;

  const word = mountWord(root.querySelector("#freeHost"), { doc: "", tabs: ["home"], title: "Document1", initials: initialsOf(learner?.name) });
  // Go through the engine's own Undo button so this one behaves the same: a `command` event,
  // and the "Nothing to undo yet" toast when the history is empty.
  root.querySelector("#freeUndo").addEventListener("click", () => {
    root.querySelector('#freeHost [data-cmd="qat.undo"]')?.click();
    word.focus();
  });
  // The ribbon keeps page focus with mousedown.preventDefault; do the same for the Undo button.
  root.querySelector("#freeUndo").addEventListener("mousedown", (e) => e.preventDefault());

  return () => word.destroy();
}
