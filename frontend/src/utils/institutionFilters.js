/**
 * Filter institutions by country and search query.
 * @param {Array<{id: string, name: string, type: string, countryCode: string}>} institutions
 * @param {string | null} countryFilter Country code to match (e.g. "CO").
 * @param {string} searchQuery Free-text query to match against name or id.
 * @returns {Array<{id: string, name: string, type: string, countryCode: string}>}
 */
const COUNTRY_NAMES = {
  CO: 'colombia',
  CR: 'costa rica',
  SV: 'el salvador',
  GT: 'guatemala',
  HN: 'honduras',
  PE: 'peru',
  MX: 'mexico',
};

function normalizeText(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function filterInstitutions(institutions, countryFilter, searchQuery) {
  const normalizedQuery = normalizeText(searchQuery);
  const queryTerms = normalizedQuery.split(/\s+/).filter(Boolean);

  return institutions.filter((institution) => {
    const matchesCountry = countryFilter
      ? (institution.countryCode || '').toLowerCase() === countryFilter.toLowerCase()
      : true;

    const countryName = COUNTRY_NAMES[institution.countryCode] || '';
    const searchableText = normalizeText(
      `${institution.name} ${institution.id} ${institution.type} ${countryName}`
    );

    const matchesQuery = queryTerms.length
      ? queryTerms.every((term) => searchableText.includes(term))
      : true;

    return matchesCountry && matchesQuery;
  });
}

