export default function SkeletonLoader() {
    return (
        <div style={{ padding: 'var(--spacing-4)' }}>
            {[...Array(5)].map((_, index) => (
                <div
                    key={index}
                    style={{
                        display: 'flex',
                        gap: 'var(--spacing-4)',
                        padding: 'var(--spacing-4)',
                        borderBottom: '1px solid var(--border-light)',
                    }}
                >
                    {/* Date */}
                    <div style={{ width: '120px' }}>
                        <div className="skeleton" style={{ height: '16px', width: '100%' }} />
                    </div>

                    {/* Title */}
                    <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ height: '20px', width: '80%', marginBottom: 'var(--spacing-2)' }} />
                        <div className="skeleton" style={{ height: '14px', width: '40%' }} />
                    </div>

                    {/* Badge */}
                    <div style={{ width: '100px' }}>
                        <div className="skeleton" style={{ height: '24px', width: '100%' }} />
                    </div>

                    {/* Reason */}
                    <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ height: '14px', width: '100%', marginBottom: 'var(--spacing-1)' }} />
                        <div className="skeleton" style={{ height: '14px', width: '90%' }} />
                    </div>

                    {/* Link */}
                    <div style={{ width: '80px' }}>
                        <div className="skeleton" style={{ height: '16px', width: '100%' }} />
                    </div>
                </div>
            ))}
        </div>
    );
}
