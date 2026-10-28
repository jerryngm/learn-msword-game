// Opt-in browser regression; ordinary node --test runs never launch a browser.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { runHelpAudit, runExplorerHelpAudit } from './help-demonstration-audit.mjs';

export async function runBrowserAudit() {
  const require = createRequire(process.env.HELP_AUDIT_RUNTIME || pathToFileURL(`${process.cwd()}/package.json`));
  const { chromium } = require('playwright');
  const browser = await chromium.launch({ headless: true, channel: process.env.HELP_AUDIT_CHANNEL || 'chrome' });
  const results = [];
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion });
      await page.route('**/api/**', route => ['GET', 'HEAD', 'OPTIONS'].includes(route.request().method()) ? route.continue() : route.abort());
      await page.goto(process.env.HELP_AUDIT_URL || 'http://127.0.0.1:8090');
      const word = await runHelpAudit(page);
      const explorer = await runExplorerHelpAudit(page);
      results.push({ reducedMotion, word, explorer });
      await page.close();
    }
    const output = process.env.HELP_AUDIT_OUTPUT || '/tmp/help-demonstration-audit.json';
    await writeFile(output, JSON.stringify(results, null, 2));
    const failures = results.flatMap(({ reducedMotion, word, explorer }) => [
      ...word.filter(r => !r.prerequisiteValid || !r.documentPreserved || !r.selectionPreserved || !r.hint || !r.yourTurn || !r.cleanup || r.warnings.length || r.eventsDuringDemo.length || (r.requiresDocumentEffect && !r.observedExpectedEffect)).map(r => ({ reducedMotion, mission: r.mission, step: r.step })),
      ...explorer.filter(r => !r.effect || !r.noProgress || !r.restored || !r.cleanup).map(r => ({ reducedMotion, ...r })),
    ]);
    console.log(JSON.stringify({ wordSteps: results.reduce((n, r) => n + r.word.length, 0), explorerSteps: results.reduce((n, r) => n + r.explorer.length, 0), failures, output }, null, 2));
    if (failures.length) process.exitCode = 1;
    return results;
  } finally { await browser.close(); }
}

if (!process.env.NODE_TEST_CONTEXT && process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await runBrowserAudit();
