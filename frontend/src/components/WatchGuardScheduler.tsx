import { useState, useEffect, useCallback } from 'react';
import {
    Settings,
    Play,
    Clock,
    ChevronDown,
    ChevronUp,
    RefreshCw,
    AlertCircle,
    CheckCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

type SchedulerStatus = {
    enabled: boolean;
    start_hour: number;
    end_hour: number;
    interval_hours: number;
    last_run: string | null;
    next_scheduled_run: string | null;
    trigger_pending: boolean;
};

type WatchGuardSchedulerProps = {
    onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
};

export default function WatchGuardScheduler({ onToast }: WatchGuardSchedulerProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [status, setStatus] = useState<SchedulerStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Editable config state
    const [editStartHour, setEditStartHour] = useState(7);
    const [editEndHour, setEditEndHour] = useState(17);
    const [editIntervalHours, setEditIntervalHours] = useState(3);
    const [hasChanges, setHasChanges] = useState(false);

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/watchguard/scheduler/status`);
            if (!res.ok) {
                if (res.status === 500) {
                    throw new Error('Migration 005 may not be applied');
                }
                throw new Error(`Error ${res.status}`);
            }
            const data: SchedulerStatus = await res.json();
            setStatus(data);
            setEditStartHour(data.start_hour);
            setEditEndHour(data.end_hour);
            setEditIntervalHours(data.interval_hours);
            setHasChanges(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error fetching status');
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch and auto-refresh every 30 seconds
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    // Track changes
    useEffect(() => {
        if (status) {
            const changed =
                editStartHour !== status.start_hour ||
                editEndHour !== status.end_hour ||
                editIntervalHours !== status.interval_hours;
            setHasChanges(changed);
        }
    }, [editStartHour, editEndHour, editIntervalHours, status]);

    const handleToggle = async () => {
        if (!status) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/watchguard/scheduler/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !status.enabled }),
            });
            if (!res.ok) throw new Error('Error toggling scheduler');
            await fetchStatus();
            onToast?.(`Scheduler ${!status.enabled ? 'enabled' : 'disabled'}`, 'success');
        } catch (err) {
            onToast?.(err instanceof Error ? err.message : 'Error', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveConfig = async () => {
        if (editStartHour >= editEndHour) {
            onToast?.('Start hour must be before end hour', 'error');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/watchguard/scheduler/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_hour: editStartHour,
                    end_hour: editEndHour,
                    interval_hours: editIntervalHours,
                }),
            });
            if (!res.ok) throw new Error('Error saving configuration');
            await fetchStatus();
            onToast?.('Configuration saved', 'success');
        } catch (err) {
            onToast?.(err instanceof Error ? err.message : 'Error', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTrigger = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/watchguard/scheduler/trigger`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Error triggering run');
            await fetchStatus();
            onToast?.('Immediate run triggered', 'success');
        } catch (err) {
            onToast?.(err instanceof Error ? err.message : 'Error', 'error');
        } finally {
            setSaving(false);
        }
    };

    const formatDateTime = (isoString: string | null): string => {
        if (!isoString) return 'Never';
        try {
            const date = new Date(isoString);
            return date.toLocaleString('es-MX', {
                dateStyle: 'short',
                timeStyle: 'short',
            });
        } catch {
            return isoString;
        }
    };

    const hourOptions = Array.from({ length: 24 }, (_, i) => i);
    const intervalOptions = [1, 2, 3, 4, 6, 8, 12, 24];

    return (
        <div
            className="card"
            style={{
                marginBottom: 'var(--spacing-4)',
                overflow: 'hidden',
            }}
        >
            {/* Header - Always visible */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--spacing-4)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                    <div
                        style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: status?.enabled ? 'var(--success-bg)' : 'var(--gray-100)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <Settings
                            size={18}
                            color={status?.enabled ? 'var(--success-text)' : 'var(--text-secondary)'}
                        />
                    </div>
                    <div>
                        <div style={{
                            fontWeight: 600,
                            fontSize: 'var(--font-size-base)',
                            color: 'var(--text-primary)',
                        }}>
                            WatchGuard Scheduler
                        </div>
                        <div style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-2)',
                        }}>
                            {loading ? (
                                <span>Loading...</span>
                            ) : error ? (
                                <span style={{ color: 'var(--destructive)' }}>Error</span>
                            ) : status ? (
                                <>
                                    <span
                                        style={{
                                            display: 'inline-block',
                                            width: '8px',
                                            height: '8px',
                                            borderRadius: '50%',
                                            backgroundColor: status.enabled ? '#22c55e' : 'var(--gray-400)',
                                        }}
                                    />
                                    {status.enabled ? 'Active' : 'Disabled'}
                                    {status.enabled && status.next_scheduled_run && (
                                        <span style={{ marginLeft: 'var(--spacing-2)' }}>
                                            | Next: {formatDateTime(status.next_scheduled_run)}
                                        </span>
                                    )}
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp size={20} color="var(--text-secondary)" />
                ) : (
                    <ChevronDown size={20} color="var(--text-secondary)" />
                )}
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div
                    className="slide-in-down"
                    style={{
                        padding: '0 var(--spacing-4) var(--spacing-4)',
                        borderTop: '1px solid var(--border-light)',
                    }}
                >
                    {error ? (
                        <div
                            style={{
                                padding: 'var(--spacing-4)',
                                backgroundColor: 'var(--red-50)',
                                borderRadius: 'var(--radius-md)',
                                marginTop: 'var(--spacing-4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-3)',
                            }}
                        >
                            <AlertCircle size={20} color="var(--destructive)" />
                            <div>
                                <div style={{ fontWeight: 500, color: 'var(--destructive)' }}>
                                    Connection Error
                                </div>
                                <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                                    {error}
                                </div>
                            </div>
                            <button
                                onClick={fetchStatus}
                                className="btn btn-ghost"
                                style={{ marginLeft: 'auto', padding: 'var(--spacing-2)' }}
                            >
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    ) : status ? (
                        <>
                            {/* Status Info */}
                            <div
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(2, 1fr)',
                                    gap: 'var(--spacing-3)',
                                    marginTop: 'var(--spacing-4)',
                                    padding: 'var(--spacing-3)',
                                    backgroundColor: 'var(--gray-50)',
                                    borderRadius: 'var(--radius-md)',
                                }}
                            >
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                        Last Run
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                                        {formatDateTime(status.last_run)}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                                        Next Scheduled
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                                        {status.enabled ? formatDateTime(status.next_scheduled_run) : 'Disabled'}
                                    </div>
                                </div>
                            </div>

                            {/* Toggle Switch */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginTop: 'var(--spacing-4)',
                                    padding: 'var(--spacing-3)',
                                    backgroundColor: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-light)',
                                }}
                            >
                                <div>
                                    <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                                        Enable Scheduler
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Automatic monitoring at configured intervals
                                    </div>
                                </div>
                                <button
                                    onClick={handleToggle}
                                    disabled={saving}
                                    style={{
                                        width: '48px',
                                        height: '26px',
                                        borderRadius: '13px',
                                        border: 'none',
                                        cursor: saving ? 'wait' : 'pointer',
                                        backgroundColor: status.enabled ? 'var(--success-border)' : 'var(--switch-background)',
                                        position: 'relative',
                                        transition: 'background-color 200ms',
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '22px',
                                            height: '22px',
                                            borderRadius: '50%',
                                            backgroundColor: 'white',
                                            position: 'absolute',
                                            top: '2px',
                                            left: status.enabled ? '24px' : '2px',
                                            transition: 'left 200ms',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                        }}
                                    />
                                </button>
                            </div>

                            {/* Configuration Form */}
                            <div
                                style={{
                                    marginTop: 'var(--spacing-4)',
                                    padding: 'var(--spacing-4)',
                                    backgroundColor: 'white',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-light)',
                                }}
                            >
                                <div style={{
                                    fontWeight: 600,
                                    fontSize: 'var(--font-size-sm)',
                                    marginBottom: 'var(--spacing-3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-2)',
                                }}>
                                    <Clock size={16} />
                                    Schedule Configuration
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-3)' }}>
                                    {/* Start Hour */}
                                    <div>
                                        <label
                                            style={{
                                                display: 'block',
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--text-secondary)',
                                                marginBottom: 'var(--spacing-1)',
                                            }}
                                        >
                                            Start Hour
                                        </label>
                                        <select
                                            value={editStartHour}
                                            onChange={(e) => setEditStartHour(Number(e.target.value))}
                                            className="input"
                                            style={{ fontSize: 'var(--font-size-sm)' }}
                                        >
                                            {hourOptions.map((h) => (
                                                <option key={h} value={h}>
                                                    {h.toString().padStart(2, '0')}:00
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* End Hour */}
                                    <div>
                                        <label
                                            style={{
                                                display: 'block',
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--text-secondary)',
                                                marginBottom: 'var(--spacing-1)',
                                            }}
                                        >
                                            End Hour
                                        </label>
                                        <select
                                            value={editEndHour}
                                            onChange={(e) => setEditEndHour(Number(e.target.value))}
                                            className="input"
                                            style={{ fontSize: 'var(--font-size-sm)' }}
                                        >
                                            {hourOptions.map((h) => (
                                                <option key={h} value={h}>
                                                    {h.toString().padStart(2, '0')}:00
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Interval */}
                                    <div>
                                        <label
                                            style={{
                                                display: 'block',
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--text-secondary)',
                                                marginBottom: 'var(--spacing-1)',
                                            }}
                                        >
                                            Interval
                                        </label>
                                        <select
                                            value={editIntervalHours}
                                            onChange={(e) => setEditIntervalHours(Number(e.target.value))}
                                            className="input"
                                            style={{ fontSize: 'var(--font-size-sm)' }}
                                        >
                                            {intervalOptions.map((h) => (
                                                <option key={h} value={h}>
                                                    Every {h}h
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Save Button */}
                                {hasChanges && (
                                    <button
                                        onClick={handleSaveConfig}
                                        disabled={saving}
                                        className="btn btn-primary slide-in-down"
                                        style={{
                                            marginTop: 'var(--spacing-3)',
                                            width: '100%',
                                            fontSize: 'var(--font-size-sm)',
                                        }}
                                    >
                                        <CheckCircle size={16} />
                                        Save Changes
                                    </button>
                                )}
                            </div>

                            {/* Run Now Button */}
                            <button
                                onClick={handleTrigger}
                                disabled={saving || status.trigger_pending}
                                className="btn btn-secondary"
                                style={{
                                    marginTop: 'var(--spacing-4)',
                                    width: '100%',
                                    fontSize: 'var(--font-size-sm)',
                                }}
                            >
                                <Play size={16} />
                                {status.trigger_pending ? 'Run Pending...' : 'Run Now'}
                            </button>

                            {/* Trigger Pending Indicator */}
                            {status.trigger_pending && (
                                <div
                                    style={{
                                        marginTop: 'var(--spacing-2)',
                                        padding: 'var(--spacing-2)',
                                        backgroundColor: 'var(--gray-50)',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--text-secondary)',
                                        textAlign: 'center',
                                    }}
                                >
                                    Immediate run triggered. Waiting for scheduler to process...
                                </div>
                            )}

                            {/* Refresh Button */}
                            <button
                                onClick={fetchStatus}
                                disabled={loading}
                                className="btn btn-ghost"
                                style={{
                                    marginTop: 'var(--spacing-3)',
                                    width: '100%',
                                    fontSize: 'var(--font-size-sm)',
                                }}
                            >
                                <RefreshCw size={14} className={loading ? 'spin' : ''} />
                                Refresh Status
                            </button>
                        </>
                    ) : null}
                </div>
            )}
        </div>
    );
}
