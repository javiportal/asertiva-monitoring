import { Search, X } from 'lucide-react';

type FiltersSidebarProps = {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    importanceFilter: ('IMPORTANT' | 'NOT_IMPORTANT')[];
    onImportanceFilterChange: (filter: ('IMPORTANT' | 'NOT_IMPORTANT')[]) => void;
    onClearFilters: () => void;
};

export default function FiltersSidebar({
    searchQuery,
    onSearchChange,
    importanceFilter,
    onImportanceFilterChange,
    onClearFilters,
}: FiltersSidebarProps) {
    const toggleImportanceFilter = (value: 'IMPORTANT' | 'NOT_IMPORTANT') => {
        if (importanceFilter.includes(value)) {
            onImportanceFilterChange(importanceFilter.filter(f => f !== value));
        } else {
            onImportanceFilterChange([...importanceFilter, value]);
        }
    };

    const hasActiveFilters = searchQuery || importanceFilter.length > 0;

    return (
        <aside style={{
            width: 'var(--sidebar-width)',
            backgroundColor: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-light)',
            padding: 'var(--spacing-6)',
            overflowY: 'auto',
            height: 'calc(100vh - var(--header-height) - 200px)',
            position: 'sticky',
            top: 'calc(var(--header-height) + 200px)',
        }}>
            {/* Search */}
            <div style={{ marginBottom: 'var(--spacing-6)' }}>
                <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-2)',
                }}>
                    Búsqueda global
                </label>
                <div style={{ position: 'relative' }}>
                    <Search
                        size={18}
                        color="var(--text-secondary)"
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Buscar por título, palabra clave, URL..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="input"
                        style={{
                            paddingLeft: '40px',
                            fontSize: 'var(--font-size-sm)',
                        }}
                    />
                </div>
            </div>

            {/* Importance Filters */}
            <div style={{ marginBottom: 'var(--spacing-6)' }}>
                <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-3)',
                }}>
                    Importancia
                </label>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-2)' }}>
                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2)',
                        padding: 'var(--spacing-2)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'background 200ms',
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <input
                            type="checkbox"
                            checked={importanceFilter.includes('IMPORTANT')}
                            onChange={() => toggleImportanceFilter('IMPORTANT')}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                                accentColor: 'var(--red-accent)',
                            }}
                        />
                        <span className="badge badge-important" style={{ marginLeft: 'var(--spacing-1)' }}>
                            Importante
                        </span>
                    </label>

                    <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2)',
                        padding: 'var(--spacing-2)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        transition: 'background 200ms',
                    }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <input
                            type="checkbox"
                            checked={importanceFilter.includes('NOT_IMPORTANT')}
                            onChange={() => toggleImportanceFilter('NOT_IMPORTANT')}
                            style={{
                                width: '18px',
                                height: '18px',
                                cursor: 'pointer',
                            }}
                        />
                        <span className="badge badge-normal" style={{ marginLeft: 'var(--spacing-1)' }}>
                            No importante
                        </span>
                    </label>
                </div>
            </div>

            {/* Future: Country Filter */}
            <div style={{ marginBottom: 'var(--spacing-6)', opacity: 0.5 }}>
                <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-2)',
                }}>
                    País <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 400 }}>(próximamente)</span>
                </label>
                <select className="input" disabled style={{ fontSize: 'var(--font-size-sm)' }}>
                    <option>Seleccionar país...</option>
                </select>
            </div>

            {/* Future: Sector Filter */}
            <div style={{ marginBottom: 'var(--spacing-6)', opacity: 0.5 }}>
                <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-2)',
                }}>
                    Sector <span style={{ fontSize: 'var(--font-size-xs)', fontWeight: 400 }}>(próximamente)</span>
                </label>
                <select className="input" disabled style={{ fontSize: 'var(--font-size-sm)' }}>
                    <option>Seleccionar sector...</option>
                </select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
                <button
                    onClick={onClearFilters}
                    className="btn btn-ghost slide-in-down"
                    style={{
                        width: '100%',
                        justifyContent: 'center',
                        color: 'var(--red-accent)',
                        border: '1px solid var(--red-accent)',
                    }}
                >
                    <X size={16} />
                    Limpiar filtros
                </button>
            )}

            {/* Active Filters Display */}
            {hasActiveFilters && (
                <div style={{
                    marginTop: 'var(--spacing-4)',
                    padding: 'var(--spacing-3)',
                    backgroundColor: 'white',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-light)',
                }}>
                    <div style={{
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: 'var(--spacing-2)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        Filtros activos
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
                        {searchQuery && (
                            <span className="badge badge-status">
                                "{searchQuery}"
                            </span>
                        )}
                        {importanceFilter.map(filter => (
                            <span
                                key={filter}
                                className={filter === 'IMPORTANT' ? 'badge badge-important' : 'badge badge-normal'}
                            >
                                {filter === 'IMPORTANT' ? 'Importante' : 'No importante'}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </aside>
    );
}
