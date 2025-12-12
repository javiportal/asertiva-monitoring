// Header.tsx - Simplified header matching Figma design
export default function Header() {
    return (
        <header
            style={{
                backgroundColor: 'white',
                padding: 'var(--spacing-6) 0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            }}
        >
            <div
                className="container"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-3)',
                }}
            >
                {/* Logo */}
                <img
                    src="/logo-asertiva.jpg"
                    alt="Asertiva Logo"
                    style={{ height: '48px', width: 'auto' }}
                    onError={(e) => {
                        e.currentTarget.style.display = 'none';
                    }}
                />

                {/* Brand Text */}
                <div>
                    <h1
                        style={{
                            fontSize: '1.75rem',
                            fontWeight: 700,
                            color: 'var(--blue-night)',
                            margin: 0,
                            lineHeight: 1.2,
                        }}
                    >
                        Asertiva
                    </h1>
                    <p
                        style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--red-accent)',
                            margin: 0,
                            letterSpacing: '0.15em',
                            textTransform: 'uppercase',
                            fontWeight: 500,
                        }}
                    >
                        Monitoreo • Asuntos Públicos
                    </p>
                </div>
            </div>
        </header>
    );
}
