// Header.tsx - Simplified header matching Figma design with dark mode toggle
import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function Header() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check system preference on mount
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        const newIsDark = !isDark;
        setIsDark(newIsDark);
        if (newIsDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };

    return (
        <header
            style={{
                backgroundColor: 'var(--card)',
                padding: 'var(--spacing-6) 0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                borderBottom: '1px solid var(--border)',
                transition: 'background-color 0.2s ease, border-color 0.2s ease',
            }}
        >
            <div
                className="container"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
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
                                color: 'var(--primary)',
                                margin: 0,
                                lineHeight: 1.2,
                            }}
                        >
                            Asertiva
                        </h1>
                        <p
                            style={{
                                fontSize: 'var(--font-size-xs)',
                                color: 'var(--muted-foreground)',
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


            </div>
        </header>
    );
}
