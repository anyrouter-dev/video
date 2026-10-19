// Records real terminal output with per-line timing for the films:
//   node terminal.mjs [anyr|curl]
// curl runs read ANYROUTER_SMOKE_TEST_API_KEY from the environment. Keys and emails are
// replaced before anything is written.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = dirname(fileURLToPath(import.meta.url));
const DIR = join(OUT, 'terminal');
const PROMPT = 'Write a haiku about one API key for every model.';
const MASK = 'sk-ar-••••••••';

const RULES = [
  [/\bsk-[A-Za-z0-9_-]{8,}/g, MASK, 'API key'],
  [/\bsk-[a-z]+-\.\.\.[A-Za-z0-9]+/g, MASK, 'API key tail'],
  [/\bnvapi-[A-Za-z0-9_-]{8,}/g, 'nvapi-••••••••', 'API key'],
  [/\b([A-Za-z0-9._%+-]{1,3})[A-Za-z0-9._%+-]*@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '$1@••••', 'email address'],
  [/\b(user|org|acct)_[A-Za-z0-9]{12,}\b/g, '$1_••••••••', 'account id'],
];
function redact(text, hits) {
  const key = process.env.ANYROUTER_SMOKE_TEST_API_KEY;
  if (key && text.includes(key)) { hits.add('API key'); text = text.split(key).join(MASK); }
  for (const [re, to, what] of RULES) if (re.test(text)) { hits.add(what); text = text.replace(re, to); }
  return text;
}
const plain = s => s.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]|\x1b\][^\x07]*(\x07|\x1b\\)|\x1b[()][A-Z0-9]|\r/g, '');

function run(argv, { env } = {}) {
  return new Promise(resolve => {
    const t0 = performance.now();
    const child = spawn(argv[0], argv.slice(1), { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    const take = stream => d => chunks.push({ t: Math.round(performance.now() - t0), stream, text: d.toString() });
    child.stdout.on('data', take('stdout'));
    child.stderr.on('data', take('stderr'));
    child.on('close', (code, signal) => { resolve({ chunks, code, signal, ms: Math.round(performance.now() - t0) }); });
  });
}

const manifest = existsSync(join(OUT, 'manifest.json')) ? JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8')) : [];
function save(name, shown, result, shows, extra = {}) {
  mkdirSync(DIR, { recursive: true });
  const hits = new Set();
  const chunks = result.chunks.map(c => ({ ...c, text: redact(c.text, hits) }));
  const text = plain(chunks.map(c => c.text).join(''));
  const record = { command: redact(shown, hits), startedAt: extra.startedAt, durationMs: result.ms, exitCode: result.code,
    signal: result.signal, ...extra.fields, chunks };
  writeFileSync(join(DIR, `${name}.json`), JSON.stringify(record, null, 2) + '\n');
  writeFileSync(join(DIR, `${name}.txt`), `$ ${record.command}\n${text}`);
  for (const file of [`terminal/${name}.json`, `terminal/${name}.txt`]) {
    const entry = { file, kind: 'terminal', command: record.command, viewport: null, scale: null, shows,
      redacted: hits.size ? [...hits].join(', ') : 'none found', capturedAt: extra.startedAt };
    const i = manifest.findIndex(e => e.file === file);
    if (i >= 0) manifest[i] = entry; else manifest.push(entry);
  }
  manifest.sort((a, b) => a.file.localeCompare(b.file));
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(name, result.ms + 'ms', 'exit', result.code, [...hits]);
}

async function anyr() {
  const runs = [
    ['anyr-help', ['anyr', '--help'], 'The real output of anyr --help.'],
    ['anyr-help-commands', ['anyr', 'help', 'commands'], 'The real output of anyr help commands, the full command map.'],
    ['anyr-models', ['anyr', 'models'], 'The real output of anyr models, every model id usable with --model.'],
  ];
  for (const [name, argv, shows] of runs) {
    const startedAt = new Date().toISOString();
    save(name, argv.join(' '), await run(argv, { env: { NO_COLOR: '1' } }), shows, { startedAt });
  }
  // A real `anyr claude --model` prints nothing of its own: Claude Code owns the screen from the first byte.
  // --dry-run prints the handoff instead, the command and env anyr gives Claude Code.
  const model = 'anthropic/claude-sonnet-5-5';
  const startedAt = new Date().toISOString();
  save('anyr-claude-dry-run', `anyr claude --model ${model} --dry-run`,
    await run(['anyr', 'claude', '--model', model, '--dry-run'], { env: { NO_COLOR: '1' } }),
    `The handoff anyr claude --model ${model} makes: the claude command and the AnyRouter env it launches with.`, { startedAt });
}

async function curl() {
  const key = process.env.ANYROUTER_SMOKE_TEST_API_KEY;
  if (!key) throw new Error('ANYROUTER_SMOKE_TEST_API_KEY is not set');
  const models = ['anthropic/claude-sonnet-5-5', 'openai/gpt-5.5', 'deepseek/deepseek-v4-pro', 'anyrouter/auto', 'anyrouter/free'];
  for (const model of models) {
    const body = JSON.stringify({ model, messages: [{ role: 'user', content: PROMPT }] });
    const argv = ['curl', '-sS', 'https://anyrouter.dev/api/v1/chat/completions',
      '-H', `Authorization: Bearer ${key}`, '-H', 'Content-Type: application/json', '-d', body,
      '-w', '\n__timing__ http=%{http_code} ttfb=%{time_starttransfer} total=%{time_total}\n'];
    const shown = `curl -sS https://anyrouter.dev/api/v1/chat/completions -H "Authorization: Bearer ${MASK}" -H "Content-Type: application/json" -d '${body}'`;
    const startedAt = new Date().toISOString();
    const result = await run(argv);
    const out = result.chunks.filter(c => c.stream === 'stdout').map(c => c.text).join('');
    const [, responseBody, timing] = out.match(/^([\s\S]*)\n__timing__ (.*)\n$/) || [, out, ''];
    const t = Object.fromEntries(timing.split(' ').filter(Boolean).map(kv => kv.split('=')));
    result.chunks = [{ t: Math.round(Number(t.total || 0) * 1000), stream: 'stdout', text: responseBody }];
    let answer = null, servedBy = null;
    try { const j = JSON.parse(responseBody); answer = j.choices?.[0]?.message?.content ?? null; servedBy = j.model ?? null; } catch {}
    const name = 'curl-' + model.replace(/[^a-z0-9.]+/gi, '-');
    save(name, shown, result, `A real chat completion for ${model} with the haiku prompt; the exact response body and its latency.`, {
      startedAt, fields: { request: { model, messages: [{ role: 'user', content: PROMPT }] }, httpStatus: Number(t.http),
        latencyMs: { firstByte: Math.round(Number(t.ttfb) * 1000), total: Math.round(Number(t.total) * 1000) }, servedBy, answer, responseBody } });
  }
}

const only = process.argv[2];
if (!only || only === 'anyr') await anyr();
if (!only || only === 'curl') await curl();
