import { Bell, User, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
    const [showUserMenu, setShowUserMenu] = useState(false);

    return (
        <header
            style={{
                position: 'sticky',
                top: 0,
                zIndex: 50,
                height: 'var(--header-height)',
                backgroundColor: 'var(--blue-night)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'var(--shadow-sm)',
            }}
        >
            <div
                className="container flex items-center justify-between"
                style={{ height: '100%' }}
            >
                {/* Logo & Brand */}
                <div className="flex items-center gap-3">
                    <img
                        src="/logo.png"
                        alt="Asertiva Logo"
                        style={{ height: '32px', width: 'auto' }}
                        onError={(e) => {
                            // Fallback if logo not found
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                    <div>
                        <h1 style={{
                            fontSize: 'var(--font-size-lg)',
                            fontWeight: 600,
                            color: 'white',
                            margin: 0,
                        }}>
                            Asertiva <span style={{ color: '#E5E7EB', fontWeight: 400 }}>Risk Monitor</span>
                        </h1>
                    </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <button
                        className="btn-ghost"
                        style={{
                            padding: 'var(--spacing-2)',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            position: 'relative',
                        }}
                        aria-label="Notificaciones"
                    >
                        <Bell size={20} />
                        <span style={{
                            position: 'absolute',
                            top: '6px',
                            right: '6px',
                            width: '8px',
                            height: '8px',
                            backgroundColor: 'var(--red-accent)',
                            borderRadius: '50%',
                        }} />
                    </button>

                    {/* User Menu */}
                    <div style={{ position: 'relative' }}>
                        <button
                            className="flex items-center gap-2"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            style={{
                                padding: 'var(--spacing-2)',
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                background: 'rgba(255, 255, 255, 0.1)',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'background 200ms',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        >
                            <div style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--red-accent)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <User size={18} />
                            </div>
                            <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
                                Usuario
                            </span>
                            <ChevronDown size={16} />
                        </button>

                        {/* Dropdown Menu */}
                        {showUserMenu && (
                            <div
                                className="card slide-in-down"
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 8px)',
                                    right: 0,
                                    width: '200px',
                                    padding: 'var(--spacing-2)',
                                }}
                            >
                                <div style={{
                                    padding: 'var(--spacing-3)',
                                    borderBottom: '1px solid var(--border-light)',
                                }}>
                                    <div style={{ fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                                        Usuario Demo
                                    </div>
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                                        Administrador
                                    </div>
                                </div>
                                <button
                                    className="btn-ghost"
                                    style={{
                                        width: '100%',
                                        justifyContent: 'flex-start',
                                        marginTop: 'var(--spacing-2)',
                                        fontSize: 'var(--font-size-sm)',
                                    }}
                                >
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
