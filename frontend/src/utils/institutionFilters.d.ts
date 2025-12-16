import type { Institution } from "../components/InstitutionCheckboxes";

export declare function filterInstitutions(
    institutions: Institution[],
    countryFilter: string | null,
    searchQuery: string,
): Institution[];
