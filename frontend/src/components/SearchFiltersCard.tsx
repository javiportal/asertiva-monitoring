// SearchFiltersCard.tsx - Main search and filters card matching Figma design
import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import CountrySelector, { defaultCountries } from './CountrySelector';

type SearchFiltersCardProps = {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    selectedCountry: string | null;
    onSelectCountry: (code: string | null) => void;
    onClearFilters: () => void;
};

export default function SearchFiltersCard({
    searchQuery,
    onSearchChange,
    selectedCountry,
    onSelectCountry,
    onClearFilters,
}: SearchFiltersCardProps) {
    const [localQuery, setLocalQuery] = useState(searchQuery);
    const hasActiveFilters = searchQuery || selectedCountry !== null;

    useEffect(() => {
        const handler = window.setTimeout(() => {
            onSearchChange(localQuery);
        }, 300);

        return () => window.clearTimeout(handler);
    }, [localQuery, onSearchChange]);

    useEffect(() => {
        setLocalQuery(searchQuery);
    }, [searchQuery]);

    return (
        <div
            className="card"
            style={{
                padding: 'var(--spacing-6)',
                marginBottom: 'var(--spacing-6)',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    marginBottom: 'var(--spacing-4)',
                }}
            >
                <Search size={20} style={{ color: 'var(--red-accent)' }} />
                <h2
                    style={{
                        fontSize: 'var(--font-size-md)',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: 0,
                    }}
                >
                    Búsqueda y Filtros
                </h2>
            </div>

            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: 'var(--spacing-5)' }}>
                <Search
                    size={18}
                    style={{
                        position: 'absolute',
                        left: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-secondary)',
                    }}
                />
                <label htmlFor="global-search" className="sr-only">
                    Buscar por nombre de institución
                </label>
                <input
                    id="global-search"
                    type="text"
                    placeholder="Buscar por nombre de institución..."
                    value={localQuery}
                    onChange={(e) => setLocalQuery(e.target.value)}
                    className="input"
                    style={{
                        paddingLeft: '44px',
                        fontSize: 'var(--font-size-base)',
                    }}
                />
            </div>

            {/* Country Label */}
            <p
                style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--spacing-3)',
                }}
            >
                Seleccionar País / Categoría
            </p>

            {/* Country Selector Grid */}
            <CountrySelector
                countries={defaultCountries}
                selectedCountry={selectedCountry}
                onSelectCountry={onSelectCountry}
            />

            {/* Clear Filters Button */}
            {hasActiveFilters && (
                <button
                    onClick={onClearFilters}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2)',
                        marginTop: 'var(--spacing-4)',
                        padding: 'var(--spacing-2) var(--spacing-3)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        color: 'var(--red-accent)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 200ms',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--red-50)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <X size={16} />
                    Limpiar filtros
                </button>
            )}
        </div>
    );
}
