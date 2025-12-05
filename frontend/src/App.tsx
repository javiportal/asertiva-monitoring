// App.tsx
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
  type: "success" | "error" | "info" | "warning";
};


const API_BASE = import.meta.env.VITE_API_BASE || "/api";


function App() {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [changes, setChanges] = useState<Change[]>([]);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [importanceFilter, setImportanceFilter] = useState<
    ("IMPORTANT" | "NOT_IMPORTANT")[]
  >([]);
  const [activeView, setActiveView] = useState<
    "new" | "pending" | "validated" | "history"
  >("pending");
  const [dateRange, setDateRange] = useState("30");

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
  // Fetch data from API
  // ---------------------------------------------------------------------------
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [changesRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/wachet-changes`),
        fetch(`${API_BASE}/wachet-changes/summary`),
      ]);

      if (!changesRes.ok || !summaryRes.ok) {
        throw new Error("Error al cargar datos de la API");
      }

      const [changesText, summaryText] = await Promise.all([
        changesRes.text(),
        summaryRes.text(),
      ]);

      console.log("RAW /wachet-changes:", changesText.slice(0, 300));
      console.log(
        "RAW /wachet-changes/summary:",
        summaryText.slice(0, 300)
      );

      let changesJson: any;
      let summaryJson: any;

      try {
        changesJson = JSON.parse(changesText);
        summaryJson = JSON.parse(summaryText);
      } catch (parseErr) {
        console.error("Error parseando JSON de la API:", parseErr);
        throw new Error(
          "La API respondió algo que no es JSON válido. Revisa que el backend en 8000 sea FastAPI."
        );
      }

      setChanges(changesJson.items ?? []);
      setSummary(summaryJson.items ?? []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error desconocido");
      showToast("Error al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Metrics
  // ---------------------------------------------------------------------------
  const totalImportant = summary
    .filter((s) => s.importance === "IMPORTANT")
    .reduce((acc, s) => acc + s.total, 0);

  const pendingCount = changes.filter(
    (c) => c.status === "PENDING" || c.status === "FILTERED"
  ).length;

  const validatedCount = changes.filter(
    (c) => c.status === "VALIDATED" || c.status === "PUBLISHED"
  ).length;

  const totalAnalyzed = changes.length;

  // ---------------------------------------------------------------------------
  // Filter changes based on active filters
  // ---------------------------------------------------------------------------
  const filteredChanges = useMemo(() => {
    let result = changes;

    // Tabs
    if (activeView === "new") {
      result = result.filter((c) => c.status === "NEW");
    } else if (activeView === "pending") {
      result = result.filter(
        (c) => c.status === "PENDING" || c.status === "FILTERED"
      );
    } else if (activeView === "validated") {
      result = result.filter(
        (c) => c.status === "VALIDATED" || c.status === "PUBLISHED"
      );
    }
    // history => muestra todos

    // Importancia
    if (importanceFilter.length > 0) {
      result = result.filter((c) =>
        importanceFilter.includes(c.importance as any)
      );
    }

    // Búsqueda
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

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------
  const handleClearFilters = () => {
    setSearchQuery("");
    setImportanceFilter([]);
    setActiveView("pending");
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
      await fetchData();
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
      await fetchData();
    } catch (err) {
      console.error(err);
      showToast(`No se pudo cambiar "${change.title}" a pendientes`, "error");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-primary)" }}>
      {/* Header */}
      <Header />

      {/* Sub Header */}
      <SubHeader
        activeView={activeView}
        onViewChange={setActiveView}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      // si quieres, puedes usar validatedCount dentro del SubHeader
      />

      {/* Metrics Cards */}
      <MetricsCards
        totalChanges={totalAnalyzed}
        importantChanges={totalImportant}
        pendingChanges={pendingCount}
        affectedClients={0}
      />

      {/* Main Content Area */}
      <div
        className="container"
        style={{
          marginTop: "var(--spacing-6)",
          marginBottom: "var(--spacing-8)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--spacing-6)",
            alignItems: "flex-start",
          }}
        >
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
              <div
                className="card"
                style={{
                  padding: "var(--spacing-6)",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    color: "var(--red-accent)",
                    fontWeight: 500,
                  }}
                >
                  Error al cargar datos: {error}
                </p>
              </div>
            ) : filteredChanges.length === 0 ? (
              <div className="card">
                <EmptyState
                  message={
                    searchQuery ||
                      importanceFilter.length > 0 ||
                      activeView !== "history"
                      ? "No hay cambios que coincidan con los filtros aplicados"
                      : "No hay cambios en este rango de fechas"
                  }
                  onClearFilters={
                    searchQuery ||
                      importanceFilter.length > 0 ||
                      activeView !== "history"
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
