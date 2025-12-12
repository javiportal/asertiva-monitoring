// InstitutionCheckboxes.tsx - Sidebar with grouped institution checkboxes
import { Building2 } from 'lucide-react';

export type Institution = {
    id: string;
    name: string;
    type: string;
    countryCode: string;
};

type InstitutionCheckboxesProps = {
    institutions: Institution[];
    selectedInstitutions: string[];
    onToggleInstitution: (id: string) => void;
    countryFilter: string | null;
};

export default function InstitutionCheckboxes({
    institutions,
    selectedInstitutions,
    onToggleInstitution,
    countryFilter,
}: InstitutionCheckboxesProps) {
    // Filter institutions by country
    const filteredInstitutions = countryFilter
        ? institutions.filter((i) => i.countryCode === countryFilter)
        : institutions;

    // Group institutions by type
    const groupedInstitutions = filteredInstitutions.reduce((acc, institution) => {
        if (!acc[institution.type]) {
            acc[institution.type] = [];
        }
        acc[institution.type].push(institution);
        return acc;
    }, {} as Record<string, Institution[]>);

    const selectedCount = selectedInstitutions.length;

    return (
        <aside
            style={{
                width: '280px',
                flexShrink: 0,
                backgroundColor: 'white',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-light)',
                padding: 'var(--spacing-5)',
                height: 'fit-content',
                maxHeight: 'calc(100vh - 300px)',
                overflowY: 'auto',
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-2)',
                    marginBottom: 'var(--spacing-3)',
                }}
            >
                <Building2 size={18} style={{ color: 'var(--blue-night)' }} />
                <h3
                    style={{
                        fontSize: 'var(--font-size-md)',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: 0,
                    }}
                >
                    Seleccionar Instituciones
                </h3>
            </div>

            {/* Selection Counter */}
            <p
                style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                    marginBottom: 'var(--spacing-4)',
                }}
            >
                {selectedCount === 0
                    ? 'Ninguna seleccionada'
                    : `${selectedCount} seleccionada${selectedCount > 1 ? 's' : ''}`}
            </p>

            {/* Grouped Institution Lists */}
            {Object.entries(groupedInstitutions).map(([type, insts]) => (
                <div key={type} style={{ marginBottom: 'var(--spacing-4)' }}>
                    {/* Type Header */}
                    <h4
                        style={{
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: 'var(--spacing-2)',
                            paddingBottom: 'var(--spacing-1)',
                            borderBottom: '1px solid var(--border-light)',
                        }}
                    >
                        {type}
                    </h4>

                    {/* Checkboxes */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
                        {insts.map((institution) => {
                            const isSelected = selectedInstitutions.includes(institution.id);

                            return (
                                <label
                                    key={institution.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: 'var(--spacing-2)',
                                        padding: 'var(--spacing-2)',
                                        borderRadius: 'var(--radius-sm)',
                                        cursor: 'pointer',
                                        transition: 'background 200ms',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'var(--gray-50)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => onToggleInstitution(institution.id)}
                                        style={{
                                            width: '16px',
                                            height: '16px',
                                            marginTop: '2px',
                                            cursor: 'pointer',
                                            accentColor: 'var(--blue-night)',
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--text-primary)',
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        {institution.name}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            ))}

            {filteredInstitutions.length === 0 && (
                <p
                    style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-secondary)',
                        textAlign: 'center',
                        padding: 'var(--spacing-4)',
                    }}
                >
                    No hay instituciones para mostrar
                </p>
            )}
        </aside>
    );
}

// Default institutions data
export const defaultInstitutions: Institution[] = [
    // Institución Judicial
    { id: 'csj-sv', name: 'Corte Suprema de Justicia', type: 'Institución Judicial', countryCode: 'SV' },
    { id: 'cc-gt', name: 'Corte de Constitucionalidad', type: 'Institución Judicial', countryCode: 'GT' },
    { id: 'csj-hn', name: 'Corte Suprema de Justicia', type: 'Institución Judicial', countryCode: 'HN' },
    { id: 'cco-sv', name: 'Corte Constitucional', type: 'Institución Judicial', countryCode: 'SV' },
    { id: 'tc-pe', name: 'Tribunal Constitucional', type: 'Institución Judicial', countryCode: 'PE' },
    { id: 'scj-mx', name: 'Suprema Corte de Justicia', type: 'Institución Judicial', countryCode: 'MX' },
    // Agencia Estatal
    { id: 'tse-sv', name: 'Tribunal Supremo Electoral', type: 'Agencia Estatal', countryCode: 'SV' },
    { id: 'tse-gt', name: 'Tribunal Supremo Electoral', type: 'Agencia Estatal', countryCode: 'GT' },
    // Órgano Legislativo
    { id: 'cd-sv', name: 'Cámara de Diputados', type: 'Órgano Legislativo', countryCode: 'SV' },
    { id: 'cong-gt', name: 'Congreso de la República', type: 'Órgano Legislativo', countryCode: 'GT' },
];
