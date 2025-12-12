// CountrySelector.tsx - Grid of country/category buttons with emoji flags
import { Globe, Landmark } from 'lucide-react';

type Country = {
    code: string;
    name: string;
    flag: string | React.ReactNode;
};

type CountrySelectorProps = {
    countries: Country[];
    selectedCountry: string | null;
    onSelectCountry: (code: string | null) => void;
};

export default function CountrySelector({
    countries,
    selectedCountry,
    onSelectCountry,
}: CountrySelectorProps) {
    // All countries option
    const allOption: Country = {
        code: 'ALL',
        name: 'Todos',
        flag: '🌍',
    };

    // Special categories
    const specialCategories: Country[] = [
        {
            code: 'INTERNATIONAL',
            name: 'Tendencias Internacionales',
            flag: <Globe size={24} style={{ color: 'var(--blue-night)' }} />,
        },
        {
            code: 'LEGISLATIVE',
            name: 'Monitoreo Legislativo',
            flag: <Landmark size={24} style={{ color: 'var(--blue-night)' }} />,
        },
    ];

    const allOptions = [allOption, ...countries, ...specialCategories];

    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: 'var(--spacing-3)',
            }}
        >
            {allOptions.map((country) => {
                const isSelected = selectedCountry === country.code ||
                    (selectedCountry === null && country.code === 'ALL');

                return (
                    <button
                        key={country.code}
                        onClick={() => onSelectCountry(country.code === 'ALL' ? null : country.code)}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 'var(--spacing-2)',
                            padding: 'var(--spacing-4)',
                            backgroundColor: isSelected ? 'var(--red-50)' : 'white',
                            border: `2px solid ${isSelected ? 'var(--red-accent)' : 'var(--border-light)'}`,
                            borderRadius: 'var(--radius-lg)',
                            cursor: 'pointer',
                            transition: 'all 200ms ease',
                            minHeight: '90px',
                        }}
                        onMouseEnter={(e) => {
                            if (!isSelected) {
                                e.currentTarget.style.borderColor = 'var(--gray-400)';
                                e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isSelected) {
                                e.currentTarget.style.borderColor = 'var(--border-light)';
                                e.currentTarget.style.backgroundColor = 'white';
                            }
                        }}
                    >
                        <span style={{ fontSize: '1.5rem' }}>
                            {typeof country.flag === 'string' ? country.flag : country.flag}
                        </span>
                        <span
                            style={{
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 500,
                                color: 'var(--text-primary)',
                                textAlign: 'center',
                            }}
                        >
                            {country.name}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// Default countries data
export const defaultCountries: Country[] = [
    { code: 'SV', name: 'El Salvador', flag: '🇸🇻' },
    { code: 'GT', name: 'Guatemala', flag: '🇬🇹' },
    { code: 'HN', name: 'Honduras', flag: '🇭🇳' },
    { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
    { code: 'PE', name: 'Perú', flag: '🇵🇪' },
    { code: 'MX', name: 'México', flag: '🇲🇽' },
];
