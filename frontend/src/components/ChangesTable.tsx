import { ExternalLink } from 'lucide-react';

export type Change = {
    id: number;
    wachet_id: string;
    url: string | null;
    title: string | null;
    importance: string | null;
    ai_score: number | null;
    ai_reason: string | null;
    status: string;
    created_at: string;
};

type ChangesTableProps = {
    changes: Change[];
    selectedChangeId: number | null;
    onSelectChange: (change: Change) => void;
};

export default function ChangesTable({
    changes,
    selectedChangeId,
    onSelectChange
}: ChangesTableProps) {
    return (
        <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                }}>
                    <thead style={{
                        backgroundColor: 'var(--gray-50)',
                        borderBottom: '2px solid var(--border-light)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10,
                    }}>
                        <tr>
                            <th style={{
                                padding: 'var(--spacing-3) var(--spacing-4)',
                                textAlign: 'left',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                whiteSpace: 'nowrap',
                            }}>
                                Fecha
                            </th>
                            <th style={{
                                padding: 'var(--spacing-3) var(--spacing-4)',
                                textAlign: 'left',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                minWidth: '250px',
                            }}>
                                Título
                            </th>
                            <th style={{
                                padding: 'var(--spacing-3) var(--spacing-4)',
                                textAlign: 'left',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                whiteSpace: 'nowrap',
                            }}>
                                Importancia
                            </th>
                            <th style={{
                                padding: 'var(--spacing-3) var(--spacing-4)',
                                textAlign: 'left',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                minWidth: '300px',
                            }}>
                                Resumen IA
                            </th>
                            <th style={{
                                padding: 'var(--spacing-3) var(--spacing-4)',
                                textAlign: 'left',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 600,
                                color: 'var(--text-secondary)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                whiteSpace: 'nowrap',
                            }}>
                                Fuente
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {changes.map((change) => {
                            const isImportant = change.importance === 'IMPORTANT';
                            const isSelected = change.id === selectedChangeId;
                            const date = new Date(change.created_at);
                            const dateStr = isNaN(date.getTime())
                                ? '-'
                                : date.toLocaleDateString('es-ES', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                });

                            return (
                                <tr
                                    key={change.id}
                                    onClick={() => onSelectChange(change)}
                                    className={selectedChangeId === change.id ? 'selected' : ''}
                                    style={{
                                        borderBottom: '1px solid var(--border-light)',
                                        cursor: 'pointer',
                                        transition: 'all 150ms',
                                        backgroundColor: isSelected ? 'var(--blue-light)' : 'transparent',
                                        opacity: change.status === 'DISCARDED' ? 0.5 : 1,
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.backgroundColor = 'var(--gray-100)';
                                            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.currentTarget.style.backgroundColor = 'white';
                                            e.currentTarget.style.boxShadow = 'none';
                                        }
                                    }}
                                >
                                    {/* Date */}
                                    <td style={{
                                        padding: 'var(--spacing-4)',
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--text-secondary)',
                                        verticalAlign: 'top',
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {dateStr}
                                    </td>

                                    {/* Title */}
                                    <td style={{
                                        padding: 'var(--spacing-4)',
                                        verticalAlign: 'top',
                                    }}>
                                        <div style={{
                                            fontSize: 'var(--font-size-base)',
                                            fontWeight: 500,
                                            color: 'var(--text-primary)',
                                            marginBottom: 'var(--spacing-1)',
                                            lineHeight: 1.4,
                                        }}>
                                            {change.title || '(sin título)'}
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--text-secondary)',
                                        }}>
                                            ID: {change.wachet_id}
                                        </div>
                                    </td>

                                    {/* Importance */}
                                    <td style={{
                                        padding: 'var(--spacing-4)',
                                        verticalAlign: 'top',
                                    }}>
                                        <div className={isImportant ? 'badge badge-important' : 'badge badge-normal'}>
                                            {change.importance || 'N/A'}
                                            {change.ai_score !== null && (
                                                <span style={{
                                                    marginLeft: 'var(--spacing-1)',
                                                    opacity: 0.8,
                                                }}>
                                                    {Math.round((change.ai_score || 0) * 100)}%
                                                </span>
                                            )}
                                        </div>

                                        {/* Mini Progress Bar */}
                                        {change.ai_score !== null && (
                                            <div style={{
                                                marginTop: 'var(--spacing-2)',
                                                width: '100%',
                                                height: '4px',
                                                backgroundColor: 'var(--gray-200)',
                                                borderRadius: 'var(--radius-full)',
                                                overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    width: `${(change.ai_score || 0) * 100}%`,
                                                    height: '100%',
                                                    backgroundColor: isImportant ? 'var(--red-accent)' : 'var(--text-secondary)',
                                                    transition: 'width 300ms ease',
                                                }} />
                                            </div>
                                        )}
                                    </td>

                                    {/* AI Reason */}
                                    <td style={{
                                        padding: 'var(--spacing-4)',
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--text-primary)',
                                        verticalAlign: 'top',
                                        lineHeight: 1.5,
                                    }}>
                                        <div style={{
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}>
                                            {change.ai_reason || '-'}
                                        </div>
                                    </td>

                                    {/* Source */}
                                    <td style={{
                                        padding: 'var(--spacing-4)',
                                        verticalAlign: 'top',
                                    }}>
                                        {change.url ? (
                                            <a
                                                href={change.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--spacing-1)',
                                                    fontSize: 'var(--font-size-sm)',
                                                    color: 'var(--blue-night)',
                                                    textDecoration: 'none',
                                                    fontWeight: 500,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.color = 'var(--red-accent)';
                                                    e.currentTarget.style.textDecoration = 'underline';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.color = 'var(--blue-night)';
                                                    e.currentTarget.style.textDecoration = 'none';
                                                }}
                                            >
                                                Ver fuente
                                                <ExternalLink size={14} />
                                            </a>
                                        ) : (
                                            <span style={{
                                                fontSize: 'var(--font-size-sm)',
                                                color: 'var(--text-secondary)',
                                            }}>
                                                Sin URL
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
