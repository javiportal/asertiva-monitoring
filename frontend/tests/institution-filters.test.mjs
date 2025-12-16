import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import url from 'node:url';

import { filterInstitutions } from '../src/utils/institutionFilters.js';

const currentDir = path.dirname(url.fileURLToPath(import.meta.url));
const catalogPath = path.resolve(currentDir, '../src/data/institutions.json');

const loadInstitutions = async () => {
  const raw = await fs.readFile(catalogPath, 'utf-8');
  return JSON.parse(raw);
};

test('filters by country code', async () => {
  const institutions = await loadInstitutions();
  const svInstitutions = filterInstitutions(institutions, 'SV', '');
  assert.equal(svInstitutions.every((inst) => inst.countryCode === 'SV'), true);
  assert.equal(svInstitutions.length, 4);
});

test('filters by search query (case-insensitive)', async () => {
  const institutions = await loadInstitutions();
  const matches = filterInstitutions(institutions, null, 'suprema');
  const names = matches.map((inst) => inst.name.toLowerCase());
  assert.ok(names.every((name) => name.includes('suprema')));
});

test('combines country and search filters including code matches', async () => {
  const institutions = await loadInstitutions();
  const filtered = filterInstitutions(institutions, 'GT', 'cc-gt');
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, 'Corte de Constitucionalidad');
});

