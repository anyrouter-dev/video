// Records the voice of the weekly film for one week, with the local Kokoro voice
// (shared/authoring/narrate.mjs). A line whose words and voice match its recording is skipped.
//
//   KOKORO_PYTHON=… node videos/weekly/voice.mjs [--week=YYYY-Www] [--from=FILE] [--llms-from=FILE] [--dry-run]
import { parseArgs } from '../../lib/paths.mjs';
import { voiceLines } from '../../shared/authoring/narrate.mjs';
import kind, { VOICE, VOICE_DIR } from './kind.mjs';
import { scriptOf } from './week.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const w = await kind.collect({ flags });
voiceLines(VOICE_DIR, VOICE, scriptOf(w), { dry: !!flags['dry-run'] });
