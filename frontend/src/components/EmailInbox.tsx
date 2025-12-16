// EmailInbox.tsx - Email inbox view using real API data
import { useEffect, useMemo, useState } from 'react';
import { Mail, Search, Star, Building2, Calendar, Clock } from 'lucide-react';
import institutionsCatalog from '../data/institutions.json';
import { normalizeInstitutionText } from '../utils/institutionFilters.js';
import { type Change } from './ChangesTable';

type EmailInboxProps = {
    changes: Change[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    countryFilter: string | null;
    importanceFilter: 'all' | 'important' | 'not_important';
    onImportanceFilterChange: (filter: 'all' | 'important' | 'not_important') => void;
    selectedInstitutions: string[];
    onSelectChange: (change: Change) => void;
    selectedChangeId: number | null;
};

type InstitutionCatalogItem = {
    id: string;
    name: string;
    type: string;
    countryCode: string;
};

const COUNTRY_LABELS: Record<string, string> = {
    CO: 'Colombia',
    CR: 'Costa Rica',
    SV: 'El Salvador',
    GT: 'Guatemala',
    HN: 'Honduras',
    PE: 'Perú',
    MX: 'México',
    PA: 'Panamá',
    INTERNATIONAL: 'Tendencias Internacionales',
    LEGISLATIVE: 'Monitoreo Legislativo',
};

const COUNTRY_CODE_TOKENS = new Set(['co', 'cr', 'sv', 'gt', 'hn', 'pe', 'mx', 'pa']);

const normalizeInstitutionValue = (text: string | null | undefined) => {
    const normalized = normalizeInstitutionText(text ?? '');
    return normalized.length > 2 ? normalized : '';
};

const buildInstitutionTermsById = () => {
    const lookup = new Map<string, string[]>();
    (institutionsCatalog as InstitutionCatalogItem[]).forEach((inst) => {
        const terms = new Set<string>();
        const normalizedName = normalizeInstitutionValue(inst.name);
        if (normalizedName) terms.add(normalizedName);

        const normalizedId = normalizeInstitutionValue(inst.id);
        if (normalizedId) terms.add(normalizedId);

        inst.id.split('-').forEach((part) => {
            const normalizedPart = normalizeInstitutionValue(part);
            if (normalizedPart && !COUNTRY_CODE_TOKENS.has(normalizedPart)) {
                terms.add(normalizedPart);
            }
        });

        lookup.set(inst.id, Array.from(terms));
    });
    return lookup;
};

const INSTITUTION_TERMS_BY_ID = buildInstitutionTermsById();

// Helper to format date
function formatDate(dateStr: string): { date: string; time: string } {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return { date: '-', time: '-' };
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('es-ES', { month: 'short' });
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return { date: `${day} ${month}`, time: `${hours}:${minutes}` };
}

// Known countries in the system
const KNOWN_COUNTRIES: Record<string, string> = {
    'colombia': 'Colombia',
    'el salvador': 'El Salvador',
    'guatemala': 'Guatemala',
    'honduras': 'Honduras',
    'perú': 'Perú',
    'peru': 'Perú',
    'méxico': 'México',
    'mexico': 'México',
    'costa rica': 'Costa Rica',
    'panamá': 'Panamá',
    'panama': 'Panamá',
    'nicaragua': 'Nicaragua',
    'república dominicana': 'República Dominicana',
    'argentina': 'Argentina',
    'chile': 'Chile',
    'ecuador': 'Ecuador',
    'bolivia': 'Bolivia',
    'venezuela': 'Venezuela',
    'uruguay': 'Uruguay',
    'paraguay': 'Paraguay',
};

// Extract country from text
function extractCountryFromText(text: string): string | null {
    const lowerText = text.toLowerCase();
    for (const [key, value] of Object.entries(KNOWN_COUNTRIES)) {
        if (lowerText.includes(key)) {
            return value;
        }
    }
    return null;
}

// Known institution patterns to extract
const INSTITUTION_PATTERNS = [
    // Colombian institutions
    /\b(INVIMA|Invima)\b/gi,
    /\b(DIAN|Dian)\b/gi,
    /\b(Superintendencia\s+de\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/gi,
    /\b(Ministerio\s+de\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/gi,
    /\b(Secretaría\s+de\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/gi,
    /\b(Corte\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/gi,
    /\b(Congreso\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]*)/gi,
    /\b(Asamblea\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/gi,
    /\b(Banco\s+Central\s*[A-Za-záéíóúñÁÉÍÓÚÑ\s]*)/gi,
    /\b(Diario\s+Oficial\s*[A-Za-záéíóúñÁÉÍÓÚÑ\s]*)/gi,
    /\b(Comisión\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/gi,
    /\b(Instituto\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/gi,
    /\b(Agencia\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/gi,
    /\b(Procuraduría\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/gi,
    /\b(Contraloría\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/gi,
    /\b(Fiscalía\s+[A-Za-záéíóúñÁÉÍÓÚÑ\s]+)/gi,
    /\b(SAT|Sat)\b/gi,
    /\b(SII|Sii)\b/gi,
    /\b(SUNAT|Sunat)\b/gi,
    /\b(BCR|Bcr)\b/gi,
];

// Extract institution from text
function extractInstitutionFromText(text: string): string | null {
    for (const pattern of INSTITUTION_PATTERNS) {
        const match = text.match(pattern);
        if (match && match[0]) {
            // Clean up the match (remove extra spaces, limit length)
            let institution = match[0].trim().replace(/\s+/g, ' ');
            // Limit to reasonable length
            if (institution.length > 50) {
                institution = institution.substring(0, 50).trim();
            }
            return institution;
        }
    }
    return null;
}

// Build a set of institution tokens from a change to compare against selections
function getChangeInstitutionTokens(change: Change): string[] {
    const tokens = new Set<string>();
    const addToken = (value?: string | null) => {
        const normalized = normalizeInstitutionValue(value ?? '');
        if (normalized) {
            tokens.add(normalized);
        }
    };

    addToken(change.source_name);

    if (change.ai_reason) {
        addToken(extractInstitutionFromText(change.ai_reason));
    }

    if (change.raw_content) {
        try {
            const rawData = JSON.parse(change.raw_content);
            const taskName = rawData.taskName || rawData.name || rawData.task?.name || rawData.monitorName;
            addToken(taskName);
        } catch (e) {
            /* ignore malformed raw_content */
        }
    }

    if (change.url) {
        try {
            const url = new URL(change.url);
            const hostname = url.hostname.replace('www.', '');
            const [subdomain] = hostname.split('.');
            addToken(subdomain);
        } catch (e) {
            /* ignore invalid URLs */
        }
    }

    return Array.from(tokens);
}

// Helper to get formatted institution display: "Institución - País"
function getInstitutionDisplay(change: Change): string {
    // Priority 1: Use AI-extracted source_name and source_country
    if (change.source_name && change.source_name.trim()) {
        const name = change.source_name.trim();
        if (change.source_country && change.source_country.trim()) {
            return `${name} - ${change.source_country.trim()}`;
        }
        return name;
    }

    // Priority 2: Extract from ai_reason using NLP patterns
    let institution: string | null = null;
    let country: string | null = null;

    if (change.ai_reason) {
        institution = extractInstitutionFromText(change.ai_reason);
        country = extractCountryFromText(change.ai_reason);
    }

    // Also check raw_content for additional info
    if (change.raw_content) {
        try {
            const rawData = JSON.parse(change.raw_content);
            const taskName = rawData.taskName || rawData.name || rawData.task?.name || rawData.monitorName;
            if (taskName && typeof taskName === 'string' && taskName.trim()) {
                if (!institution) {
                    institution = taskName.trim();
                }
            }
        } catch (e) {
            // JSON parse failed
        }
    }

    // Also try to extract from URL
    if (!institution && change.url) {
        try {
            const url = new URL(change.url);
            const domain = url.hostname.replace('www.', '');
            const parts = domain.split('.');
            if (parts.length >= 2) {
                institution = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
                // Try to get country from domain TLD
                const tld = parts[parts.length - 1];
                const tldCountries: Record<string, string> = {
                    'co': 'Colombia',
                    'sv': 'El Salvador',
                    'gt': 'Guatemala',
                    'hn': 'Honduras',
                    'mx': 'México',
                    'pe': 'Perú',
                    'cr': 'Costa Rica',
                    'pa': 'Panamá',
                };
                if (!country && tldCountries[tld]) {
                    country = tldCountries[tld];
                }
            }
        } catch (e) {
            // URL parse failed
        }
    }

    // Build the display string
    if (institution && country) {
        return `${institution} - ${country}`;
    } else if (institution) {
        return institution;
    } else if (country) {
        return `Fuente en ${country}`;
    }

    return 'Fuente no identificada';
}

// Helper to get the main idea/headline for display
function getHeadlineDisplay(change: Change): string {
    // Priority 1: Use AI-generated headline
    if (change.headline && change.headline.trim()) {
        return change.headline.trim();
    }

    // Priority 2: Extract main idea from ai_reason (smarter extraction)
    if (change.ai_reason) {
        const reason = change.ai_reason.trim();

        // Try to find the main subject being discussed
        // Look for patterns like "menciona...", "trata sobre...", "describe..."
        const actionPatterns = [
            /menciona\s+([^,\.]+)/i,
            /trata\s+sobre\s+([^,\.]+)/i,
            /describe\s+([^,\.]+)/i,
            /anuncia\s+([^,\.]+)/i,
            /informa\s+sobre\s+([^,\.]+)/i,
            /presenta\s+([^,\.]+)/i,
            /publica\s+([^,\.]+)/i,
            /establece\s+([^,\.]+)/i,
            /regula\s+([^,\.]+)/i,
            /modifica\s+([^,\.]+)/i,
        ];

        for (const pattern of actionPatterns) {
            const match = reason.match(pattern);
            if (match && match[1] && match[1].trim().length > 10) {
                const extracted = match[1].trim();
                // Capitalize first letter and limit length
                const headline = extracted.charAt(0).toUpperCase() + extracted.slice(1);
                if (headline.length <= 80) {
                    return headline;
                }
                return headline.substring(0, 77) + '...';
            }
        }

        // Fallback: Use first meaningful sentence
        const sentences = reason.split(/[.!?]+/);
        for (const sentence of sentences) {
            const clean = sentence.trim();
            // Skip sentences that start with generic phrases
            if (clean.length > 20 &&
                !clean.toLowerCase().startsWith('el contenido') &&
                !clean.toLowerCase().startsWith('el cambio') &&
                !clean.toLowerCase().startsWith('la información')) {
                if (clean.length <= 80) {
                    return clean;
                }
                return clean.substring(0, 77) + '...';
            }
        }

        // Last resort: first part of reason
        if (reason.length > 20) {
            const firstPart = reason.substring(0, Math.min(80, reason.length));
            return firstPart.includes(' ') ? firstPart.substring(0, firstPart.lastIndexOf(' ')) + '...' : firstPart;
        }
    }

    // Priority 3: Use title if it's not a wachet ID
    if (change.title && !change.title.includes('wachet') && !change.title.includes('Cambio en')) {
        return change.title.trim();
    }

    return 'Actualización regulatoria detectada';
}

export default function EmailInbox({
    changes,
    loading,
    error,
    searchQuery,
    onSearchChange,
    countryFilter,
    importanceFilter,
    onImportanceFilterChange,
    selectedInstitutions,
    onSelectChange,
    selectedChangeId,
}: EmailInboxProps) {
    const [localSearch, setLocalSearch] = useState(searchQuery);
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        const handler = window.setTimeout(() => onSearchChange(localSearch), 300);
        return () => window.clearTimeout(handler);
    }, [localSearch, onSearchChange]);

    useEffect(() => {
        setLocalSearch(searchQuery);
    }, [searchQuery]);

    useEffect(() => {
        setPage(1);
    }, [searchQuery, countryFilter, importanceFilter, selectedInstitutions]);

    const selectedInstitutionTerms = useMemo(() => {
        const terms = new Set<string>();
        selectedInstitutions.forEach((id) => {
            const normalizedId = normalizeInstitutionValue(id);
            if (normalizedId) {
                terms.add(normalizedId);
            }
            const catalogTerms = INSTITUTION_TERMS_BY_ID.get(id);
            catalogTerms?.forEach((term) => terms.add(term));
        });
        return Array.from(terms);
    }, [selectedInstitutions]);

    const appliedCountryLabel = countryFilter
        ? `Filtrando por ${COUNTRY_LABELS[countryFilter as keyof typeof COUNTRY_LABELS] || countryFilter}`
        : 'Todos los países';

    // Helper to get country code for filtering
    const getCountryCode = (change: Change): string | null => {
        // Check db field first
        if (change.source_country) {
            const countryName = change.source_country.toLowerCase();
            const countryToCode: Record<string, string> = {
                'colombia': 'CO',
                'el salvador': 'SV',
                'guatemala': 'GT',
                'honduras': 'HN',
                'perú': 'PE',
                'peru': 'PE',
                'méxico': 'MX',
                'mexico': 'MX',
                'costa rica': 'CR',
                'panamá': 'PA',
                'panama': 'PA',
            };
            for (const [name, code] of Object.entries(countryToCode)) {
                if (countryName.includes(name)) return code;
            }
        }

        // Extract from ai_reason
        if (change.ai_reason) {
            const text = change.ai_reason.toLowerCase();
            if (text.includes('colombia')) return 'CO';
            if (text.includes('el salvador')) return 'SV';
            if (text.includes('guatemala')) return 'GT';
            if (text.includes('honduras')) return 'HN';
            if (text.includes('perú') || text.includes('peru')) return 'PE';
            if (text.includes('méxico') || text.includes('mexico')) return 'MX';
        }

        // Extract from URL TLD
        if (change.url) {
            try {
                const url = new URL(change.url);
                const tld = url.hostname.split('.').pop();
                const tldToCode: Record<string, string> = {
                    'co': 'CO', 'sv': 'SV', 'gt': 'GT', 'hn': 'HN',
                    'pe': 'PE', 'mx': 'MX', 'cr': 'CR', 'pa': 'PA',
                };
                if (tld && tldToCode[tld]) return tldToCode[tld];
            } catch (e) { /* ignore */ }
        }

        return null;
    };

    // Filter changes
    const filteredChanges = useMemo(() => changes.filter((change) => {
        // Importance filter
        if (importanceFilter === 'important' && change.importance !== 'IMPORTANT') return false;
        if (importanceFilter === 'not_important' && change.importance === 'IMPORTANT') return false;

        // Country filter
        if (countryFilter && countryFilter !== 'INTERNATIONAL' && countryFilter !== 'LEGISLATIVE') {
            const changeCountry = getCountryCode(change);
            if (changeCountry !== countryFilter) return false;
        }

        // Institution filter
        if (selectedInstitutionTerms.length > 0) {
            const changeTokens = getChangeInstitutionTokens(change);
            if (changeTokens.length === 0) return false;

            const matches = changeTokens.some((token) =>
                selectedInstitutionTerms.some((term) =>
                    token.includes(term) || term.includes(token),
                ),
            );
            if (!matches) return false;
        }

        // Search filter
        if (localSearch) {
            const q = localSearch.toLowerCase();
            if (
                !(change.title || '').toLowerCase().includes(q) &&
                !(change.ai_reason || '').toLowerCase().includes(q) &&
                !(change.wachet_id || '').toLowerCase().includes(q) &&
                !(change.url || '').toLowerCase().includes(q) &&
                !(change.source_name || '').toLowerCase().includes(q)
            ) {
                return false;
            }
        }

        return true;
    }), [changes, countryFilter, importanceFilter, localSearch, selectedInstitutionTerms]);

    // Sort by date (newest first)
    const sortedChanges = useMemo(() => [...filteredChanges].sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }), [filteredChanges]);

    const totalPages = Math.max(1, Math.ceil(sortedChanges.length / ITEMS_PER_PAGE));
    const paginatedChanges = sortedChanges.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);
    const startEntry = sortedChanges.length === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
    const endEntry = Math.min(page * ITEMS_PER_PAGE, sortedChanges.length);

    return (
        <div
            style={{
                flex: 1,
                backgroundColor: 'var(--card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
                transition: 'background-color 0.2s ease, border-color 0.2s ease',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--spacing-5)',
                    borderBottom: '1px solid var(--border-light)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
                    <Mail size={20} style={{ color: 'var(--primary)' }} />
                    <h2
                        style={{
                            fontSize: 'var(--font-size-md)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            margin: 0,
                        }}
                    >
                        Bandeja de Correos
                    </h2>
                </div>
                <span
                    style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-secondary)',
                    }}
                >
                    {sortedChanges.length} correos
                </span>
            </div>

            {/* Filters Section */}
            <div style={{ padding: 'var(--spacing-4) var(--spacing-5)', borderBottom: '1px solid var(--border-light)' }}>
                {/* Search */}
                <div style={{ position: 'relative', marginBottom: 'var(--spacing-4)' }}>
                    <Search
                        size={16}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-secondary)',
                        }}
                    />
                    <label htmlFor="email-search" className="sr-only">
                        Buscar en correos (asunto, institución, contenido)
                    </label>
                    <input
                        id="email-search"
                        type="text"
                        placeholder="Buscar en correos (asunto, institución, contenido)..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="input"
                        style={{
                            paddingLeft: '40px',
                            fontSize: 'var(--font-size-sm)',
                        }}
                    />
                </div>

                {/* Country indicator */}
                <div style={{ marginBottom: 'var(--spacing-3)' }}>
                    <p
                        style={{
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 500,
                            color: 'var(--text-secondary)',
                            marginBottom: 'var(--spacing-2)',
                        }}
                    >
                        País aplicado
                    </p>
                    <div style={{ padding: 'var(--spacing-2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)', backgroundColor: 'var(--gray-50)', color: 'var(--text-primary)', fontSize: 'var(--font-size-sm)' }}>
                        {appliedCountryLabel}
                    </div>
                </div>

                {/* Importance Toggle */}
                <div>
                    <p
                        style={{
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 500,
                            color: 'var(--text-secondary)',
                            marginBottom: 'var(--spacing-2)',
                        }}
                    >
                        Filtrar por importancia
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        {[
                            { value: 'all', label: 'Todos' },
                            { value: 'important', label: '⭐ Importantes' },
                            { value: 'not_important', label: 'Sin importancia' },
                        ].map((option) => {
                            const isActive = importanceFilter === option.value;
                            return (
                                <button
                                    key={option.value}
                                    onClick={() => onImportanceFilterChange(option.value as any)}
                                    style={{
                                        padding: 'var(--spacing-2) var(--spacing-4)',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 500,
                                        backgroundColor: isActive ? 'var(--blue-night)' : 'white',
                                        color: isActive ? 'white' : 'var(--text-primary)',
                                        border: `1px solid ${isActive ? 'var(--blue-night)' : 'var(--border-light)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        transition: 'all 200ms',
                                    }}
                                    aria-pressed={isActive}
                                    aria-label={`Filtrar por ${option.label}`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Email List */}
            <div style={{ maxHeight: 'calc(100vh - 500px)', overflowY: 'auto' }} role="list" aria-label="Listado de correos">
                {loading ? (
                    <div style={{ padding: 'var(--spacing-8)', textAlign: 'center' }}>
                        <div className="skeleton" style={{ height: '60px', marginBottom: 'var(--spacing-3)' }} />
                        <div className="skeleton" style={{ height: '60px', marginBottom: 'var(--spacing-3)' }} />
                        <div className="skeleton" style={{ height: '60px' }} />
                    </div>
                ) : error ? (
                    <div
                        style={{
                            padding: 'var(--spacing-8)',
                            textAlign: 'center',
                            color: 'var(--red-accent)',
                        }}
                    >
                        Error al cargar datos: {error}
                    </div>
                ) : sortedChanges.length === 0 ? (
                    <div
                        style={{
                            padding: 'var(--spacing-8)',
                            textAlign: 'center',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        No hay correos que coincidan con los filtros
                    </div>
                ) : (
                    paginatedChanges.map((change) => {
                        const { date, time } = formatDate(change.created_at);
                        const isImportant = change.importance === 'IMPORTANT';
                        const isUnread = change.status === 'NEW' || change.status === 'PENDING';
                        const isSelected = change.id === selectedChangeId;

                        return (
                            <div
                                key={change.id}
                                onClick={() => onSelectChange(change)}
                                style={{
                                    display: 'flex',
                                    gap: 'var(--spacing-3)',
                                    padding: 'var(--spacing-4) var(--spacing-5)',
                                    borderBottom: '1px solid var(--border)',
                                    backgroundColor: isSelected ? 'var(--accent)' : isUnread ? 'var(--secondary)' : 'var(--card)',
                                    cursor: 'pointer',
                                    transition: 'background 200ms',
                                    position: 'relative',
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = 'var(--accent)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = isUnread ? 'var(--secondary)' : 'var(--card)';
                                    }
                                }}
                                role="listitem"
                                tabIndex={0}
                                aria-label={`${getHeadlineDisplay(change)}. ${getInstitutionDisplay(change)}. Fecha ${date} ${time}`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        onSelectChange(change);
                                    }
                                }}
                            >
                                {/* Star Icon */}
                                <Star
                                    size={18}
                                    fill={isImportant ? 'var(--red-accent)' : 'transparent'}
                                    style={{
                                        color: isImportant ? 'var(--red-accent)' : 'var(--gray-400)',
                                        flexShrink: 0,
                                        marginTop: '2px',
                                    }}
                                />

                                {/* Content */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Institution */}
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-1)',
                                            marginBottom: 'var(--spacing-1)',
                                        }}
                                    >
                                        <Building2 size={14} style={{ color: 'var(--primary)' }} />
                                        <span
                                            style={{
                                                fontSize: 'var(--font-size-sm)',
                                                fontWeight: 500,
                                                color: 'var(--primary)',
                                            }}
                                        >
                                            {getInstitutionDisplay(change)}
                                        </span>
                                    </div>

                                    {/* Title/Subject */}
                                    <h4
                                        style={{
                                            fontSize: 'var(--font-size-base)',
                                            fontWeight: isUnread ? 600 : 500,
                                            color: 'var(--text-primary)',
                                            margin: 0,
                                            marginBottom: 'var(--spacing-1)',
                                        }}
                                    >
                                        {getHeadlineDisplay(change)}
                                    </h4>

                                    {/* AI Reason Preview */}
                                    <p
                                        style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--text-secondary)',
                                            margin: 0,
                                            marginBottom: 'var(--spacing-2)',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {change.ai_reason || 'Sin análisis de IA disponible'}
                                    </p>

                                    {/* Date & Time & Score */}
                                    <div style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'center' }}>
                                        <span
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-1)',
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            <Calendar size={12} />
                                            {date}
                                        </span>
                                        <span
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--spacing-1)',
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--text-secondary)',
                                            }}
                                        >
                                            <Clock size={12} />
                                            {time}
                                        </span>
                                        {change.ai_score !== null && (
                                            <span
                                                style={{
                                                    fontSize: 'var(--font-size-xs)',
                                                    color: isImportant ? 'var(--red-accent)' : 'var(--text-secondary)',
                                                    fontWeight: 500,
                                                }}
                                            >
                                                IA: {Math.round((change.ai_score || 0) * 100)}%
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Unread Indicator */}
                                {isUnread && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            right: 'var(--spacing-5)',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: 'var(--red-accent)',
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {sortedChanges.length > 0 && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: 'var(--spacing-4) var(--spacing-5)',
                        borderTop: '1px solid var(--border-light)',
                        gap: 'var(--spacing-3)',
                    }}
                    aria-live="polite"
                >
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        Mostrando {startEntry} - {endEntry} de {sortedChanges.length}
                    </span>
                    <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                            disabled={page === 1}
                            className="button"
                            style={{
                                padding: 'var(--spacing-2) var(--spacing-3)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-light)',
                                backgroundColor: 'var(--card)',
                                cursor: page === 1 ? 'not-allowed' : 'pointer',
                            }}
                            aria-label="Página anterior"
                        >
                            Anterior
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                            disabled={page === totalPages}
                            className="button"
                            style={{
                                padding: 'var(--spacing-2) var(--spacing-3)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-light)',
                                backgroundColor: 'var(--card)',
                                cursor: page === totalPages ? 'not-allowed' : 'pointer',
                            }}
                            aria-label="Página siguiente"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
