import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { RELEASES } from './paths.mjs';
import { fingerprint, list, load } from './ledger.mjs';
import { IDS } from './renditions.mjs';

const kinds = fs.readdirSync(RELEASES).filter(k => fs.existsSync(path.join(RELEASES, k, 'index.json')));

test('every released film can be rebuilt from its record', () => {
  // `regen` re-renders the past from releases/<kind>/<id>/data.json alone. A row
  // whose facts are missing, or no longer hash to the row, can never pick up a
  // new look — and would be re-released under a second id if collected again.
  for (const kind of kinds) {
    for (const row of list(kind)) {
      const { data } = load(kind, row.id);
      assert.ok(data, `${kind}/${row.id} has data.json`);
      assert.equal(fingerprint(data.parts), row.hash, `${kind}/${row.id}: its facts are what its hash says`);
      assert.ok(row.title, `${kind}/${row.id} has a title for its Release`);
    }
  }
});

test('a rendered release lists its films per rendition, and nothing outside them', () => {
  // publish attaches and uploads exactly what `renditions` lists. A flat
  // artifact or a release-wide YouTube link would be a second answer to "which films".
  for (const kind of kinds) {
    for (const row of list(kind)) {
      if (!row.renderedAt) continue;
      assert.equal(row.artifact ?? row.cover ?? row.published?.youtube, undefined, `${kind}/${row.id} has no flat film fields`);
      assert.ok(row.renditions?.landscape, `${kind}/${row.id} has its landscape film`);
      for (const [id, film] of Object.entries(row.renditions)) {
        assert.ok(IDS.includes(id), `${kind}/${row.id}: "${id}" is a rendition`);
        assert.ok(film.artifact && film.cover, `${kind}/${row.id}: ${id} has a film and a cover`);
      }
    }
  }
});

test('a record holds only the inputs, never generated output', () => {
  // The generated composition ships as source.tar.gz on the Release; committing
  // it once put 11k lines a night into git.
  for (const kind of kinds) {
    for (const row of list(kind)) {
      const files = fs.readdirSync(path.join(RELEASES, kind, row.id)).sort();
      assert.deepEqual(files.filter(f => !['data.json', 'plan.json', 'manifest.json'].includes(f)), [], `${kind}/${row.id}`);
    }
  }
});
