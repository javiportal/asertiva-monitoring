import { useEffect, useState, useMemo } from "react";
import Header from "./components/Header";
import SubHeader from "./components/SubHeader";
import MetricsCards from "./components/MetricsCards";
import FiltersSidebar from "./components/FiltersSidebar";
import ChangesTable, { type Change } from "./components/ChangesTable";
import DetailPanel from "./components/DetailPanel";
import EmptyState from "./components/EmptyState";
import SkeletonLoader from "./components/SkeletonLoader";
import Toast from "./components/Toast";

type SummaryItem = {
  status: string | null;
  importance: string | null;
  total: number;
};

type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
};

const API_BASE = "http://localhost:8000";

function App() {
  // Data State
  const [changes, setChanges] = useState<Change[]>([]);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [importanceFilter, setImportanceFilter] = useState<('IMPORTANT' | 'NOT_IMPORTANT')[]>([]);
  const [activeView, setActiveView] = useState<'all' | 'important' | 'pending'>('all');
  const [dateRange, setDateRange] = useState("30");

  // UI State
  const [selectedChange, setSelectedChange] = useState<Change | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [filteredRes, summaryRes] = await Promise.all([
          fetch(`${API_BASE}/wachet-changes/filtered`),
          fetch(`${API_BASE}/wachet-changes/summary`),
        ]);

        if (!filteredRes.ok || !summaryRes.ok) {
          throw new Error("Error al cargar datos de la API");
        }

        const filteredJson = await filteredRes.json();
        const summaryJson = await summaryRes.json();

        setChanges(filteredJson.items ?? []);
        setSummary(summaryJson.items ?? []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error desconocido");
        showToast("Error al cargar datos", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate metrics
  const totalImportant = summary
    .filter((s) => s.importance === "IMPORTANT")
    .reduce((acc, s) => acc + s.total, 0);



  // Filter changes based on all active filters
  const filteredChanges = useMemo(() => {
    let result = changes;

    // Apply view filter
    if (activeView === 'important') {
      result = result.filter(c => c.importance === 'IMPORTANT');
    } else if (activeView === 'pending') {
      result = result.filter(c => c.status === 'PENDING' || c.status === 'NEW');
    }

    // Apply importance filter
    if (importanceFilter.length > 0) {
      result = result.filter(c => importanceFilter.includes(c.importance as any));
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) => {
        return (
          (c.title ?? "").toLowerCase().includes(q) ||
          (c.ai_reason ?? "").toLowerCase().includes(q) ||
          (c.url ?? "").toLowerCase().includes(q) ||
          (c.wachet_id ?? "").toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [changes, searchQuery, importanceFilter, activeView]);

  // Toast management
  const showToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Handlers
  const handleClearFilters = () => {
    setSearchQuery("");
    setImportanceFilter([]);
    setActiveView('all');
  };

  const handlePublish = (change: Change) => {
    showToast(`"${change.title}" marcado como publicado`, 'success');
    setSelectedChange(null);
    // TODO: Call API to update status
  };

  const handleDiscard = (change: Change) => {
    showToast(`"${change.title}" descartado`, 'info');
    setSelectedChange(null);
    // TODO: Call API to update status
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <Header />

      {/* Sub Header */}
      <SubHeader
        activeView={activeView}
        onViewChange={setActiveView}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Metrics Cards */}
      <MetricsCards
        totalChanges={changes.length}
        importantChanges={totalImportant}
        pendingChanges={changes.filter(c => c.status === 'PENDING' || c.status === 'NEW').length}
        affectedClients={0}
      />

      {/* Main Content Area */}
      <div className="container" style={{ marginTop: 'var(--spacing-6)', marginBottom: 'var(--spacing-8)' }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-6)', alignItems: 'flex-start' }}>
          {/* Filters Sidebar */}
          <FiltersSidebar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            importanceFilter={importanceFilter}
            onImportanceFilterChange={setImportanceFilter}
            onClearFilters={handleClearFilters}
          />

          {/* Main Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <SkeletonLoader />
            ) : error ? (
              <div className="card" style={{ padding: 'var(--spacing-6)', textAlign: 'center' }}>
                <p style={{ color: 'var(--red-accent)', fontWeight: 500 }}>
                  Error al cargar datos: {error}
                </p>
              </div>
            ) : filteredChanges.length === 0 ? (
              <div className="card">
                <EmptyState
                  message={
                    searchQuery || importanceFilter.length > 0 || activeView !== 'all'
                      ? "No hay cambios que coincidan con los filtros aplicados"
                      : "No hay cambios en este rango de fechas"
                  }
                  onClearFilters={
                    searchQuery || importanceFilter.length > 0 || activeView !== 'all'
                      ? handleClearFilters
                      : undefined
                  }
                />
              </div>
            ) : (
              <ChangesTable
                changes={filteredChanges}
                selectedChangeId={selectedChange?.id ?? null}
                onSelectChange={setSelectedChange}
              />
            )}
          </div>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedChange && (
        <DetailPanel
          change={selectedChange}
          onClose={() => setSelectedChange(null)}
          onPublish={handlePublish}
          onDiscard={handleDiscard}
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
