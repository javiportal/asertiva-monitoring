/**
 * Filter institutions by country and search query.
 * @param {Array<{id: string, name: string, type: string, countryCode: string}>} institutions
 * @param {string | null} countryFilter Country code to match (e.g. "CO").
 * @param {string} searchQuery Free-text query to match against name or id.
 * @returns {Array<{id: string, name: string, type: string, countryCode: string}>}
 */
export function filterInstitutions(institutions, countryFilter, searchQuery) {
  const normalizedQuery = (searchQuery || '').trim().toLowerCase();

  return institutions.filter((institution) => {
    const matchesCountry = countryFilter
      ? institution.countryCode.toLowerCase() === countryFilter.toLowerCase()
      : true;

    const searchableText = `${institution.name} ${institution.id}`.toLowerCase();
    const matchesQuery = normalizedQuery
      ? searchableText.includes(normalizedQuery)
      : true;

    return matchesCountry && matchesQuery;
  });
}
