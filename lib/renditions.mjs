/**
 * renditions — the shapes every film ships in. The render, the ledger row, the
 * Release notes and the YouTube upload all read this one table.
 *
 * A film is authored once, at 1920x1080. The portrait project is a copy that
 * shared/authoring/portrait.mjs writes from it, with the stage sizes swapped; it
 * fails on any landscape size the frames left behind. A vertical upload under three
 * minutes becomes a YouTube Short. Reels and TikTok have no upload API here, so
 * their file is the portrait mp4 on the GitHub Release, posted by hand.
 *
 *   id           the key in a ledger row's `renditions`, and the --rendition value
 *   label        what the file is for, as the Release notes say it
 *   titleSuffix  appended to the YouTube title
 *   fileSuffix   appended to the file name, here and on the Release
 *   write        landscape project → this rendition's project (dest is scratch)
 */
import { PORTRAIT, writePortrait } from '../shared/authoring/portrait.mjs';

export const RENDITIONS = [
  {
    id: 'landscape', width: 1920, height: 1080,
    label: 'for YouTube and the web',
    titleSuffix: '', fileSuffix: '',
    write: src => src,
  },
  {
    id: 'portrait', ...PORTRAIT,
    label: 'for YouTube Shorts, and to post by hand on Instagram Reels and TikTok',
    titleSuffix: ' #Shorts', fileSuffix: '-portrait',
    write: writePortrait,
  },
];

const BY_ID = new Map(RENDITIONS.map(r => [r.id, r]));
export const IDS = RENDITIONS.map(r => r.id);

export function rendition(id) {
  const r = BY_ID.get(id);
  if (!r) throw new Error(`unknown rendition "${id}" — have ${IDS.join(', ')}`);
  return r;
}
