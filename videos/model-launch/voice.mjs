// Records the voice of every model-launch film that has a line without a recording, with the
// local Kokoro voice (shared/authoring/narrate.mjs). A line whose words and voice match its
// recording is skipped, so a rerun voices only what changed.
//
//   KOKORO_PYTHON=… node videos/model-launch/voice.mjs [--model=a,b] [--from=FILE] [--now=YYYY-MM-DD] [--dry-run] [--prune]
//
// --prune removes recordings no film of this run speaks; pass it only with every film in the run.
import path from 'node:path';
import { parseArgs } from '../../lib/paths.mjs';
import { voiceLines, pruneVoices } from '../../shared/authoring/narrate.mjs';
import kind, { VOICE, VOICE_DIR } from './kind.mjs';
import { scriptOf } from './script.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const data = await kind.collect({ flags });
const lines = data.films.flatMap(f => scriptOf(f));
const keep = voiceLines(VOICE_DIR, VOICE, lines, { dry: !!flags['dry-run'] });
if (flags.prune && !flags['dry-run']) console.log(`removed ${pruneVoices(VOICE_DIR, keep)} files no film speaks`);
console.log(`voice: ${path.relative(process.cwd(), VOICE_DIR)}`);
