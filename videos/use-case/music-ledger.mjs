// Builds the use-case films' music from the downloaded originals: one excerpt per film, cut where
// the track is already playing (no quiet intro), the assignment of a distinct track to each film,
// and the license ledger. Run it again after a track or an assignment changes.
//
//   node videos/use-case/music-ledger.mjs --from=DIR
//
// DIR holds the originals and their tracks.json (id, title, artist, source_url, license,
// license_url, attribution, youtube_ok_evidence, notes). Writes audio/music/<id>.mp3,
// audio/music.json and audio/LICENSES.md. Fails when two films share a track, when a film has
// none, or when a license does not allow public YouTube and commercial web use.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { parseArgs } from '../../lib/paths.mjs';
import { AUDIO } from './mix.mjs';

// Each film's track, by the mood of its group (MOTION.md): coding agents on soft electronic pulses,
// SDKs on piano over light rhythm, free and cheap models on solo piano, keys on airy pads, MCP on
// still ambience. Every film a track of its own.
export const ASSIGN = {
  'claude-code': 'beauty-flow-macleod', grokbot: 'odyssey-macleod', opencode: 'perspectives-macleod',
  'coding-agents': 'nightwalk-airtone', 'hermes-agent': 'roboduck-airtone', 'claude-agent-sdk': 'sleepwalking-airtone',
  'claude-code-free-models': 'renovation-airtone', 'openrouter-free-in-your-tools': 'light-thought-var-1-macleod',
  'gemini-in-claude-code': 'northern-glade-macleod', 'free-coding-agent': 'sincerely-macleod', codex: 'diffusion-airtone',
  'ai-sdk': 'thinking-of-you-macleod', 'openai-sdk': 'dream-culture-macleod', 'unify-api': 'dreamer-macleod',
  'model-evals': 'inspired-macleod', 'agent-fallback': 'spacedust-airtone', 'embeddings-search': 'recreation-airtone',
  decisions: 'truth-onlymeith',
  'openrouter-free-fallback': 'starry-macleod', 'nvidia-nim-models': 'sapphire-isle-macleod', 'virtual-presets': 'facile-macleod',
  'nvidia-free-key': 'avec-soin-macleod', 'go-plan': 'clear-air-macleod', 'free-llm-api': 'too-quiet-piano-olddog',
  'free-chatbot': 'mellow-piano-doxent', 'cheapest-llm-api': 'nocturnal-doxent',
  'claude-code-multiple-keys': 'numinous-shine-macleod', 'donate-keys': 'winter-reflections-macleod', byok: 'silver-blue-light-macleod',
  'byok-anthropic': 'fresh-air-macleod', 'sign-in': 'preamble-airtone',
  'mcp-gateway': 'shimmer-airtone', 'mcp-for-agents': 'wisps-of-whorls-macleod',
};
// An excerpt is as long as the longest film can be, and a little more for its fade.
const EXCERPT = 64;
const OK_LICENSE = /^CC (BY [34]\.0|0)$/;

/** Where the track is already playing: the first second whose short-term loudness is within 6 dB of the whole. */
function startOf(file, length) {
  const out = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr;
  const I = Number([...out.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)[1]);
  const at = [...out.matchAll(/t:\s*([\d.]+)\s+TARGET.*?S:\s*(-?[\d.]+)/g)].map(m => ({ t: Number(m[1]), s: Number(m[2]) }));
  const hit = at.find(x => x.t >= 3 && x.s >= I - 6);
  return Math.min(Math.max(0, Math.floor((hit?.t ?? 0) - 3)), Math.max(0, Math.floor(length - EXCERPT - 1)));
}

function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  if (!flags.from) throw new Error('pass --from=DIR, the folder with the originals and tracks.json');
  const from = path.resolve(flags.from);
  const tracks = JSON.parse(fs.readFileSync(path.join(from, 'tracks.json'), 'utf8'));
  const byId = new Map(tracks.map(t => [t.id, t]));
  const used = Object.values(ASSIGN);
  const dup = used.find((t, i) => used.indexOf(t) !== i);
  if (dup) throw new Error(`${dup} is given to two films`);
  for (const id of used) {
    const t = byId.get(id);
    if (!t) throw new Error(`no track ${id} in tracks.json`);
    if (!OK_LICENSE.test(t.license)) throw new Error(`${id}: "${t.license}" is not a license this ledger accepts`);
  }
  const dir = path.join(AUDIO, 'music');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const out = { tracks: {}, films: {} };
  for (const id of [...new Set(used)].sort()) {
    const t = byId.get(id), src = fs.readdirSync(from).find(f => f.startsWith(`${id}.`));
    const at = startOf(path.join(from, src), t.duration_s);
    execFileSync('ffmpeg', ['-hide_banner', '-nostdin', '-y', '-ss', String(at), '-t', String(EXCERPT), '-i', path.join(from, src), '-map_metadata', '-1', '-ac', '2', '-ar', '44100', '-b:a', '128k', path.join(dir, `${id}.mp3`)], { stdio: 'ignore' });
    out.tracks[id] = { file: `${id}.mp3`, title: t.title, artist: t.artist, from: at, source: t.source_url, license: t.license, licenseUrl: t.license_url, attribution: t.attribution, evidence: t.youtube_ok_evidence, notes: t.notes };
    console.log(`  ${id.padEnd(30)} from ${String(at).padStart(3)}s  ${t.license}`);
  }
  for (const [slug, id] of Object.entries(ASSIGN).sort()) out.films[slug] = { track: id, start: 0 };
  fs.writeFileSync(path.join(AUDIO, 'music.json'), JSON.stringify(out, null, 1) + '\n');

  const md = [
    '# Use-case films: music and sound licenses',
    '',
    'Every film has a music bed of its own and the sound effects in `sfx/`. This file is written by',
    '`node videos/use-case/music-ledger.mjs`. Each track is an excerpt of the original (cut, faded, mixed',
    'under a voice), which its license allows with credit. **Put each film\'s credit lines in the YouTube',
    'description and the page that embeds it before publishing.** Kevin MacLeod\'s tracks are registered',
    'in YouTube Content ID (https://incompetech.com/music/royalty-free/youtube-contentid.html): with the',
    'credit in the description a claim is not expected, and a claim made anyway is released on dispute.',
    '',
    '## Per film',
    '',
    '| Film | Track | Artist | License | Excerpt from |',
    '|---|---|---|---|---|',
    ...Object.entries(out.films).map(([slug, f]) => { const t = out.tracks[f.track]; return `| ${slug} | [${t.title}](${t.source}) | ${t.artist} | [${t.license}](${t.licenseUrl}) | ${t.from}s |`; }),
    '',
    '## Credit lines',
    '',
    ...Object.entries(out.films).flatMap(([slug, f]) => [`**${slug}**`, '', '```', out.tracks[f.track].attribution, '```', '']),
    '## Why each license allows public YouTube and commercial web use',
    '',
    ...Object.entries(out.tracks).map(([id, t]) => `- \`${id}\`: ${t.evidence}`),
    '',
    '## Sound effects',
    '',
    'The files in `sfx/` (whoosh, whoosh-short, click-soft, ping, pop, key-press, chime) come from',
    '[Pixabay](https://pixabay.com/sound-effects/) under the [Pixabay Content License](https://pixabay.com/service/license-summary/),',
    'which allows commercial and non-commercial use, modification, and use in videos, with no attribution required.',
    'They were bundled with the HyperFrames media-use skill (`audio/assets/sfx/CREDITS.md`).',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(AUDIO, 'LICENSES.md'), md);
  console.log(`${Object.keys(out.films).length} films, ${Object.keys(out.tracks).length} tracks. Ledger: ${path.join(AUDIO, 'LICENSES.md')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
