import { TrendingUp, AlertTriangle, Clock, Users } from 'lucide-react';

type MetricsCardsProps = {
    totalChanges: number;
    importantChanges: number;
    pendingChanges: number;
    affectedClients?: number;
};

export default function MetricsCards({
    totalChanges,
    importantChanges,
    pendingChanges,
    affectedClients = 0
}: MetricsCardsProps) {
    const importantPercentage = totalChanges > 0
        ? Math.round((importantChanges / totalChanges) * 100)
        : 0;

    const metrics = [
        {
            icon: TrendingUp,
            label: 'Cambios analizados',
            value: totalChanges,
            color: 'var(--blue-night)',
        },
        {
            icon: AlertTriangle,
            label: 'Importantes',
            value: importantChanges,
            subtitle: `${importantPercentage}% del total`,
            color: 'var(--red-accent)',
        },
        {
            icon: Clock,
            label: 'Pendientes por validar',
            value: pendingChanges,
            color: 'var(--text-secondary)',
        },
        {
            icon: Users,
            label: 'Clientes afectados',
            value: affectedClients,
            color: 'var(--text-secondary)',
            future: true,
        },
    ];

    return (
        <div className="container" style={{ marginTop: 'var(--spacing-6)' }}>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'var(--spacing-4)',
            }}>
                {metrics.map((metric, index) => {
                    const Icon = metric.icon;

                    return (
                        <div
                            key={index}
                            className="card"
                            style={{
                                padding: 'var(--spacing-5)',
                                opacity: metric.future ? 0.5 : 1,
                            }}
                        >
                            <div className="flex items-center gap-3">
                                {/* Icon */}
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '50%',
                                    backgroundColor: `${metric.color}15`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <Icon size={24} color={metric.color} />
                                </div>

                                {/* Content */}
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: 'var(--font-size-xs)',
                                        color: 'var(--text-secondary)',
                                        marginBottom: 'var(--spacing-1)',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em',
                                        fontWeight: 500,
                                    }}>
                                        {metric.label}
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--font-size-3xl)',
                                        fontWeight: 700,
                                        color: metric.color,
                                        lineHeight: 1,
                                    }}>
                                        {metric.value.toLocaleString()}
                                    </div>
                                    {metric.subtitle && (
                                        <div style={{
                                            fontSize: 'var(--font-size-xs)',
                                            color: 'var(--text-secondary)',
                                            marginTop: 'var(--spacing-1)',
                                        }}>
                                            {metric.subtitle}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
