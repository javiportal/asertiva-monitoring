// src/hooks/useChanges.ts
import { useCallback, useEffect, useState } from 'react';
import { type Change } from '../components/ChangesTable';

type SummaryItem = {
    status: string | null;
    importance: string | null;
    total: number;
};

export type ApiError = {
    message: string;
    status?: number;
    statusText?: string;
    isNetworkError: boolean;
    isServerError: boolean;
    isParseError: boolean;
    raw?: string;
};

type UseChangesResult = {
    changes: Change[];
    summary: SummaryItem[];
    loading: boolean;
    error: ApiError | null;
    refetch: () => Promise<void>;
    isRetrying: boolean;
};

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

function createApiError(
    message: string,
    options: Partial<Omit<ApiError, 'message'>> = {}
): ApiError {
    return {
        message,
        isNetworkError: false,
        isServerError: false,
        isParseError: false,
        ...options,
    };
}

async function fetchWithErrorHandling<T>(
    url: string
): Promise<{ data: T; raw: string }> {
    let response: Response;

    try {
        response = await fetch(url);
    } catch (networkError) {
        throw createApiError(
            `No se pudo conectar al servidor. Verifica que el backend esté corriendo en el puerto 8000.`,
            { isNetworkError: true }
        );
    }

    const rawText = await response.text();

    if (!response.ok) {
        const isServerError = response.status >= 500;
        let detail = '';

        try {
            const errorJson = JSON.parse(rawText);
            detail = errorJson.detail || errorJson.message || '';
        } catch {
            detail = rawText.slice(0, 200);
        }

        throw createApiError(
            isServerError
                ? `Error del servidor (${response.status}): ${detail || response.statusText}`
                : `Error en la petición (${response.status}): ${detail || response.statusText}`,
            {
                status: response.status,
                statusText: response.statusText,
                isServerError,
                raw: rawText,
            }
        );
    }

    try {
        const data = JSON.parse(rawText) as T;
        return { data, raw: rawText };
    } catch (parseError) {
        throw createApiError(
            `La respuesta del servidor no es JSON válido. Verifica que el backend FastAPI esté corriendo correctamente.`,
            { isParseError: true, raw: rawText.slice(0, 500) }
        );
    }
}

export function useChanges(): UseChangesResult {
    const [changes, setChanges] = useState<Change[]>([]);
    const [summary, setSummary] = useState<SummaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<ApiError | null>(null);
    const [isRetrying, setIsRetrying] = useState(false);

    const fetchData = useCallback(async (isRetry = false) => {
        try {
            if (isRetry) {
                setIsRetrying(true);
            } else {
                setLoading(true);
            }
            setError(null);

            // Fetch both endpoints in parallel
            const [changesResult, summaryResult] = await Promise.all([
                fetchWithErrorHandling<{ items: Change[]; total: number }>(
                    `${API_BASE}/wachet-changes`
                ),
                fetchWithErrorHandling<{ items: SummaryItem[] }>(
                    `${API_BASE}/wachet-changes/summary`
                ),
            ]);

            setChanges(changesResult.data.items ?? []);
            setSummary(summaryResult.data.items ?? []);
        } catch (err) {
            if (err && typeof err === 'object' && 'message' in err) {
                setError(err as ApiError);
            } else {
                setError(
                    createApiError(
                        err instanceof Error ? err.message : 'Error desconocido al cargar datos'
                    )
                );
            }
        } finally {
            setLoading(false);
            setIsRetrying(false);
        }
    }, []);

    const refetch = useCallback(async () => {
        await fetchData(true);
    }, [fetchData]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        changes,
        summary,
        loading,
        error,
        refetch,
        isRetrying,
    };
}

export default useChanges;
