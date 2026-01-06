// AlertHistoryList.tsx - Shows registered alerts history
import { useEffect, useState } from 'react';
import { Bell, Calendar, Mail, MapPin, Building2, Users, ExternalLink, RefreshCw } from 'lucide-react';
import { getAllAlerts, type AlertDispatch } from '../hooks/useChanges';

type AlertHistoryListProps = {
    onRefresh?: () => void;
};

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

            {/* Content */}
            <div style={{ maxHeight: 'calc(100vh - 400px)', overflowY: 'auto' }}>
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
                ) : (
                    alerts.map((alert) => (
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
