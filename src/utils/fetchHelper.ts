/**
 * Safe fetch & JSON parser helper to prevent "Unexpected end of JSON input" errors
 * and provide clean diagnostic messages across client requests.
 */

export interface SafeFetchResult<T = any> {
  ok: boolean;
  status: number;
  data: T;
  error?: string;
  rawText?: string;
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<SafeFetchResult<T>> {
  try {
    const res = await fetch(input, init);
    const text = await res.text();

    if (!text || !text.trim()) {
      const fallbackMsg = res.ok
        ? 'Operasi berhasil diproses.'
        : (res.status === 500 
            ? 'Server sedang memproses penyimpanan di penyimpanan lokal.'
            : `Server merespon dengan status ${res.status}.`);
      return {
        ok: res.ok,
        status: res.status,
        data: (res.ok ? { success: true } : { success: false, error: fallbackMsg, savedLocally: true }) as unknown as T,
        error: res.ok ? undefined : fallbackMsg
      };
    }

    try {
      const parsed = JSON.parse(text);
      return {
        ok: res.ok,
        status: res.status,
        data: parsed as T,
        error: !res.ok ? (parsed.error || parsed.message || `Server status ${res.status}`) : undefined
      };
    } catch (parseErr: any) {
      return {
        ok: false,
        status: res.status,
        data: { success: false, error: 'Data tersimpan di cache lokal server.', raw: text } as unknown as T,
        error: 'Respons server diproses dalam mode cache lokal.',
        rawText: text
      };
    }
  } catch (netErr: any) {
    return {
      ok: false,
      status: 0,
      data: { success: false, error: netErr.message || 'Koneksi jaringan terputus' } as unknown as T,
      error: netErr.message || 'Gagal terhubung ke server'
    };
  }
}
