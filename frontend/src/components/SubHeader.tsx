import { Calendar } from 'lucide-react';

type SubHeaderProps = {
    activeView: 'all' | 'important' | 'pending';
    onViewChange: (view: 'all' | 'important' | 'pending') => void;
    dateRange: string;
    onDateRangeChange: (range: string) => void;
};

export default function SubHeader({
    activeView,
    onViewChange,
    dateRange,
    onDateRangeChange
}: SubHeaderProps) {
    return (
        <div style={{
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-light)',
            padding: 'var(--spacing-6) 0',
        }}>
            <div className="container">
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--spacing-4)',
                }}>
                    {/* Title & Subtitle */}
                    <div>
                        <h1 style={{ marginBottom: 'var(--spacing-1)' }}>
                            Cambios relevantes
                        </h1>
                        <p style={{
                            fontSize: 'var(--font-size-base)',
                            color: 'var(--text-secondary)',
                        }}>
                            Resumen de cambios legales y regulatorios filtrados por IA
                        </p>
                    </div>

                    {/* Controls Row */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 'var(--spacing-4)',
                    }}>
                        {/* View Tabs */}
                        <div
                            className="flex gap-2"
                            role="tablist"
                            style={{
                                backgroundColor: 'white',
                                padding: 'var(--spacing-1)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-light)',
                            }}
                        >
                            <button
                                role="tab"
                                aria-selected={activeView === 'all'}
                                onClick={() => onViewChange('all')}
                                style={{
                                    padding: 'var(--spacing-2) var(--spacing-4)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 500,
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    transition: 'all 200ms',
                                    backgroundColor: activeView === 'all' ? 'var(--blue-night)' : 'transparent',
                                    color: activeView === 'all' ? 'white' : 'var(--text-secondary)',
                                }}
                            >
                                Todos
                            </button>
                            <button
                                role="tab"
                                aria-selected={activeView === 'important'}
                                onClick={() => onViewChange('important')}
                                style={{
                                    padding: 'var(--spacing-2) var(--spacing-4)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 500,
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    transition: 'all 200ms',
                                    backgroundColor: activeView === 'important' ? 'var(--blue-night)' : 'transparent',
                                    color: activeView === 'important' ? 'white' : 'var(--text-secondary)',
                                }}
                            >
                                Solo importantes
                            </button>
                            <button
                                role="tab"
                                aria-selected={activeView === 'pending'}
                                onClick={() => onViewChange('pending')}
                                style={{
                                    padding: 'var(--spacing-2) var(--spacing-4)',
                                    fontSize: 'var(--font-size-sm)',
                                    fontWeight: 500,
                                    border: 'none',
                                    borderRadius: 'var(--radius-sm)',
                                    cursor: 'pointer',
                                    transition: 'all 200ms',
                                    backgroundColor: activeView === 'pending' ? 'var(--blue-night)' : 'transparent',
                                    color: activeView === 'pending' ? 'white' : 'var(--text-secondary)',
                                }}
                            >
                                Pendientes
                            </button>
                        </div>

                        {/* Date Range Selector */}
                        <div className="flex items-center gap-2">
                            <Calendar size={18} color="var(--text-secondary)" />
                            <select
                                value={dateRange}
                                onChange={(e) => onDateRangeChange(e.target.value)}
                                className="input"
                                style={{
                                    width: 'auto',
                                    minWidth: '150px',
                                    fontSize: 'var(--font-size-sm)',
                                }}
                            >
                                <option value="7">Últimos 7 días</option>
                                <option value="30">Últimos 30 días</option>
                                <option value="90">Últimos 90 días</option>
                                <option value="custom">Personalizado</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
