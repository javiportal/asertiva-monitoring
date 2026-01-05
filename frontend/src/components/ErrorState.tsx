// src/components/ErrorState.tsx
import { useState } from 'react';
import { AlertCircle, RefreshCw, ChevronDown, ChevronUp, Server, Wifi, FileWarning } from 'lucide-react';
import type { ApiError } from '../hooks/useChanges';

type ErrorStateProps = {
    error: ApiError;
    onRetry?: () => void;
    isRetrying?: boolean;
};

export default function ErrorState({ error, onRetry, isRetrying = false }: ErrorStateProps) {
    const [showDetails, setShowDetails] = useState(false);

    // Determine error type icon and color
    const getErrorIcon = () => {
        if (error.isNetworkError) return <Wifi size={40} />;
        if (error.isServerError) return <Server size={40} />;
        if (error.isParseError) return <FileWarning size={40} />;
        return <AlertCircle size={40} />;
    };

    const getErrorTitle = () => {
        if (error.isNetworkError) return 'Error de conexion';
        if (error.isServerError) return 'Error del servidor';
        if (error.isParseError) return 'Error de formato';
        return 'Error al cargar datos';
    };

    const getHelpText = () => {
        if (error.isNetworkError) {
            return (
                <ul style={{ textAlign: 'left', margin: 0, paddingLeft: 'var(--spacing-4)' }}>
                    <li>Verifica que el backend este corriendo: <code>docker compose up api</code></li>
                    <li>El API deberia estar en <code>http://localhost:8000</code></li>
                    <li>Prueba acceder a <code>http://localhost:8000/health</code></li>
                </ul>
            );
        }
        if (error.isServerError) {
            return (
                <ul style={{ textAlign: 'left', margin: 0, paddingLeft: 'var(--spacing-4)' }}>
                    <li>Revisa los logs del backend: <code>docker compose logs -f api</code></li>
                    <li>Verifica que las migraciones esten aplicadas</li>
                    <li>El error {error.status} indica un problema interno del servidor</li>
                </ul>
            );
        }
        if (error.isParseError) {
            return (
                <ul style={{ textAlign: 'left', margin: 0, paddingLeft: 'var(--spacing-4)' }}>
                    <li>La respuesta no es JSON valido</li>
                    <li>Verifica que FastAPI este corriendo (no otro servicio en :8000)</li>
                    <li>Prueba <code>curl http://localhost:8000/health</code></li>
                </ul>
            );
        }
        return <p>Intenta recargar la pagina o contacta soporte si el problema persiste.</p>;
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--spacing-8)',
                textAlign: 'center',
                minHeight: '300px',
            }}
        >
            {/* Icon */}
            <div
                style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--red-light, #FEE2E2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--spacing-4)',
                    color: 'var(--red-accent, #DC2626)',
                }}
            >
                {getErrorIcon()}
            </div>

            {/* Title */}
            <h3
                style={{
                    fontSize: 'var(--font-size-lg)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: 'var(--spacing-2)',
                }}
            >
                {getErrorTitle()}
            </h3>

            {/* Message */}
            <p
                style={{
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--spacing-4)',
                    maxWidth: '500px',
                }}
            >
                {error.message}
            </p>

            {/* Help Text */}
            <div
                style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--spacing-6)',
                    maxWidth: '500px',
                    lineHeight: 1.6,
                }}
            >
                {getHelpText()}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 'var(--spacing-3)', marginBottom: 'var(--spacing-4)' }}>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        disabled={isRetrying}
                        className="btn btn-primary"
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
                            cursor: isRetrying ? 'wait' : 'pointer',
                            opacity: isRetrying ? 0.7 : 1,
                        }}
                    >
                        <RefreshCw
                            size={18}
                            style={{
                                animation: isRetrying ? 'spin 1s linear infinite' : 'none',
                            }}
                        />
                        {isRetrying ? 'Reintentando...' : 'Reintentar'}
                    </button>
                )}
            </div>

            {/* Technical Details Toggle */}
            {(error.raw || error.status) && (
                <div style={{ width: '100%', maxWidth: '600px' }}>
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-1)',
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--text-secondary)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            margin: '0 auto',
                            padding: 'var(--spacing-2)',
                        }}
                    >
                        {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        Detalles tecnicos
                    </button>

                    {showDetails && (
                        <div
                            style={{
                                marginTop: 'var(--spacing-3)',
                                padding: 'var(--spacing-4)',
                                backgroundColor: 'var(--gray-100, #F3F4F6)',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'left',
                                fontSize: 'var(--font-size-xs)',
                                fontFamily: 'monospace',
                                overflow: 'auto',
                                maxHeight: '200px',
                            }}
                        >
                            {error.status && (
                                <p style={{ margin: '0 0 var(--spacing-2) 0' }}>
                                    <strong>Status:</strong> {error.status} {error.statusText}
                                </p>
                            )}
                            {error.raw && (
                                <div>
                                    <strong>Respuesta:</strong>
                                    <pre
                                        style={{
                                            margin: 'var(--spacing-2) 0 0 0',
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                        }}
                                    >
                                        {error.raw}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Inline keyframes for spin animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
