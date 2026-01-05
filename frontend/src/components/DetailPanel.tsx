import React, { useEffect, useMemo, useState } from 'react';
import { X, ExternalLink, CheckCircle, Calendar, Tag, RotateCcw, Columns, FileText, ArrowLeftRight, FileCode } from 'lucide-react';
import { type Change } from './ChangesTable';
import * as Diff from 'diff';

type DetailPanelProps = {
    change: Change | null;
    onClose: () => void;
    onValidate?: (change: Change) => void;
    onMoveToPending?: (change: Change) => void;
};

type TabId = 'comparison' | 'unified' | 'before' | 'after';

interface WordDiff {
    value: string;
    added?: boolean;
    removed?: boolean;
}

export default function DetailPanel({
    change,
    onClose,
    onValidate,
    onMoveToPending
}: DetailPanelProps) {
    const [activeTab, setActiveTab] = useState<TabId>('comparison');
    const [showFullText, setShowFullText] = useState(false);
    const changeId = change?.id;

    // Reset state when change selection changes
    useEffect(() => {
        setActiveTab('comparison');
        setShowFullText(false);
    }, [changeId]);

    // Compute word-level diff for Split View
    const wordDiff = useMemo((): WordDiff[] => {
        if (!change) return [];
        const prev = change.previous_text?.trim() || '';
        const curr = change.current_text?.trim() || '';
        if (!prev && !curr) return [];
        return Diff.diffWords(prev, curr);
    }, [change?.previous_text, change?.current_text, changeId]);

    // Compute unified diff (line-by-line)
    const unifiedDiff = useMemo(() => {
        if (!change) return null;
        if (change.diff_text) return change.diff_text;
        const prev = change.previous_text || '';
        const curr = change.current_text || '';
        if (!prev && !curr) return null;

        const patch = Diff.createPatch('documento', prev, curr, 'Antes', 'Después');
        return patch;
    }, [change?.diff_text, change?.previous_text, change?.current_text, changeId]);

    // Parse unified diff into styled lines
    const parsedUnifiedDiff = useMemo(() => {
        const source = unifiedDiff;
        if (!source || !source.trim()) return null;
        return source.split('\n').map((line) => {
            let type: 'context' | 'add' | 'remove' | 'meta' = 'context';
            if (line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++') || line.startsWith('Index:') || line.startsWith('===') || line.startsWith('\\')) {
                type = 'meta';
            } else if (line.startsWith('+')) {
                type = 'add';
            } else if (line.startsWith('-')) {
                type = 'remove';
            }
            return { type, value: line };
        });
    }, [unifiedDiff]);

    // Render Split View with word-level highlighting
    const renderSplitView = () => {
        const prev = change?.previous_text?.trim() || '';
        const curr = change?.current_text?.trim() || '';

        if (!prev && !curr) {
            return (
                <div style={{
                    padding: 'var(--spacing-6)',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--gray-50)',
                    borderRadius: 'var(--radius-md)',
                }}>
                    No hay contenido para comparar.
                </div>
            );
        }

        // Build before/after with highlighted diffs
        const beforeParts: React.ReactNode[] = [];
        const afterParts: React.ReactNode[] = [];

        wordDiff.forEach((part, idx) => {
            const key = `word-${idx}`;
            if (part.removed) {
                beforeParts.push(
                    <span key={key} style={{
                        backgroundColor: '#fecaca',
                        color: '#991b1b',
                        padding: '1px 2px',
                        borderRadius: '2px',
                        textDecoration: 'line-through',
                    }}>
                        {part.value}
                    </span>
                );
            } else if (part.added) {
                afterParts.push(
                    <span key={key} style={{
                        backgroundColor: '#bbf7d0',
                        color: '#166534',
                        padding: '1px 2px',
                        borderRadius: '2px',
                        fontWeight: 500,
                    }}>
                        {part.value}
                    </span>
                );
            } else {
                beforeParts.push(<span key={`before-${key}`}>{part.value}</span>);
                afterParts.push(<span key={`after-${key}`}>{part.value}</span>);
            }
        });

        return (
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--spacing-3)',
                maxHeight: showFullText ? 'none' : '400px',
                overflow: 'auto',
            }}>
                {/* BEFORE Column */}
                <div style={{
                    border: '1px solid #fecaca',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        backgroundColor: '#fef2f2',
                        padding: 'var(--spacing-2) var(--spacing-3)',
                        fontWeight: 600,
                        fontSize: 'var(--font-size-sm)',
                        color: '#991b1b',
                        borderBottom: '1px solid #fecaca',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2)',
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#ef4444',
                        }} />
                        ANTES
                    </div>
                    <div style={{
                        padding: 'var(--spacing-3)',
                        fontSize: 'var(--font-size-sm)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        backgroundColor: 'white',
                        minHeight: '100px',
                    }}>
                        {beforeParts.length > 0 ? beforeParts : <span style={{ color: 'var(--text-secondary)' }}>Sin contenido previo</span>}
                    </div>
                </div>

                {/* AFTER Column */}
                <div style={{
                    border: '1px solid #86efac',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                }}>
                    <div style={{
                        backgroundColor: '#f0fdf4',
                        padding: 'var(--spacing-2) var(--spacing-3)',
                        fontWeight: 600,
                        fontSize: 'var(--font-size-sm)',
                        color: '#166534',
                        borderBottom: '1px solid #86efac',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--spacing-2)',
                    }}>
                        <span style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#22c55e',
                        }} />
                        DESPUÉS
                    </div>
                    <div style={{
                        padding: 'var(--spacing-3)',
                        fontSize: 'var(--font-size-sm)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        backgroundColor: 'white',
                        minHeight: '100px',
                    }}>
                        {afterParts.length > 0 ? afterParts : <span style={{ color: 'var(--text-secondary)' }}>Sin contenido nuevo</span>}
                    </div>
                </div>
            </div>
        );
    };

    // Render unified diff view
    const renderUnifiedView = () => {
        if (!parsedUnifiedDiff || parsedUnifiedDiff.length === 0) {
            return (
                <div style={{
                    padding: 'var(--spacing-6)',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    backgroundColor: 'var(--gray-50)',
                    borderRadius: 'var(--radius-md)',
                }}>
                    No se detectaron diferencias.
                </div>
            );
        }

        return (
            <div style={{
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'white',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                fontSize: '12px',
                lineHeight: 1.5,
                maxHeight: showFullText ? 'none' : '400px',
                overflowY: 'auto',
            }}>
                {parsedUnifiedDiff.map((line, idx) => {
                    let bg = 'transparent';
                    let color = 'var(--text-primary)';
                    let borderLeft = 'none';

                    if (line.type === 'add') {
                        bg = '#ecfdf5';
                        color = '#065f46';
                        borderLeft = '3px solid #10b981';
                    } else if (line.type === 'remove') {
                        bg = '#fef2f2';
                        color = '#991b1b';
                        borderLeft = '3px solid #ef4444';
                    } else if (line.type === 'meta') {
                        bg = 'var(--gray-50)';
                        color = 'var(--text-secondary)';
                    }

                    return (
                        <div
                            key={`unified-${idx}`}
                            style={{
                                padding: '2px 12px',
                                backgroundColor: bg,
                                color,
                                borderLeft,
                                borderBottom: '1px solid var(--border-light)',
                                minHeight: '20px',
                            }}
                        >
                            {line.value || '\u00A0'}
                        </div>
                    );
                })}
            </div>
        );
    };

    // Render single text view (Before or After)
    const renderSingleTextView = (text: string | null | undefined, label: string) => {
        const cleanText = text?.trim() ?? '';

        return (
            <div style={{
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'white',
                overflow: 'hidden',
            }}>
                <div style={{
                    backgroundColor: 'var(--gray-50)',
                    padding: 'var(--spacing-2) var(--spacing-3)',
                    fontWeight: 600,
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                    borderBottom: '1px solid var(--border-light)',
                }}>
                    {label}
                </div>
                <div style={{
                    padding: 'var(--spacing-4)',
                    fontSize: 'var(--font-size-sm)',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: showFullText ? 'none' : '400px',
                    overflowY: 'auto',
                    color: cleanText ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}>
                    {cleanText || 'No disponible'}
                </div>
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

    const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
        { id: 'comparison', label: 'Comparación', icon: <Columns size={14} /> },
        { id: 'unified', label: 'Unificado', icon: <ArrowLeftRight size={14} /> },
        { id: 'before', label: 'Antes', icon: <FileText size={14} /> },
        { id: 'after', label: 'Después', icon: <FileCode size={14} /> },
    ];

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
                    width: '55%',
                    minWidth: '600px',
                    maxWidth: '900px',
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
                    padding: 'var(--spacing-5)',
                    borderBottom: '1px solid var(--border-light)',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: 'var(--card)',
                    zIndex: 10,
                }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-3)' }}>
                        <h2 style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 600 }}>
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
                            <X size={22} />
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
                    padding: 'var(--spacing-5)',
                    overflowY: 'auto',
                }}>
                    {/* Title */}
                    <section style={{ marginBottom: 'var(--spacing-5)' }}>
                        <h3 style={{
                            fontSize: 'var(--font-size-lg)',
                            fontWeight: 600,
                            color: 'var(--blue-night)',
                            marginBottom: 'var(--spacing-1)',
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
                        <section style={{ marginBottom: 'var(--spacing-5)' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-2)',
                                marginBottom: 'var(--spacing-2)',
                            }}>
                                <h3 style={{ margin: 0, fontSize: 'var(--font-size-base)', fontWeight: 600 }}>Resumen IA</h3>
                                <span style={{
                                    fontSize: 'var(--font-size-xs)',
                                    color: 'var(--text-secondary)',
                                    fontStyle: 'italic',
                                }}>
                                    Generado automáticamente
                                </span>
                            </div>
                            <div style={{
                                padding: 'var(--spacing-3)',
                                backgroundColor: 'var(--gray-50)',
                                borderLeft: '3px solid var(--blue-night)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-sm)',
                                lineHeight: 1.5,
                                color: 'var(--text-primary)',
                            }}>
                                {change.ai_reason}
                            </div>
                        </section>
                    )}

                    {/* Tab Navigation */}
                    <section style={{ marginBottom: 'var(--spacing-4)' }}>
                        <div style={{
                            display: 'flex',
                            gap: 'var(--spacing-1)',
                            borderBottom: '1px solid var(--border-light)',
                            marginBottom: 'var(--spacing-3)',
                        }}>
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: 'var(--spacing-2) var(--spacing-3)',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: activeTab === tab.id ? 600 : 400,
                                        color: activeTab === tab.id ? 'var(--blue-night)' : 'var(--text-secondary)',
                                        background: 'none',
                                        border: 'none',
                                        borderBottom: activeTab === tab.id ? '2px solid var(--blue-night)' : '2px solid transparent',
                                        cursor: 'pointer',
                                        marginBottom: '-1px',
                                        transition: 'all 0.15s ease',
                                    }}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Toggle for full text */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-2)' }}>
                            <button
                                onClick={() => setShowFullText(!showFullText)}
                                className="btn btn-ghost"
                                style={{ padding: '4px 8px', fontSize: 'var(--font-size-xs)' }}
                            >
                                {showFullText ? 'Contraer vista' : 'Expandir vista'}
                            </button>
                        </div>

                        {/* Tab Content */}
                        {activeTab === 'comparison' && renderSplitView()}
                        {activeTab === 'unified' && renderUnifiedView()}
                        {activeTab === 'before' && renderSingleTextView(change.previous_text, 'Contenido Anterior')}
                        {activeTab === 'after' && renderSingleTextView(change.current_text, 'Contenido Nuevo')}
                    </section>

                    {/* Future: Affected Clients */}
                    <section style={{ marginBottom: 'var(--spacing-5)', opacity: 0.5 }}>
                        <h3 style={{ marginBottom: 'var(--spacing-2)', fontSize: 'var(--font-size-base)' }}>
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
                    padding: 'var(--spacing-5)',
                    borderTop: '1px solid var(--border-light)',
                    backgroundColor: 'var(--gray-50)',
                    position: 'sticky',
                    bottom: 0,
                }}>
                    <div className="flex gap-3" style={{ flexWrap: 'wrap' }}>
                        {(change.status === 'PENDING' || change.status === 'FILTERED') && (
                            <button
                                onClick={() => onValidate?.(change)}
                                className="btn btn-primary"
                                style={{ flex: 1, minWidth: '160px' }}
                            >
                                <CheckCircle size={16} />
                                Marcar como revisado
                            </button>
                        )}

                        {(change.status === 'VALIDATED' || change.status === 'PUBLISHED') && (
                            <button
                                onClick={() => onMoveToPending?.(change)}
                                className="btn btn-outline"
                                style={{ flex: 1, minWidth: '160px', borderColor: 'var(--blue-night)', color: 'var(--blue-night)' }}
                            >
                                <RotateCcw size={16} />
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
                            <ExternalLink size={16} />
                            Ver fuente original
                        </a>
                    )}
                </div>
            </aside>
        </>
    );
}
