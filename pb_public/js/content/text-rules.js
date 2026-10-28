// Incidental commas and full stops must not block a Word skill. Keep numeric punctuation.
import { createDoc, textOf } from '../word/model.js';
import { esc } from '../i18n.js';

const normalizeSpacing = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');
const documentText = (value) => typeof value === 'string' ? value : textOf(createDoc(value));
const escapePattern = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function practiceText(value) {
  return normalizeSpacing(String(value ?? '').replace(/(?<!\d)[.,]|[.,](?!\d)/g, ''));
}

export function punctuationReminder(actual, expected) {
  if (expected == null) return null;
  const actualText = normalizeSpacing(documentText(actual)).toLowerCase();
  const expectedText = normalizeSpacing(documentText(expected)).toLowerCase();
  if (actualText === expectedText || practiceText(actualText) !== practiceText(expectedText)) return null;
  return {
    en: 'Well done! A small tip for next time: check the full stops (.) and commas (,) in the example.',
    vi: 'Bạn làm tốt lắm! Lần sau, nhớ kiểm tra dấu chấm (.) và dấu phẩy (,) trong câu mẫu nhé.',
  };
}

/** Emphasise known text in instructions, without interpreting content as HTML. */
export function instructionPair(pair, owner = {}) {
  const script = owner.demo ?? owner.replay?.script ?? [];
  const examples = [...(owner.accept ?? []), ...script.filter(s => typeof s.type === 'string').map(s => s.type)];
  if (owner.targetDoc != null) examples.push(...textOf(createDoc(owner.targetDoc)).split('\n'));
  const values = [...new Set(examples.map(s => s.trim()).filter(s => s.length > 1))].sort((a, b) => b.length - a.length);
  const pattern = values.map(escapePattern).join('|');
  const format = text => {
    if (!pattern) return esc(text);
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, 'gu');
    let html = '', start = 0;
    for (const match of text.matchAll(re)) {
      html += esc(text.slice(start, match.index));
      const quoted = /["“]$/.test(text.slice(0, match.index)) && /^["”]/.test(text.slice(match.index + match[0].length));
      html += `<strong>${quoted ? '' : '&quot;'}${esc(match[0])}${quoted ? '' : '&quot;'}</strong>`;
      start = match.index + match[0].length;
    }
    return html + esc(text.slice(start));
  };
  return `${format(pair.en)}<span class="vi">${format(pair.vi)}</span>`;
}
