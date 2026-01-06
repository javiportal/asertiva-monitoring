// AlertHistoryList.tsx - Shows registered alerts history
import { useEffect, useMemo, useState } from 'react';
import { Bell, Calendar, Mail, MapPin, Building2, Users, ExternalLink, RefreshCw, Search, Filter, X } from 'lucide-react';
import { getAllAlerts, type AlertDispatch } from '../hooks/useChanges';

type AlertHistoryListProps = {
    onRefresh?: () => void;
};

// Filter options
const SUBJECTS = ['Todos', 'Bancario', 'Fintech', 'Seguros', 'Valores', 'General', 'Ciberseguridad', 'Datos Personales', 'AML/PLD'];
const TYPES = ['Todos', 'Regulatoria', 'Informativa'];
const INSTANCES = ['Todos', 'Legislativo', 'Ejecutivo', 'Judicial', 'Organismos Autónomos', 'Internacional'];

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export default function AlertHistoryList({ onRefresh }: AlertHistoryListProps) {
    const [alerts, setAlerts] = useState<AlertDispatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [subjectFilter, setSubjectFilter] = useState('Todos');
    const [typeFilter, setTypeFilter] = useState('Todos');
    const [instanceFilter, setInstanceFilter] = useState('Todos');

    const loadAlerts = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAllAlerts();
            setAlerts(data);
        } catch (e) {
            setError('Error al cargar el historial de alertas');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAlerts();
    }, []);

    const handleRefresh = () => {
        loadAlerts();
        onRefresh?.();
    };

    // Get unique countries from alerts for dynamic filter
    const availableCountries = useMemo(() => {
        const countries = new Set(alerts.map(a => a.country_state).filter(Boolean));
        return ['Todos', ...Array.from(countries).sort()];
    }, [alerts]);

    const [countryFilter, setCountryFilter] = useState('Todos');

    // Filtered alerts
    const filteredAlerts = useMemo(() => {
        return alerts.filter(alert => {
            // Search filter (searches in topic, change_title, email, clients)
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesSearch =
                    (alert.topic || '').toLowerCase().includes(q) ||
                    (alert.change_title || '').toLowerCase().includes(q) ||
                    (alert.email || '').toLowerCase().includes(q) ||
                    (alert.clients || '').toLowerCase().includes(q) ||
                    (alert.subject || '').toLowerCase().includes(q);
                if (!matchesSearch) return false;
            }

            // Subject filter
            if (subjectFilter !== 'Todos' && alert.subject !== subjectFilter) {
                return false;
            }

            // Type filter
            if (typeFilter !== 'Todos' && alert.alert_type !== typeFilter) {
                return false;
            }

            // Instance filter
            if (instanceFilter !== 'Todos' && alert.instance !== instanceFilter) {
                return false;
            }

            // Country filter
            if (countryFilter !== 'Todos' && alert.country_state !== countryFilter) {
                return false;
            }

            return true;
        });
    }, [alerts, searchQuery, subjectFilter, typeFilter, instanceFilter, countryFilter]);

    const hasActiveFilters = searchQuery || subjectFilter !== 'Todos' || typeFilter !== 'Todos' || instanceFilter !== 'Todos' || countryFilter !== 'Todos';

    const clearFilters = () => {
        setSearchQuery('');
        setSubjectFilter('Todos');
        setTypeFilter('Todos');
        setInstanceFilter('Todos');
        setCountryFilter('Todos');
    };

    return (
        <div
            style={{
                flex: 1,
                backgroundColor: 'var(--card)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
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
                    <Bell size={20} style={{ color: 'var(--primary)' }} />
                    <h2
                        style={{
                            fontSize: 'var(--font-size-md)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            margin: 0,
                        }}
                    >
                        Historial de Alertas Registradas
                    </h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                        {alerts.length} alertas
                    </span>
                    <button
                        onClick={handleRefresh}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: 'var(--spacing-2) var(--spacing-3)',
                            fontSize: 'var(--font-size-sm)',
                            backgroundColor: 'var(--gray-50)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                        }}
                        disabled={loading}
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* Filters Section */}
            <div style={{ padding: 'var(--spacing-4) var(--spacing-5)', borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--gray-50)' }}>
                {/* Search Input */}
                <div style={{ position: 'relative', marginBottom: 'var(--spacing-3)' }}>
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
                    <input
                        type="text"
                        placeholder="Buscar por tema, título, email, materia..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            padding: 'var(--spacing-2) var(--spacing-3)',
                            paddingLeft: '40px',
                            fontSize: 'var(--font-size-sm)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'white',
                        }}
                    />
                </div>

                {/* Filter Dropdowns */}
                <div style={{ display: 'flex', gap: 'var(--spacing-3)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Filter size={14} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', fontWeight: 500 }}>Filtros:</span>
                    </div>

                    {/* Subject Filter */}
                    <select
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                        style={{
                            padding: 'var(--spacing-1) var(--spacing-2)',
                            fontSize: 'var(--font-size-sm)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: subjectFilter !== 'Todos' ? 'var(--blue-night)' : 'white',
                            color: subjectFilter !== 'Todos' ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                        }}
                    >
                        {SUBJECTS.map(s => (
                            <option key={s} value={s}>{s === 'Todos' ? 'Materia' : s}</option>
                        ))}
                    </select>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        style={{
                            padding: 'var(--spacing-1) var(--spacing-2)',
                            fontSize: 'var(--font-size-sm)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: typeFilter !== 'Todos' ? 'var(--blue-night)' : 'white',
                            color: typeFilter !== 'Todos' ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                        }}
                    >
                        {TYPES.map(t => (
                            <option key={t} value={t}>{t === 'Todos' ? 'Tipo' : t}</option>
                        ))}
                    </select>

                    {/* Instance Filter */}
                    <select
                        value={instanceFilter}
                        onChange={(e) => setInstanceFilter(e.target.value)}
                        style={{
                            padding: 'var(--spacing-1) var(--spacing-2)',
                            fontSize: 'var(--font-size-sm)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: instanceFilter !== 'Todos' ? 'var(--blue-night)' : 'white',
                            color: instanceFilter !== 'Todos' ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                        }}
                    >
                        {INSTANCES.map(i => (
                            <option key={i} value={i}>{i === 'Todos' ? 'Instancia' : i}</option>
                        ))}
                    </select>

                    {/* Country Filter */}
                    <select
                        value={countryFilter}
                        onChange={(e) => setCountryFilter(e.target.value)}
                        style={{
                            padding: 'var(--spacing-1) var(--spacing-2)',
                            fontSize: 'var(--font-size-sm)',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: countryFilter !== 'Todos' ? 'var(--blue-night)' : 'white',
                            color: countryFilter !== 'Todos' ? 'white' : 'var(--text-primary)',
                            cursor: 'pointer',
                        }}
                    >
                        {availableCountries.map(c => (
                            <option key={c} value={c}>{c === 'Todos' ? 'País' : c}</option>
                        ))}
                    </select>

                    {/* Clear Filters Button */}
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: 'var(--spacing-1) var(--spacing-2)',
                                fontSize: 'var(--font-size-sm)',
                                backgroundColor: 'transparent',
                                border: '1px solid var(--red-accent)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--red-accent)',
                                cursor: 'pointer',
                            }}
                        >
                            <X size={14} />
                            Limpiar
                        </button>
                    )}
                </div>

                {/* Results count */}
                {hasActiveFilters && (
                    <div style={{ marginTop: 'var(--spacing-2)', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                        Mostrando {filteredAlerts.length} de {alerts.length} alertas
                    </div>
                )}
            </div>

            {/* Content */}
            <div style={{ maxHeight: 'calc(100vh - 500px)', overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ padding: 'var(--spacing-8)', textAlign: 'center' }}>
                        <div className="skeleton" style={{ height: '80px', marginBottom: 'var(--spacing-3)' }} />
                        <div className="skeleton" style={{ height: '80px', marginBottom: 'var(--spacing-3)' }} />
                        <div className="skeleton" style={{ height: '80px' }} />
                    </div>
                ) : error ? (
                    <div style={{ padding: 'var(--spacing-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <p>{error}</p>
                        <button
                            onClick={handleRefresh}
                            style={{
                                marginTop: 'var(--spacing-4)',
                                padding: 'var(--spacing-2) var(--spacing-4)',
                                backgroundColor: 'var(--blue-night)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                            }}
                        >
                            Reintentar
                        </button>
                    </div>
                ) : alerts.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-8)', textAlign: 'center' }}>
                        <Bell size={48} style={{ color: 'var(--gray-300)', marginBottom: 'var(--spacing-4)' }} />
                        <h3 style={{ margin: 0, marginBottom: 'var(--spacing-2)', color: 'var(--text-primary)' }}>
                            No hay alertas registradas
                        </h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                            Las alertas que registres desde el panel de detalle aparecerán aquí.
                        </p>
                    </div>
                ) : filteredAlerts.length === 0 ? (
                    <div style={{ padding: 'var(--spacing-8)', textAlign: 'center' }}>
                        <Filter size={48} style={{ color: 'var(--gray-300)', marginBottom: 'var(--spacing-4)' }} />
                        <h3 style={{ margin: 0, marginBottom: 'var(--spacing-2)', color: 'var(--text-primary)' }}>
                            No se encontraron alertas
                        </h3>
                        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', marginBottom: 'var(--spacing-4)' }}>
                            No hay alertas que coincidan con los filtros aplicados.
                        </p>
                        <button
                            onClick={clearFilters}
                            style={{
                                padding: 'var(--spacing-2) var(--spacing-4)',
                                backgroundColor: 'var(--blue-night)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: 'var(--font-size-sm)',
                            }}
                        >
                            Limpiar filtros
                        </button>
                    </div>
                ) : (
                    filteredAlerts.map((alert) => (
                        <div
                            key={alert.id}
                            style={{
                                padding: 'var(--spacing-4) var(--spacing-5)',
                                borderBottom: '1px solid var(--border-light)',
                                backgroundColor: 'var(--card)',
                                transition: 'background 200ms',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--accent)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'var(--card)';
                            }}
                        >
                            {/* Alert Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-2)' }}>
                                <div style={{ flex: 1 }}>
                                    <h4 style={{
                                        margin: 0,
                                        fontSize: 'var(--font-size-base)',
                                        fontWeight: 600,
                                        color: 'var(--text-primary)',
                                        marginBottom: 'var(--spacing-1)',
                                    }}>
                                        {alert.topic || 'Sin tema especificado'}
                                    </h4>
                                    {alert.change_title && (
                                        <p style={{
                                            margin: 0,
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--primary)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                        }}>
                                            <Building2 size={12} />
                                            {alert.change_title}
                                        </p>
                                    )}
                                </div>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2)',
                                }}>
                                    <span style={{
                                        padding: '2px 8px',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 500,
                                        backgroundColor: alert.alert_type === 'Regulatoria' ? '#dbeafe' : '#f3e8ff',
                                        color: alert.alert_type === 'Regulatoria' ? '#1e40af' : '#7c3aed',
                                        borderRadius: 'var(--radius-sm)',
                                    }}>
                                        {alert.alert_type}
                                    </span>
                                    <span style={{
                                        padding: '2px 8px',
                                        fontSize: 'var(--font-size-xs)',
                                        fontWeight: 500,
                                        backgroundColor: 'var(--gray-100)',
                                        color: 'var(--text-secondary)',
                                        borderRadius: 'var(--radius-sm)',
                                    }}>
                                        {alert.alert_count} alerta{alert.alert_count !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>

                            {/* Alert Details Grid */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: 'var(--spacing-2)',
                                marginBottom: 'var(--spacing-2)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    <MapPin size={14} />
                                    {alert.country_state}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    <Calendar size={14} />
                                    {alert.dispatch_date}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    <Mail size={14} />
                                    {alert.email}
                                </div>
                            </div>

                            {/* Subject & Instance */}
                            <div style={{
                                display: 'flex',
                                gap: 'var(--spacing-3)',
                                flexWrap: 'wrap',
                                marginBottom: 'var(--spacing-2)',
                            }}>
                                <span style={{
                                    padding: '2px 8px',
                                    fontSize: 'var(--font-size-xs)',
                                    backgroundColor: 'var(--gray-50)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-primary)',
                                }}>
                                    Materia: {alert.subject}
                                </span>
                                <span style={{
                                    padding: '2px 8px',
                                    fontSize: 'var(--font-size-xs)',
                                    backgroundColor: 'var(--gray-50)',
                                    border: '1px solid var(--border-light)',
                                    borderRadius: 'var(--radius-sm)',
                                    color: 'var(--text-primary)',
                                }}>
                                    Instancia: {alert.instance}
                                </span>
                                {alert.legislative_body && (
                                    <span style={{
                                        padding: '2px 8px',
                                        fontSize: 'var(--font-size-xs)',
                                        backgroundColor: 'var(--gray-50)',
                                        border: '1px solid var(--border-light)',
                                        borderRadius: 'var(--radius-sm)',
                                        color: 'var(--text-primary)',
                                    }}>
                                        Corp: {alert.legislative_body}
                                    </span>
                                )}
                            </div>

                            {/* Clients & Footer */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                {alert.clients ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        <Users size={12} />
                                        Clientes: {alert.clients}
                                    </div>
                                ) : (
                                    <span />
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                                    {alert.change_url && (
                                        <a
                                            href={alert.change_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--primary)',
                                                textDecoration: 'none',
                                            }}
                                        >
                                            <ExternalLink size={12} />
                                            Ver fuente
                                        </a>
                                    )}
                                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Registrada: {formatDate(alert.created_at || '')}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
