import { X, ExternalLink, CheckCircle, Calendar, Tag, RotateCcw } from 'lucide-react';
import { type Change } from './ChangesTable';

type DetailPanelProps = {
    change: Change | null;
    onClose: () => void;
    onValidate?: (change: Change) => void;
    onMoveToPending?: (change: Change) => void;
};

export default function DetailPanel({
    change,
    onClose,
    onValidate,
    onMoveToPending
}: DetailPanelProps) {
    if (!change) return null;

    const isImportant = change.importance === 'IMPORTANT';
    const date = new Date(change.created_at);
    const dateStr = isNaN(date.getTime())
        ? '-'
        : date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

    return (
        <>
            {/* Overlay */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    zIndex: 40,
                    animation: 'fadeIn 200ms ease-out',
                }}
            />

            {/* Panel */}
            <aside
                className="slide-in-right"
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '40%',
                    minWidth: '500px',
                    maxWidth: '700px',
                    height: '100vh',
                    backgroundColor: 'var(--card)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 50,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'background-color 0.2s ease',
                }}
            >
                {/* Header */}
                <div style={{
                    padding: 'var(--spacing-6)',
                    borderBottom: '1px solid var(--border-light)',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'var(--card)',
                    zIndex: 10,
                }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-4)' }}>
                        <h2 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>
                            Detalle del cambio
                        </h2>
                        <button
                            onClick={onClose}
                            className="btn-ghost"
                            style={{
                                padding: 'var(--spacing-2)',
                                borderRadius: 'var(--radius-md)',
                            }}
                            aria-label="Cerrar panel"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Badges Row */}
                    <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                        <div className={isImportant ? 'badge badge-important' : 'badge badge-normal'}>
                            {change.importance || 'N/A'}
                        </div>
                        <div className="badge badge-status">
                            <Tag size={12} />
                            {change.status}
                        </div>
                        <div className="badge badge-status">
                            <Calendar size={12} />
                            {dateStr}
                        </div>
                        {change.ai_score !== null && (
                            <div className="badge badge-status">
                                IA Score: {Math.round((change.ai_score || 0) * 100)}%
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div style={{
                    flex: 1,
                    padding: 'var(--spacing-6)',
                    overflowY: 'auto',
                }}>
                    {/* Title */}
                    <section style={{ marginBottom: 'var(--spacing-6)' }}>
                        <h3 style={{
                            fontSize: 'var(--font-size-xl)',
                            fontWeight: 600,
                            color: 'var(--blue-night)',
                            marginBottom: 'var(--spacing-2)',
                            lineHeight: 1.4,
                        }}>
                            {change.title || '(sin título)'}
                        </h3>
                        <div style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-secondary)',
                        }}>
                            Wachet ID: <code style={{
                                padding: '2px 6px',
                                backgroundColor: 'var(--gray-50)',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'monospace',
                            }}>
                                {change.wachet_id}
                            </code>
                        </div>
                    </section>

                    {/* AI Summary */}
                    {change.ai_reason && (
                        <section style={{ marginBottom: 'var(--spacing-6)' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)',
                                marginBottom: 'var(--spacing-3)',
                            }}>
                                <h3 style={{ margin: 0 }}>Resumen IA</h3>
                                <span style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-secondary)',
                                    fontStyle: 'italic',
                                }}>
                                    Generado automáticamente
                                </span>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-4)',
                                backgroundColor: 'var(--gray-50)',
                                borderLeft: '4px solid var(--blue-night)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-base)',
                                lineHeight: 1.6,
                                color: 'var(--text-primary)',
                            }}>
                                {change.ai_reason}
                            </div>
                        </section>
                    )}

                    {/* Original Content Placeholder */}
                    <section style={{ marginBottom: 'var(--spacing-6)' }}>
                        <h3 style={{ marginBottom: 'var(--spacing-3)' }}>
                            Contenido original
                        </h3>
                        <div style={{
                            padding: 'var(--spacing-4)',
                            backgroundColor: 'white',
                            border: '1px solid var(--border-light)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-secondary)',
                            fontStyle: 'italic',
                        }}>
                            El contenido completo estará disponible próximamente.
                            {change.url && (
                                <>
                                    {' '}Mientras tanto, puedes{' '}
                                    <a
                                        href={change.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: 'var(--blue-night)', fontWeight: 500 }}
                                    >
                                        ver la fuente original
                                    </a>.
                                </>
                            )}
                        </div>
                    </section>

                    {/* Future: Affected Clients */}
                    <section style={{ marginBottom: 'var(--spacing-6)', opacity: 0.5 }}>
                        <h3 style={{ marginBottom: 'var(--spacing-3)' }}>
                            Clientes potencialmente afectados
                            <span style={{
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 400,
                                marginLeft: 'var(--spacing-2)',
                            }}>
                                (próximamente)
                            </span>
                        </h3>
                        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                            <span className="badge badge-status">Retail Corp</span>
                            <span className="badge badge-status">Construcción SA</span>
                            <span className="badge badge-status">FinTech Ltd</span>
                        </div>
                    </section>
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: 'var(--spacing-6)',
                    borderTop: '1px solid var(--border-light)',
                    backgroundColor: 'var(--gray-50)',
                    position: 'sticky',
                    bottom: 0,
                }}>
                    <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                        {/* Lógica nueva:
                            - Si está en PENDING o FILTERED: muestra "Marcar como revisado" → VALIDATED
                            - Si está en VALIDATED o PUBLISHED: muestra "Cambiar a pendientes" → PENDING
                        */}

                        {(change.status === 'PENDING' || change.status === 'FILTERED') && (
                            <button
                                onClick={() => onValidate?.(change)}
                                className="btn btn-primary"
                                style={{ flex: 1, minWidth: '180px' }}
                            >
                                <CheckCircle size={18} />
                                Marcar como revisado
                            </button>
                        )}

                        {(change.status === 'VALIDATED' || change.status === 'PUBLISHED') && (
                            <button
                                onClick={() => onMoveToPending?.(change)}
                                className="btn btn-outline"
                                style={{ flex: 1, minWidth: '180px', borderColor: 'var(--blue-night)', color: 'var(--blue-night)' }}
                            >
                                <RotateCcw size={18} />
                                Cambiar a pendientes
                            </button>
                        )}
                    </div>

                    {change.url && (
                        <a
                            href={change.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-ghost"
                            style={{
                                width: '100%',
                                marginTop: 'var(--spacing-3)',
                                justifyContent: 'center',
                            }}
                        >
                            <ExternalLink size={18} />
                            Ver fuente original
                        </a>
                    )}
                </div>
            </aside>
        </>
    );
}
