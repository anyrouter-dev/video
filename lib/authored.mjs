/**
 * authored — the collect() every hand-authored kind shares.
 *
 * An authored film's identity is its content: the hash of every file the
 * render reads. Editing the film is a new release; re-running without edits is
 * not. `version` in its meta.json is the human label (v1, v2, …).
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Relative posix paths of every file under `p`, sorted; [] when it does not exist. */
function filesUnder(dir, p) {
  const abs = path.join(dir, p);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [p];
  return fs.readdirSync(abs)
    .filter(n => n !== '.DS_Store')
    .flatMap(n => filesUnder(dir, `${p}/${n}`));
}

/** `inputs` lists everything the render depends on. Scratch (renders/, …) must not be in it. */
export function collectAuthored(dir, inputs) {
  const name = path.basename(dir);
  const files = inputs.flatMap(p => filesUnder(dir, p)).sort();
  const parts = files.map(f => `${f}:${sha256(path.join(dir, f))}`);

  const { version } = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
  if (!Number.isInteger(version)) throw new Error(`videos/${name}/meta.json needs an integer "version"`);

  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const seconds = parseFloat(/data-duration="([\d.]+)"/.exec(html)?.[1]);
  if (!seconds) throw new Error(`videos/${name}/index.html has no data-duration on its root`);

  return { notable: true, label: `v${version}`, parts, version, seconds };
}
