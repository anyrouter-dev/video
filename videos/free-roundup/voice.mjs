// Records the voice of the free-roundup film for the list collected now (or from --from), with
// the local Kokoro voice (shared/authoring/narrate.mjs). A line whose words and voice match its
// recording is skipped.
//
//   KOKORO_PYTHON=… node videos/free-roundup/voice.mjs [--from=FILE] [--now=YYYY-MM-DD] [--dry-run]
import { parseArgs } from '../../lib/paths.mjs';
import { voiceLines } from '../../shared/authoring/narrate.mjs';
import kind, { VOICE, VOICE_DIR, scriptOf } from './kind.mjs';

const { flags } = parseArgs(process.argv.slice(2));
const d = await kind.collect({ flags });
voiceLines(VOICE_DIR, VOICE, scriptOf(d), { dry: !!flags['dry-run'] });
