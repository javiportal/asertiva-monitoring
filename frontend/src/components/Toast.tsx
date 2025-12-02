import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastProps = {
    message: string;
    type?: ToastType;
    onClose: () => void;
    duration?: number;
};

export default function Toast({
    message,
    type = 'info',
    onClose,
    duration = 3000
}: ToastProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: CheckCircle,
        error: XCircle,
        info: Info,
        warning: AlertTriangle,
    };

    const colors = {
        success: 'var(--blue-night)',
        error: 'var(--red-accent)',
        info: 'var(--blue-night)',
        warning: '#f59e0b',
    };

    const Icon = icons[type];

    return (
        <div
            className="slide-in-down"
            style={{
                position: 'fixed',
                top: 'calc(var(--header-height) + 16px)',
                right: '16px',
                zIndex: 100,
                backgroundColor: colors[type],
                color: 'white',
                padding: 'var(--spacing-4) var(--spacing-5)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-3)',
                minWidth: '300px',
                maxWidth: '500px',
            }}
        >
            <Icon size={20} />
            <div style={{
                flex: 1,
                fontSize: 'var(--font-size-base)',
                fontWeight: 500,
            }}>
                {message}
            </div>
            <button
                onClick={onClose}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: 'var(--spacing-1)',
                    display: 'flex',
                    alignItems: 'center',
                    opacity: 0.8,
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                aria-label="Cerrar notificación"
            >
                <XCircle size={18} />
            </button>
        </div>
    );
}
