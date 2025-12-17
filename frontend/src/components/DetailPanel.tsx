import { useEffect, useMemo, useState } from 'react';
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
    const [showFullPrevious, setShowFullPrevious] = useState(false);
    const [showFullCurrent, setShowFullCurrent] = useState(false);
    const changeId = change?.id;

    useEffect(() => {
        setShowFullPrevious(false);
        setShowFullCurrent(false);
    }, [changeId]);

    const fallbackDiff = useMemo(() => {
        if (!change) return null;
        if (change.diff_text) return change.diff_text;
        const prev = change.previous_text || '';
        const curr = change.current_text || '';
        if (!prev && !curr) return null;

        const prevLines = prev.split(/\r?\n/);
        const currLines = curr.split(/\r?\n/);
        const maxLines = Math.max(prevLines.length, currLines.length);
        const diff: string[] = ['--- previous', '+++ current'];
        for (let i = 0; i < maxLines; i++) {
            const a = prevLines[i];
            const b = currLines[i];
            if (a === b) {
                diff.push(` ${a ?? ''}`);
                continue;
            }
            if (a !== undefined) diff.push(`-${a}`);
            if (b !== undefined) diff.push(`+${b}`);
        }
        return diff.join('\n');
    }, [change?.diff_text, change?.previous_text, change?.current_text, changeId]);

    const parsedDiff = useMemo(() => {
        const source = fallbackDiff;
        if (!source || !source.trim()) return null;
        return source.split('\n').map((line) => {
            let type: 'context' | 'add' | 'remove' | 'meta' = 'context';
            if (line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++')) {
                type = 'meta';
            } else if (line.startsWith('+')) {
                type = 'add';
            } else if (line.startsWith('-')) {
                type = 'remove';
            }
            return { type, value: line };
        });
    }, [fallbackDiff]);

    const renderTextColumn = (
        label: string,
        text: string | null | undefined,
        expanded: boolean,
        onToggle: () => void
    ) => {
        const cleanText = text?.trim() ?? '';
        const needsToggle = cleanText.length > 1200;
        return (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
                <div
                    style={{
                        border: '1px solid var(--border-light)',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'white',
                        padding: 'var(--spacing-3)',
                        maxHeight: expanded || !needsToggle ? 'none' : '240px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                        color: cleanText ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: 'var(--font-size-sm)',
                        lineHeight: 1.5,
                    }}
                >
                    {cleanText || 'No disponible'}
                </div>
                {needsToggle && (
                    <button
                        className="btn btn-ghost"
                        style={{ alignSelf: 'flex-start', padding: '4px 8px' }}
                        onClick={onToggle}
                    >
                        {expanded ? 'Ver menos' : 'Ver más'}
                    </button>
                )}
            </div>
        );
    };

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

                    {/* Antes vs Después */}
                    <section style={{ marginBottom: 'var(--spacing-6)' }}>
                        <h3 style={{ marginBottom: 'var(--spacing-3)' }}>
                            Contenido original
                        </h3>
                        <div style={{ display: 'flex', gap: 'var(--spacing-4)', flexWrap: 'wrap' }}>
                            {renderTextColumn('Antes', change.previous_text, showFullPrevious, () => setShowFullPrevious((v) => !v))}
                            {renderTextColumn('Después', change.current_text, showFullCurrent, () => setShowFullCurrent((v) => !v))}
                        </div>
                    </section>

                    {/* Diff detected */}
                    <section style={{ marginBottom: 'var(--spacing-6)' }}>
                        <h3 style={{ marginBottom: 'var(--spacing-3)' }}>
                            Cambios detectados
                        </h3>
                        {parsedDiff && parsedDiff.length > 0 ? (
                            <div
                                style={{
                                    border: '1px solid var(--border-light)',
                                    borderRadius: 'var(--radius-md)',
                                    backgroundColor: 'white',
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                    lineHeight: 1.5,
                                    maxHeight: '320px',
                                    overflowY: 'auto',
                                }}
                            >
                                {parsedDiff.map((line, idx) => {
                                    let bg = 'transparent';
                                    let color = 'var(--text-primary)';
                                    if (line.type === 'add') {
                                        bg = '#e8f5e9';
                                        color = '#1b5e20';
                                    } else if (line.type === 'remove') {
                                        bg = '#fdecea';
                                        color = '#c62828';
                                    } else if (line.type === 'meta') {
                                        bg = 'var(--gray-50)';
                                        color = 'var(--text-secondary)';
                                    }
                                    return (
                                        <div
                                            key={`${idx}-${line.type}-${line.value.slice(0, 20)}`}
                                            style={{
                                                padding: '4px 8px',
                                                backgroundColor: bg,
                                                color,
                                                borderBottom: '1px solid var(--border-light)',
                                            }}
                                        >
                                            {line.value || ' '}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div style={{
                                padding: 'var(--spacing-4)',
                                backgroundColor: 'white',
                                border: '1px solid var(--border-light)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--text-secondary)',
                                fontSize: 'var(--font-size-sm)',
                            }}>
                                No se pudo calcular diff para este registro.
                            </div>
                        )}
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
