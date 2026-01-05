import { FileQuestion, Database, Play, Filter } from 'lucide-react';

type EmptyStateVariant = 'no-data' | 'no-results' | 'filtered';

type EmptyStateProps = {
    variant?: EmptyStateVariant;
    message?: string;
    hasFiltersApplied?: boolean;
    onClearFilters?: () => void;
    onRefresh?: () => void;
};

export default function EmptyState({
    variant = 'no-results',
    message,
    hasFiltersApplied = false,
    onClearFilters,
    onRefresh,
}: EmptyStateProps) {
    // Determine content based on variant
    const getContent = () => {
        switch (variant) {
            case 'no-data':
                return {
                    icon: <Database size={40} color="var(--text-secondary)" />,
                    title: 'Sin datos en el sistema',
                    description: message || 'No se han encontrado cambios registrados. El pipeline de ingesta puede no haber corrido todavia.',
                    instructions: (
                        <ul style={{
                            textAlign: 'left',
                            margin: 0,
                            paddingLeft: 'var(--spacing-4)',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.8,
                        }}>
                            <li>Verifica que el <strong>ingestor</strong> este corriendo: <code>docker compose up ingestor</code></li>
                            <li>Revisa los logs: <code>docker compose logs -f ingestor</code></li>
                            <li>El ingestor consulta Wachete cada cierto tiempo para obtener cambios</li>
                            <li>Si hay cambios nuevos, apareceran aqui automaticamente</li>
                        </ul>
                    ),
                };

            case 'filtered':
                return {
                    icon: <Filter size={40} color="var(--text-secondary)" />,
                    title: 'Sin coincidencias',
                    description: message || 'Ningun cambio coincide con los filtros aplicados.',
                    instructions: hasFiltersApplied ? (
                        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            Prueba ajustando los filtros de pais, institucion o importancia, o limpia todos los filtros.
                        </p>
                    ) : null,
                };

            case 'no-results':
            default:
                return {
                    icon: <FileQuestion size={40} color="var(--text-secondary)" />,
                    title: 'Sin resultados',
                    description: message || 'No hay cambios que mostrar en este momento.',
                    instructions: null,
                };
        }
    };

    const content = getContent();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-8)',
            textAlign: 'center',
            minHeight: '300px',
        }}>
            {/* Icon */}
            <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: 'var(--gray-50)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--spacing-4)',
            }}>
                {content.icon}
            </div>

            {/* Title */}
            <h3 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-2)',
            }}>
                {content.title}
            </h3>

            {/* Description */}
            <p style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-4)',
                maxWidth: '500px',
            }}>
                {content.description}
            </p>

            {/* Instructions */}
            {content.instructions && (
                <div style={{
                    marginBottom: 'var(--spacing-6)',
                    maxWidth: '500px',
                }}>
                    {content.instructions}
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 'var(--spacing-3)' }}>
                {hasFiltersApplied && onClearFilters && (
                    <button
                        onClick={onClearFilters}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-2)',
                            padding: 'var(--spacing-3) var(--spacing-5)',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 500,
                            backgroundColor: 'var(--blue-night, #1E3A5F)',
                            color: 'white',
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                        }}
                    >
                        Limpiar filtros
                    </button>
                )}

                {variant === 'no-data' && onRefresh && (
                    <button
                        onClick={onRefresh}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-2)',
                            padding: 'var(--spacing-3) var(--spacing-5)',
                            fontSize: 'var(--font-size-base)',
                            fontWeight: 500,
                            backgroundColor: 'var(--gray-100)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                        }}
                    >
                        <Play size={16} />
                        Recargar
                    </button>
                )}
            </div>
        </div>
    );
}
