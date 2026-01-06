import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';
import { type Change } from './ChangesTable';
import { createAlert, type AlertDispatch } from '../hooks/useChanges';

type AlertRegistrationModalProps = {
    change: Change;
    onClose: () => void;
    onSuccess: () => void;
};

// Dropdown options
const COUNTRIES = ['México', 'Chile', 'Colombia', 'Perú', 'Argentina', 'Costa Rica', 'Ecuador', 'Panamá', 'Brasil'];
const TYPES = ['Regulatoria', 'Informativa'];
const SUBJECTS = ['Bancario', 'Fintech', 'Seguros', 'Valores', 'General', 'Ciberseguridad', 'Datos Personales', 'AML/PLD'];
const INSTANCES = ['Legislativo', 'Ejecutivo', 'Judicial', 'Organismos Autónomos', 'Internacional'];

export default function AlertRegistrationModal({ change, onClose, onSuccess }: AlertRegistrationModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form State
    const [email, setEmail] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [country, setCountry] = useState(change.source_country || 'México');
    const [count, setCount] = useState(1);
    const [type, setType] = useState('Regulatoria');
    const [subject, setSubject] = useState('');
    const [topic, setTopic] = useState('');
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

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al registrar alerta');
        } finally {
            setLoading(false);
        }
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
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 100,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '1rem',
                }}
            >
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        width: '100%',
                        maxWidth: '42rem',
                        maxHeight: '90vh',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >

                    {/* Header */}
                    <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                        <h2 className="text-lg font-semibold text-gray-800">Registrar Alerta</h2>
                        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">

                        {error && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm flex items-center gap-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Email */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Responsable *</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="nombre@asertiva.it"
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full border rounded-md p-2"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>

                            {/* Country */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">País / Estado *</label>
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={country}
                                    onChange={e => setCountry(e.target.value)}
                                >
                                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* # Alerts */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Número de Alertas *</label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    className="w-full border rounded-md p-2"
                                    value={count}
                                    onChange={e => setCount(parseInt(e.target.value))}
                                />
                            </div>

                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={type}
                                    onChange={e => setType(e.target.value)}
                                >
                                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>

                            {/* Instance */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Instancia *</label>
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={instance}
                                    onChange={e => setInstance(e.target.value)}
                                >
                                    {INSTANCES.map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>

                            {/* Legislative Body (Conditional) */}
                            {instance === 'Legislativo' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Corporación Legislativa *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full border rounded-md p-2"
                                        placeholder="ej. Senado, Cámara..."
                                        value={legislativeBody}
                                        onChange={e => setLegislativeBody(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Materia *</label>
                                <select
                                    className="w-full border rounded-md p-2"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Topic */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ámbito / Tema *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full border rounded-md p-2"
                                    placeholder="Resumen del tema..."
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                />
                            </div>

                            {/* Clients */}
                            <div className="col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Clientes (Opcional)</label>
                                <textarea
                                    className="w-full border rounded-md p-2 h-20"
                                    placeholder="Nombres de clientes separados por comas..."
                                    value={clients}
                                    onChange={e => setClients(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="pt-4 border-t flex justify-end gap-3" style={{ position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                                disabled={loading}
                            >
                                <Save size={16} />
                                {loading ? 'Guardando...' : 'Registrar Alerta'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
