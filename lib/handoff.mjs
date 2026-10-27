/**
 * handoff — turn a rendered release into a posting.anyrouter.dev draft folder.
 *
 * This repo never posts. The nightly run leaves a draft GitHub Release and, per
 * release, `handoff/<tag>/` (post.md plus the landscape film and its cover) in
 * the run's `posting-drafts` artifact. The owner, or an agent, pushes that
 * folder into posting as a DRAFT with the AnyRouter repo's
 * `npx tsx scripts/posting-draft.ts <folder>`; the owner reviews and publishes
 * it there. The folder format is that repo's .claude/skills/posting-draft/SKILL.md.
 *
 * The folder also holds `posting.json` (POSTING_FILM_SCHEMA): the same draft as
 * posting's AgentDraft JSON, plus the film's file name, sha256 and size. When
 * posting dispatches the render, it reads that file straight out of the
 * `posting-drafts` artifact, so the file is the contract between the two repos.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { STATE } from './paths.mjs';
import { load, tagOf } from './ledger.mjs';
import { releaseFiles } from './publish.mjs';

export const HANDOFF = path.join(STATE, 'handoff');

export const POSTING_FILM_SCHEMA = 'anyrouter.posting-film/v1';

const yamlString = s => JSON.stringify(String(s));

/**
 * posting.json. `draft` must parse with posting's AgentDraftSchema (strict), so
 * it carries only the fields that schema has; the rest sit beside it.
 */
export function postingFilm({ kind, tag, headline, link, share, notes, film, cover, modelIds, rendition }) {
  const youtube = { title: headline.slice(0, 100), description: [share, link].filter(Boolean).join('\n\n') };
  return {
    schema: POSTING_FILM_SCHEMA,
    kind,
    tag,
    model_ids: modelIds,
    film: { file: film.name, sha256: film.sha256, bytes: film.bytes, width: rendition.width, height: rendition.height },
    cover,
    draft: {
      external_ref: tag,
      title: headline.slice(0, 200),
      ...(notes.length && { brief: notes.join('\n\n') }),
      link,
      variants: {
        x: [share || headline, link].join('\n\n'),
        linkedin: [headline, share, link].filter(Boolean).join('\n\n'),
        youtube,
      },
      media: [{ ref: film.sha256, kind: 'video', mime: 'video/mp4', bytes: film.bytes, alt: headline.slice(0, 1000) }],
    },
  };
}

/** The post.md text: facts and AI copy are a starting point the owner edits in review. */
export function postMarkdown({ tag, headline, link, share, notes, film, cover }) {
  const media = [film, cover].filter(Boolean);
  return [
    '---',
    `external_ref: ${yamlString(tag)}`,
    `title: ${yamlString(headline)}`,
    `link: ${yamlString(link)}`,
    `media: [${media.map(yamlString).join(', ')}]`,
    '---',
    [headline, ...notes].join('\n\n'),
    '',
    '## x',
    [share || headline, link].join('\n\n'),
    '',
    '## youtube',
    headline.slice(0, 100),
    [share, link].filter(Boolean).join('\n\n'),
    '',
  ].join('\n');
}

/** Writes handoff/<tag>/ for one rendered release and returns the folder. */
export function handoff(kind, entry) {
  const { data, plan } = load(kind.id, entry.id);
  const tag = tagOf(kind.id, entry.id);
  const lead = releaseFiles(kind, entry).find(f => f.onDisk);
  if (!lead) throw new Error(`${tag}: no film on disk to hand off`);
  const dir = path.join(HANDOFF, tag);
  fs.mkdirSync(dir, { recursive: true });
  const film = path.basename(lead.name);
  fs.copyFileSync(lead.file, path.join(dir, film));
  let cover = null;
  if (lead.cover && fs.existsSync(lead.cover)) {
    cover = path.basename(lead.coverName);
    fs.copyFileSync(lead.cover, path.join(dir, cover));
  }
  const copy = {
    tag,
    headline: kind.headline(data, plan),
    link: kind.link?.(data) ?? 'https://anyrouter.dev',
    share: plan.share,
    notes: kind.notes(data, plan),
  };
  fs.writeFileSync(path.join(dir, 'post.md'), postMarkdown({ ...copy, film, cover }));
  const bytes = fs.readFileSync(lead.file);
  fs.writeFileSync(path.join(dir, 'posting.json'), `${JSON.stringify(postingFilm({
    ...copy,
    kind: kind.id,
    film: { name: film, sha256: crypto.createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length },
    cover,
    modelIds: kind.modelIds?.(data) ?? [],
    rendition: lead.rendition,
  }), null, 2)}\n`);
  console.log(`handoff  ${path.relative(STATE, dir)}/  (push it to posting with scripts/posting-draft.ts)`);
  return dir;
}
