// App.tsx - Fully connected with real API data
import { useState, useMemo } from "react";
import Header from "./components/Header";
import SearchFiltersCard from "./components/SearchFiltersCard";
import InstitutionCheckboxes, { defaultInstitutions } from "./components/InstitutionCheckboxes";
import EmailInbox from "./components/EmailInbox";
import DetailPanel from "./components/DetailPanel";
import Toast from "./components/Toast";
import { type Change } from "./components/ChangesTable";
import useChanges from "./hooks/useChanges";

type ToastMessage = {
  id: number;
  message: string;
  type: "success" | "error" | "info" | "warning";
};

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function App() {
  // ---------------------------------------------------------------------------
  // State - API Data (using custom hook)
  // ---------------------------------------------------------------------------
  const { changes, loading, error, refetch, isRetrying } = useChanges();

  // Global search filter (from SearchFiltersCard)
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedInstitutions, setSelectedInstitutions] = useState<string[]>([]);

  // Email inbox filters
  const [emailSearchQuery, setEmailSearchQuery] = useState("");
  const [importanceFilter, setImportanceFilter] = useState<"all" | "important" | "not_important">("all");

  // Detail panel state
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  console.log("API_BASE en runtime:", API_BASE);

  // ---------------------------------------------------------------------------
  // Toast management
  // ---------------------------------------------------------------------------
  const showToast = (
    message: string,
    type: ToastMessage["type"] = "info"
  ) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // ---------------------------------------------------------------------------
  // Filtered changes based on global filters
  // ---------------------------------------------------------------------------
  const filteredChanges = useMemo(() => {
    let result = changes;

    // Global search filter
    if (globalSearchQuery.trim()) {
      const q = globalSearchQuery.toLowerCase();
      result = result.filter((c) => {
        return (
          (c.title ?? "").toLowerCase().includes(q) ||
          (c.ai_reason ?? "").toLowerCase().includes(q) ||
          (c.url ?? "").toLowerCase().includes(q) ||
          (c.wachet_id ?? "").toLowerCase().includes(q) ||
          (c.source_name ?? "").toLowerCase().includes(q)
        );
      });
    }

    // Global country filter from CountrySelector
    if (selectedCountry && selectedCountry !== 'INTERNATIONAL' && selectedCountry !== 'LEGISLATIVE') {
      result = result.filter((c) => {
        // Extract country from various sources
        const getCountryCode = (): string | null => {
          // From DB field
          if (c.source_country) {
            const name = c.source_country.toLowerCase();
            if (name.includes('colombia')) return 'CO';
            if (name.includes('el salvador')) return 'SV';
            if (name.includes('guatemala')) return 'GT';
            if (name.includes('honduras')) return 'HN';
            if (name.includes('perú') || name.includes('peru')) return 'PE';
            if (name.includes('méxico') || name.includes('mexico')) return 'MX';
          }
          // From ai_reason
          if (c.ai_reason) {
            const text = c.ai_reason.toLowerCase();
            if (text.includes('colombia')) return 'CO';
            if (text.includes('el salvador')) return 'SV';
            if (text.includes('guatemala')) return 'GT';
            if (text.includes('honduras')) return 'HN';
            if (text.includes('perú') || text.includes('peru')) return 'PE';
            if (text.includes('méxico') || text.includes('mexico')) return 'MX';
          }
          // From URL TLD
          if (c.url) {
            try {
              const tld = new URL(c.url).hostname.split('.').pop();
              const map: Record<string, string> = { 'co': 'CO', 'sv': 'SV', 'gt': 'GT', 'hn': 'HN', 'pe': 'PE', 'mx': 'MX' };
              if (tld && map[tld]) return map[tld];
            } catch { /* ignore */ }
          }
          return null;
        };
        return getCountryCode() === selectedCountry;
      });
    }

    return result;
  }, [changes, globalSearchQuery, selectedCountry]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleClearFilters = () => {
    setGlobalSearchQuery("");
    setSelectedCountry(null);
    setSelectedInstitutions([]);
    setEmailSearchQuery("");
    setImportanceFilter("all");
  };

  const handleToggleInstitution = (id: string) => {
    setSelectedInstitutions((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectChange = (change: Change) => {
    setSelectedChange(change);
  };

  const handleValidate = async (change: Change) => {
    try {
      const res = await fetch(`${API_BASE}/wachet-changes/${change.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "VALIDATED" }),
      });

      if (!res.ok) {
        throw new Error("Error al marcar como revisado");
      }

      showToast(`"${change.title}" marcado como revisado`, "success");
      setSelectedChange(null);
      await refetch();
    } catch (err) {
      console.error(err);
      showToast(
        `No se pudo marcar "${change.title}" como revisado`,
        "error"
      );
    }
  };

  const handleMoveToPending = async (change: Change) => {
    try {
      const res = await fetch(`${API_BASE}/wachet-changes/${change.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "PENDING" }),
      });

      if (!res.ok) {
        throw new Error("Error al cambiar a pendientes");
      }

      showToast(`"${change.title}" cambiado a pendientes`, "info");
      setSelectedChange(null);
      await refetch();
    } catch (err) {
      console.error(err);
      showToast(`No se pudo cambiar "${change.title}" a pendientes`, "error");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ minHeight: "100vh" }}>
      {/* Header */}
      <Header />

      {/* Main Content */}
      <main
        className="container"
        style={{
          paddingTop: "var(--spacing-6)",
          paddingBottom: "var(--spacing-8)",
        }}
      >
        {/* Search & Filters Card */}
        <SearchFiltersCard
          searchQuery={globalSearchQuery}
          onSearchChange={setGlobalSearchQuery}
          selectedCountry={selectedCountry}
          onSelectCountry={setSelectedCountry}
          onClearFilters={handleClearFilters}
        />

        {/* Two Column Layout */}
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-6)",
            alignItems: "flex-start",
          }}
        >
          {/* Left Sidebar - Institution Checkboxes */}
          <InstitutionCheckboxes
            institutions={defaultInstitutions}
            selectedInstitutions={selectedInstitutions}
            onToggleInstitution={handleToggleInstitution}
            countryFilter={selectedCountry}
          />

          {/* Right Content - Email Inbox */}
          <EmailInbox
            changes={filteredChanges}
            loading={loading}
            error={error}
            searchQuery={emailSearchQuery}
            onSearchChange={setEmailSearchQuery}
            countryFilter={selectedCountry}
            importanceFilter={importanceFilter}
            onImportanceFilterChange={setImportanceFilter}
            selectedInstitutions={selectedInstitutions}
            onSelectChange={handleSelectChange}
            selectedChangeId={selectedChange?.id ?? null}
            onRetry={refetch}
            isRetrying={isRetrying}
            onClearFilters={handleClearFilters}
          />
        </div>
      </main>

      {/* Detail Panel */}
      {selectedChange && (
        <DetailPanel
          change={selectedChange}
          onClose={() => setSelectedChange(null)}
          onValidate={handleValidate}
          onMoveToPending={handleMoveToPending}
        />
      )}

      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

export default App;
