// Small, bundled practice templates; no network lookup or personal information.
import { createDoc } from './model.js';
export const TEMPLATES = Object.freeze([
  { id: 'resume', name: 'Simple resume', search: 'resume cv job', lines: ['[Your name]', 'Phone: 0400 123 456 | Melbourne', 'Skills:', '[Your skills]', '[Optional interests]'] },
  { id: 'list', name: 'Shopping list', search: 'list shopping groceries', lines: ['Shopping list', '[Item 1]', '[Item 2]'] },
  { id: 'flyer', name: 'Community flyer', search: 'flyer community event', lines: ['[Event name]', '[Date and time]', '[Place]'] },
]);
export function templateDoc(id) {
  const template = TEMPLATES.find(t => t.id === id);
  if (!template) throw new RangeError(`Unknown template: ${id}`);
  return createDoc({ p: template.lines.map((text, i) => ({
    ...(text.startsWith('[') ? { placeholder: text } : {}),
    runs: [{ text, ...(i === 0 ? { size: 20, b: true } : {}) }],
  })) });
}
