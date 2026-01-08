import React, { useState, useEffect } from 'react';
import {
    X,
    Send,
    AlertCircle,
    Mail,
    Calendar,
    MapPin,
    Hash,
    FileText,
    Building2,
    Users,
    Bookmark,
    Scale,
    CheckCircle2
} from 'lucide-react';
import { type Change } from './ChangesTable';
import { createAlert, type AlertDispatch } from '../hooks/useChanges';

type AlertRegistrationModalProps = {
    change: Change;
    onClose: () => void;
    onSuccess: () => void;
};

// Dropdown options
const COUNTRIES = ['México', 'Chile', 'Colombia', 'Perú', 'Argentina', 'Costa Rica', 'Ecuador', 'Panamá', 'Brasil'];
const TYPES = [
    { value: 'Regulatoria', label: 'Regulatoria', color: '#dc2626', bg: '#fef2f2' },
    { value: 'Informativa', label: 'Informativa', color: '#0369a1', bg: '#e0f2fe' }
];
const SUBJECTS = ['Bancario', 'Fintech', 'Seguros', 'Valores', 'General', 'Ciberseguridad', 'Datos Personales', 'AML/PLD'];
const INSTANCES = ['Legislativo', 'Ejecutivo', 'Judicial', 'Organismos Autónomos', 'Internacional'];

// Reusable form field component
function FormField({
    label,
    icon: Icon,
    required = false,
    children,
    hint
}: {
    label: string;
    icon?: React.ElementType;
    required?: boolean;
    children: React.ReactNode;
    hint?: string;
}) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 500,
                color: 'var(--text-primary)',
            }}>
                {Icon && <Icon size={14} style={{ color: 'var(--text-secondary)' }} />}
                {label}
                {required && <span style={{ color: 'var(--red-accent)' }}>*</span>}
            </label>
            {children}
            {hint && (
                <span style={{
                    fontSize: 'var(--font-size-xs)',
                    color: 'var(--text-secondary)',
                }}>
                    {hint}
                </span>
            )}
        </div>
    );
}

export default function AlertRegistrationModal({ change, onClose, onSuccess }: AlertRegistrationModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form State - prefill from change data where available
    const [email, setEmail] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [country, setCountry] = useState(change.source_country || 'México');
    const [count, setCount] = useState(1);
    const [type, setType] = useState('Regulatoria');
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState(change.headline || '');
    const [instance, setInstance] = useState('Organismos Autónomos');
    const [legislativeBody, setLegislativeBody] = useState('');
    const [clients, setClients] = useState('');

    // Load saved email preference
    useEffect(() => {
        const savedEmail = localStorage.getItem('alert_dispatch_email');
        if (savedEmail) setEmail(savedEmail);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (!email) throw new Error('El email es obligatorio');
            if (!subject) throw new Error('La materia es obligatoria');
            if (!topic) throw new Error('El ámbito/tema es obligatorio');

            const payload: AlertDispatch = {
                change_id: change.id,
                email,
                dispatch_date: date,
                country_state: country,
                alert_count: count,
                alert_type: type,
                subject,
                topic,
                instance,
                legislative_body: instance === 'Legislativo' ? legislativeBody : undefined,
                clients
            };

            await createAlert(payload);

            // Save preference
            localStorage.setItem('alert_dispatch_email', email);

            setSuccess(true);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1000);
        } catch (err: any) {
            setError(err.message || 'Error al registrar alerta');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 12px',
        fontSize: 'var(--font-size-base)',
        fontFamily: 'var(--font-family)',
        color: 'var(--text-primary)',
        backgroundColor: 'var(--background)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)',
        transition: 'all 200ms ease',
        minHeight: '42px',
    };

    const selectStyle: React.CSSProperties = {
        ...inputStyle,
        cursor: 'pointer',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23717182' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '36px',
    };

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
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    backdropFilter: 'blur(4px)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--spacing-4)',
                    animation: 'fadeIn 200ms ease-out',
                }}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="slide-in-down"
                    style={{
                        backgroundColor: 'var(--card)',
                        borderRadius: 'var(--radius-xl)',
                        boxShadow: 'var(--shadow-lg)',
                        width: '100%',
                        maxWidth: '580px',
                        maxHeight: '90vh',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: 'var(--spacing-5)',
                        borderBottom: '1px solid var(--border-light)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        backgroundColor: 'var(--gray-50)',
                    }}>
                        <div>
                            <h2 style={{
                                margin: 0,
                                fontSize: 'var(--font-size-lg)',
                                fontWeight: 600,
                                color: 'var(--blue-night)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}>
                                <Send size={20} />
                                Registrar Alerta
                            </h2>
                            <p style={{
                                margin: '4px 0 0 0',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--text-secondary)',
                                maxWidth: '400px',
                            }}>
                                {change.title ? (
                                    <>Registrando alerta para: <strong style={{ color: 'var(--text-primary)' }}>{change.title.substring(0, 60)}{change.title.length > 60 ? '...' : ''}</strong></>
                                ) : (
                                    'Completa los datos para registrar la alerta'
                                )}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="btn-ghost"
                            style={{
                                padding: '8px',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Success State */}
                    {success ? (
                        <div style={{
                            padding: 'var(--spacing-8)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 'var(--spacing-4)',
                            textAlign: 'center',
                        }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                borderRadius: '50%',
                                backgroundColor: '#d1fae5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <CheckCircle2 size={32} style={{ color: '#059669' }} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, color: '#059669', fontSize: 'var(--font-size-lg)' }}>
                                    Alerta Registrada
                                </h3>
                                <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>
                                    La alerta ha sido registrada exitosamente
                                </p>
                            </div>
                        </div>
                    ) : (
                        /* Form */
                        <form onSubmit={handleSubmit} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            overflow: 'hidden',
                        }}>
                            {/* Scrollable Content */}
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: 'var(--spacing-5)',
                            }}>
                                {/* Error Message */}
                                {error && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px',
                                        backgroundColor: '#fef2f2',
                                        border: '1px solid #fecaca',
                                        borderRadius: 'var(--radius-md)',
                                        color: '#dc2626',
                                        fontSize: 'var(--font-size-sm)',
                                        marginBottom: 'var(--spacing-4)',
                                    }}>
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                {/* Section: Responsable */}
                                <div style={{ marginBottom: 'var(--spacing-5)' }}>
                                    <h4 style={{
                                        margin: '0 0 var(--spacing-3) 0',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>
                                        Responsable
                                    </h4>
                                    <FormField label="Email" icon={Mail} required hint="Se guardará para futuros registros">
                                        <input
                                            type="email"
                                            required
                                            style={inputStyle}
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="nombre@asertiva.it"
                                        />
                                    </FormField>
                                </div>

                                {/* Section: Detalles de la Alerta */}
                                <div style={{ marginBottom: 'var(--spacing-5)' }}>
                                    <h4 style={{
                                        margin: '0 0 var(--spacing-3) 0',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>
                                        Detalles de la Alerta
                                    </h4>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: 'var(--spacing-4)',
                                    }}>
                                        <FormField label="Fecha" icon={Calendar} required>
                                            <input
                                                type="date"
                                                required
                                                style={inputStyle}
                                                value={date}
                                                onChange={e => setDate(e.target.value)}
                                            />
                                        </FormField>

                                        <FormField label="País / Estado" icon={MapPin} required>
                                            <select
                                                style={selectStyle}
                                                value={country}
                                                onChange={e => setCountry(e.target.value)}
                                            >
                                                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </FormField>

                                        <FormField label="Número de Alertas" icon={Hash} required>
                                            <input
                                                type="number"
                                                min="1"
                                                required
                                                style={inputStyle}
                                                value={count}
                                                onChange={e => setCount(parseInt(e.target.value) || 1)}
                                            />
                                        </FormField>

                                        <FormField label="Tipo" icon={FileText} required>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                {TYPES.map(t => (
                                                    <button
                                                        key={t.value}
                                                        type="button"
                                                        onClick={() => setType(t.value)}
                                                        style={{
                                                            flex: 1,
                                                            padding: '10px 12px',
                                                            fontSize: 'var(--font-size-sm)',
                                                            fontWeight: 500,
                                                            borderRadius: 'var(--radius-md)',
                                                            border: type === t.value ? `2px solid ${t.color}` : '1px solid var(--border-light)',
                                                            backgroundColor: type === t.value ? t.bg : 'var(--background)',
                                                            color: type === t.value ? t.color : 'var(--text-secondary)',
                                                            cursor: 'pointer',
                                                            transition: 'all 150ms ease',
                                                        }}
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </FormField>
                                    </div>
                                </div>

                                {/* Section: Clasificación */}
                                <div style={{ marginBottom: 'var(--spacing-5)' }}>
                                    <h4 style={{
                                        margin: '0 0 var(--spacing-3) 0',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>
                                        Clasificación
                                    </h4>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                        gap: 'var(--spacing-4)',
                                    }}>
                                        <FormField label="Instancia" icon={Building2} required>
                                            <select
                                                style={selectStyle}
                                                value={instance}
                                                onChange={e => setInstance(e.target.value)}
                                            >
                                                {INSTANCES.map(i => <option key={i} value={i}>{i}</option>)}
                                            </select>
                                        </FormField>

                                        <FormField label="Materia" icon={Bookmark} required>
                                            <select
                                                style={selectStyle}
                                                value={subject}
                                                onChange={e => setSubject(e.target.value)}
                                                required
                                            >
                                                <option value="">Seleccionar...</option>
                                                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </FormField>

                                        {instance === 'Legislativo' && (
                                            <FormField label="Corporación Legislativa" icon={Scale} required>
                                                <input
                                                    type="text"
                                                    required
                                                    style={inputStyle}
                                                    placeholder="ej. Senado, Cámara..."
                                                    value={legislativeBody}
                                                    onChange={e => setLegislativeBody(e.target.value)}
                                                />
                                            </FormField>
                                        )}

                                        <div style={{ gridColumn: instance === 'Legislativo' ? '2' : '1 / -1' }}>
                                            <FormField label="Ámbito / Tema" icon={FileText} required>
                                                <input
                                                    type="text"
                                                    required
                                                    style={inputStyle}
                                                    placeholder="Resumen del tema regulatorio..."
                                                    value={topic}
                                                    onChange={e => setTopic(e.target.value)}
                                                />
                                            </FormField>
                                        </div>
                                    </div>
                                </div>

                                {/* Section: Información Adicional */}
                                <div>
                                    <h4 style={{
                                        margin: '0 0 var(--spacing-3) 0',
                                        fontSize: 'var(--font-size-sm)',
                                        fontWeight: 600,
                                        color: 'var(--text-secondary)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                    }}>
                                        Información Adicional
                                    </h4>

                                    <FormField label="Clientes Afectados" icon={Users} hint="Nombres de clientes separados por comas">
                                        <textarea
                                            style={{
                                                ...inputStyle,
                                                minHeight: '80px',
                                                resize: 'vertical',
                                            }}
                                            placeholder="Ej: Banco Nacional, Fintech SA, Seguros XYZ..."
                                            value={clients}
                                            onChange={e => setClients(e.target.value)}
                                        />
                                    </FormField>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{
                                padding: 'var(--spacing-4) var(--spacing-5)',
                                borderTop: '1px solid var(--border-light)',
                                backgroundColor: 'var(--gray-50)',
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 'var(--spacing-3)',
                            }}>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={loading}
                                    className="btn btn-ghost"
                                    style={{
                                        padding: '10px 20px',
                                        border: '1px solid var(--border-light)',
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary"
                                    style={{
                                        padding: '10px 24px',
                                        opacity: loading ? 0.7 : 1,
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <span style={{
                                                width: '16px',
                                                height: '16px',
                                                border: '2px solid transparent',
                                                borderTopColor: 'white',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite',
                                            }} />
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            Registrar Alerta
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Spinner animation */}
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </>
    );
}
