// src/api.ts
export type ChangeStatus = "NEW" | "REVIEW" | "PUBLISHED" | "DISCARDED" | "FILTERED";

export type ChangeImportance = "IMPORTANT" | "NOT_IMPORTANT" | null;

export interface Change {
    id: number;
    title: string | null;
    url: string | null;
    country: string | null;
    importance: ChangeImportance;
    status: ChangeStatus;
    aiScore: number | null;
    aiReason: string | null;
    createdAt: string;
}

export interface SummaryItem {
    status: string | null;
    importance: string | null;
    total: number;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export interface ChangeFilters {
    importance?: "IMPORTANT" | "NOT_IMPORTANT";
    status?: string[]; // ["NEW", "REVIEW"]
    country?: string;
    search?: string;
}

export async function fetchChanges(filters: ChangeFilters = {}): Promise<Change[]> {
    const params = new URLSearchParams();

    if (filters.importance) params.set("importance", filters.importance);
    if (filters.status && filters.status.length) params.set("status", filters.status.join(","));
    if (filters.country) params.set("country", filters.country);
    if (filters.search) params.set("search", filters.search);

    const res = await fetch(`${API_BASE}/wachet-changes?${params.toString()}`);
    if (!res.ok) throw new Error("Error al cargar cambios");

    const data = await res.json(); // { items, total }

    return (data.items ?? []).map((item: any) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        country: item.country,
        importance: item.importance,
        status: item.status,
        aiScore: item.ai_score,
        aiReason: item.ai_reason,
        createdAt: item.created_at,
    }));
}

export async function fetchSummary(): Promise<SummaryItem[]> {
    const res = await fetch(`${API_BASE}/wachet-changes/summary`);
    if (!res.ok) throw new Error("Error al cargar resumen");
    const data = await res.json();
    return data.items ?? [];
}

export async function updateChangeStatus(id: number, status: ChangeStatus): Promise<void> {
    const res = await fetch(`${API_BASE}/wachet-changes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error("Error al actualizar estado");
}
