import { FileQuestion } from 'lucide-react';

type EmptyStateProps = {
    message?: string;
    onClearFilters?: () => void;
};

export default function EmptyState({
    message = "No hay cambios en este rango de fechas",
    onClearFilters
}: EmptyStateProps) {
    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--spacing-12)',
            textAlign: 'center',
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
                <FileQuestion size={40} color="var(--text-secondary)" />
            </div>

            {/* Message */}
            <h3 style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: 'var(--spacing-2)',
            }}>
                Sin resultados
            </h3>

            <p style={{
                fontSize: 'var(--font-size-base)',
                color: 'var(--text-secondary)',
                marginBottom: 'var(--spacing-6)',
                maxWidth: '400px',
            }}>
                {message}
            </p>

            {/* Action */}
            {onClearFilters && (
                <button
                    onClick={onClearFilters}
                    className="btn btn-primary"
                >
                    Limpiar filtros
                </button>
            )}
        </div>
    );
}
