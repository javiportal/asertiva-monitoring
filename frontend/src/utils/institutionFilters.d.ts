import type { Institution } from "../components/InstitutionCheckboxes";

export declare function normalizeInstitutionText(text: string): string;
export declare function filterInstitutions(
    institutions: Institution[],
    countryFilter: string | null,
    searchQuery: string,
): Institution[];
