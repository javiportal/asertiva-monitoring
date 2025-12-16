import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import url from 'node:url';

const currentDir = path.dirname(url.fileURLToPath(import.meta.url));
const catalogPath = path.resolve(currentDir, '../src/data/institutions.json');

const loadInstitutions = async () => {
  const raw = await fs.readFile(catalogPath, 'utf-8');
  return JSON.parse(raw);
};

test('includes the complete catalog', async () => {
  const institutions = await loadInstitutions();
  assert.equal(institutions.length, 63);
});

test('provides examples for every country', async () => {
  const institutions = await loadInstitutions();
  const expectedSamples = {
    SV: 'Corte Suprema de Justicia',
    GT: 'Corte de Constitucionalidad',
    CO: 'Consejo de Estado',
    CR: 'Ministerio de Salud',
    MX: 'Servicio de Administración Tributaria',
  };

  const namesByCountry = institutions.reduce((acc, institution) => {
    if (!acc[institution.countryCode]) {
      acc[institution.countryCode] = [];
    }
    acc[institution.countryCode].push(institution.name);
    return acc;
  }, {});

  for (const [country, sample] of Object.entries(expectedSamples)) {
    assert.ok(namesByCountry[country], `Missing country ${country}`);
    assert.ok(
      namesByCountry[country].includes(sample),
      `Expected ${sample} in country ${country}`
    );
  }
});
