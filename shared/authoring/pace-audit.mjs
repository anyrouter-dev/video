// Measures a rendered film's pace and fails on dead air: any span where the picture holds still
// longer than --max-hold seconds, outside the closing card. Also reports how fast the voice
// speaks, from the film's audio_meta.json when one is given.
//
//   node shared/authoring/pace-audit.mjs <film.mp4> [--meta=videos/<kind>/audio_meta.json]
//     [--max-hold=1.5] [--end-hold=3] [--json]
//
// A hold is ffmpeg's freezedetect: no pixel changes by more than -50 dB for the span. The
// closing card is allowed --end-hold seconds, because a lockup is meant to sit still.
import fs from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function parseHolds(stderr) {
  const holds = [];
  let start = null;
  for (const line of stderr.split('\n')) {
    const s = /freeze_start: ([\d.]+)/.exec(line);
    if (s) start = Number(s[1]);
    const e = /freeze_end: ([\d.]+)/.exec(line);
    if (e && start != null) {
      holds.push({ start, end: Number(e[1]) });
      start = null;
    }
  }
  return { holds, openStart: start };
}

export function judge({ duration, holds, maxHold, endHold }) {
  const spans = holds.map(h => ({ ...h, seconds: +(h.end - h.start).toFixed(2) }));
  const tooLong = spans.filter(h => {
    const atEnd = duration - h.end < 0.2;
    return h.seconds > (atEnd ? endHold : maxHold);
  });
  return { spans, tooLong, ok: tooLong.length === 0 };
}

export function speechRate(meta) {
  const words = meta.voices.flatMap(v => v.words);
  const spoken = meta.voices.reduce((s, v) => s + v.duration_s, 0);
  return { words: words.length, seconds: +spoken.toFixed(1), wpm: Math.round(words.length / (spoken / 60)) };
}

function main() {
  const argv = process.argv.slice(2);
  const film = argv.find(a => !a.startsWith('--'));
  const flag = (k, d) => argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
  if (!film || !fs.existsSync(film)) throw new Error('usage: pace-audit.mjs <film.mp4> [--meta=audio_meta.json]');
  const maxHold = Number(flag('max-hold', 1.5));
  const endHold = Number(flag('end-hold', 3));

  const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', film], { encoding: 'utf8' }));
  const run = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', film, '-an', '-vf', `freezedetect=n=-50dB:d=${Math.min(maxHold, 1)}`, '-f', 'null', '-'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`ffmpeg failed: ${run.stderr.slice(-400)}`);
  const { holds, openStart } = parseHolds(run.stderr);
  if (openStart != null) holds.push({ start: openStart, end: duration });

  const verdict = judge({ duration, holds, maxHold, endHold });
  const meta = flag('meta') && JSON.parse(fs.readFileSync(flag('meta'), 'utf8'));
  const report = { film, duration: +duration.toFixed(2), maxHold, endHold, ...verdict, speech: meta ? speechRate(meta) : null };

  if (argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else {
    console.log(`${film}  ${report.duration}s`);
    if (report.speech) console.log(`  voice   ${report.speech.words} words in ${report.speech.seconds}s, ${report.speech.wpm} wpm`);
    for (const h of verdict.spans) console.log(`  hold    ${h.start.toFixed(2)}-${h.end.toFixed(2)}s  ${h.seconds}s${verdict.tooLong.includes(h) ? '  TOO LONG' : ''}`);
    console.log(verdict.ok ? '  pace ok' : `  FAIL: ${verdict.tooLong.length} hold(s) over ${maxHold}s`);
  }
  process.exit(verdict.ok ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
