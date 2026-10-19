// Pads each narration line with trailing silence: a breath between lines so frames don't
// run sentences together, and a longer hold after the last line for the end card.
//
//   node ../../shared/authoring/pad-voices.mjs [--beat=0.5 --phase=0.059] [--hold=4:0.5,…]
//
// With --beat (seconds per beat) and --phase (the first beat, from `hyperframes beats`), each
// breath is stretched so the next line, and so the next frame, starts on a beat of the music.
// --hold=FRAME:SECONDS keeps a frame on screen at least that long after its line ends, for a
// frame that shows something to read once the voice has moved on.
// Idempotent: a voice keeps its unpadded length in raw_s and is always padded from that.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const BREATH_S = 0.4;
const MIN_BREATH_S = 0.25;
const END_HOLD_S = 2.5;

/** The pad after each line: a fixed breath, or the shortest one that puts the next line on a beat. */
export function pads(raws, { beat, phase = 0, holds = [] } = {}) {
  let at = 0;
  return raws.map((raw, i) => {
    const hold = holds[i] ?? 0;
    if (i === raws.length - 1) return Math.max(END_HOLD_S, hold);
    if (!beat) return Math.max(BREATH_S, hold);
    const end = at + raw + Math.max(MIN_BREATH_S, hold);
    const next = phase + Math.ceil((end - phase) / beat - 1e-9) * beat;
    const pad = +(next - at - raw).toFixed(3);
    at = next;
    return pad;
  });
}

function main() {
  const flag = k => Number(process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1]) || undefined;
  const meta = JSON.parse(fs.readFileSync('audio_meta.json', 'utf8'));
  const voices = [...meta.voices].sort((a, b) => Number(a.frame) - Number(b.frame));
  const raw = v => v.raw_s ?? +(v.duration_s - (v.padded_s ?? 0)).toFixed(3);
  const holdBy = new Map((process.argv.find(a => a.startsWith('--hold='))?.slice('--hold='.length).split(',') ?? [])
    .map(pair => pair.split(':').map(Number)));
  const plan = pads(voices.map(raw), { beat: flag('beat'), phase: flag('phase'), holds: voices.map(v => holdBy.get(Number(v.frame))) });

  voices.forEach((v, i) => {
    const pad = plan[i];
    v.raw_s = raw(v);
    if (v.padded_s === pad) return;
    const tmp = `${v.path}.tmp.wav`;
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', v.path, '-af', `atrim=0:${v.raw_s},apad=pad_dur=${pad}`, tmp]);
    fs.renameSync(tmp, v.path);
    const dur = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', v.path], { encoding: 'utf8' }));
    v.duration_s = +dur.toFixed(3);
    v.padded_s = pad;
    console.log(`voice ${v.frame}: ${v.duration_s}s (pad ${pad}s)`);
  });
  fs.writeFileSync('audio_meta.json', JSON.stringify(meta, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
