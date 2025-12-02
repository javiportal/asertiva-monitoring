import { useEffect, useState, useMemo } from "react";

type Change = {
  id: number;
  wachet_id: string;
  url: string | null;
  title: string | null;
  importance: string | null;
  ai_score: number | null;
  ai_reason: string | null;
  status: string;
  created_at: string;
};

type SummaryItem = {
  status: string | null;
  importance: string | null;
  total: number;
};

const API_BASE = "http://localhost:8000";

function App() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredChanges = useMemo(() => {
    if (!search.trim()) return changes;
    const q = search.toLowerCase();
    return changes.filter((c) => {
      return (
        (c.title ?? "").toLowerCase().includes(q) ||
        (c.ai_reason ?? "").toLowerCase().includes(q) ||
        (c.url ?? "").toLowerCase().includes(q) ||
        (c.wachet_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [changes, search]);

  const totalImportant = summary
    .filter((s) => s.importance === "IMPORTANT")
    .reduce((acc, s) => acc + s.total, 0);

  const totalNotImportant = summary
    .filter((s) => s.importance === "NOT_IMPORTANT")
    .reduce((acc, s) => acc + s.total, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Asertiva · <span className="text-emerald-400">Cambios relevantes</span>
          </h1>
          <span className="text-xs text-slate-400">
            MVP · Wachete → IA → Dashboard
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Resumen */}
        <section>
          <h2 className="text-sm font-semibold text-slate-400 mb-2">
            Resumen
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs text-slate-400">Total cambios filtrados</div>
              <div className="text-2xl font-semibold mt-1">{changes.length}</div>
            </div>
            <div className="rounded-xl border border-emerald-600/40 bg-emerald-950/30 p-4">
              <div className="text-xs text-emerald-300">
                Marcados como importantes
              </div>
              <div className="text-2xl font-semibold mt-1 text-emerald-300">
                {totalImportant}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="text-xs text-slate-400">
                Marcados como no importantes
              </div>
              <div className="text-2xl font-semibold mt-1">
                {totalNotImportant}
              </div>
            </div>
          </div>
        </section>

        {/* Filtros */}
        <section className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-400 mb-1">
              Cambios filtrados por IA
            </h2>
            <p className="text-xs text-slate-500">
              Esta lista muestra los cambios que ya pasaron por el filtro de IA.
            </p>
          </div>
          <input
            type="text"
            placeholder="Buscar por título, URL o explicación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-80 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </section>

        {/* Tabla */}
        <section className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
          {loading ? (
            <div className="p-6 text-sm text-slate-400">Cargando cambios...</div>
          ) : error ? (
            <div className="p-6 text-sm text-red-400">
              Error al cargar datos: {error}
            </div>
          ) : filteredChanges.length === 0 ? (
            <div className="p-6 text-sm text-slate-400">
              No hay cambios que coincidan con el filtro.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900/80 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                      Fecha
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                      Título
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                      Importancia
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                      Explicación IA
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                      Fuente
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChanges.map((c) => {
                    const date = new Date(c.created_at);
                    const dateStr = isNaN(date.getTime())
                      ? "-"
                      : date.toLocaleString();
                    const isImportant = c.importance === "IMPORTANT";

                    return (
                      <tr
                        key={c.id}
                        className="border-b border-slate-800/60 hover:bg-slate-800/50"
                      >
                        <td className="px-4 py-2 align-top text-xs text-slate-300">
                          {dateStr}
                        </td>
                        <td className="px-4 py-2 align-top">
                          <div className="text-sm font-medium text-slate-100">
                            {c.title || "(sin título)"}
                          </div>
                          <div className="text-xs text-slate-500">
                            Wachet: {c.wachet_id}
                          </div>
                        </td>
                        <td className="px-4 py-2 align-top">
                          <span
                            className={
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium " +
                              (isImportant
                                ? "bg-emerald-900/60 text-emerald-300 border border-emerald-500/40"
                                : "bg-slate-800 text-slate-300 border border-slate-600/60")
                            }
                          >
                            {c.importance || "N/A"}
                            {c.ai_score !== null && (
                              <span className="ml-1 text-[10px] opacity-80">
                                ({Math.round((c.ai_score || 0) * 100)}%)
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-2 align-top text-xs text-slate-200 max-w-md">
                          {c.ai_reason || "-"}
                        </td>
                        <td className="px-4 py-2 align-top text-xs">
                          {c.url ? (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-300 hover:text-emerald-200 underline underline-offset-2"
                            >
                              Ver fuente
                            </a>
                          ) : (
                            <span className="text-slate-500">Sin URL</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
