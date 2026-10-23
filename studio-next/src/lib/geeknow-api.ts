export type ApiPayload = Record<string, unknown>;

export type ApiImage = { url?: string; b64_json?: string };

export function getTaskStatus(data: ApiPayload): string | undefined {
  const st = data.task_status ?? data.status;
  return typeof st === "string" ? st : undefined;
}

export function extractImages(data: ApiPayload): ApiImage[] {
  const raw = data.data ?? data.images;
  if (!Array.isArray(raw)) return [];
  return raw as ApiImage[];
}

export function extractFirstImage(data: ApiPayload): ApiImage | null {
  const list = extractImages(data);
  return list[0] ?? null;
}

export function isTaskSucceeded(status?: string) {
  return status === "succeed" || status === "success";
}

export function isTaskFailed(status?: string) {
  return status === "failed" || status === "error";
}

/** 与旧版 local-image-gen 轮询逻辑一致 */
export function formatApiError(
  data: ApiPayload | null | undefined,
  status: number,
  fallbackText?: string
): string {
  if (!data) return fallbackText || `HTTP ${status}`;
  const err = data.error;
  if (typeof err === "object" && err && "message" in err) {
    return String((err as { message?: string }).message || `HTTP ${status}`);
  }
  if (typeof err === "string" && err) return err;
  if (typeof data.message === "string" && data.message) return data.message;
  if (typeof data.detail === "string" && data.detail) return data.detail;
  if (fallbackText) return fallbackText.slice(0, 300);
  return `HTTP ${status}`;
}

export function needsTaskPolling(data: ApiPayload, asyncMode: boolean): boolean {
  const taskId = data.task_id;
  if (typeof taskId !== "string" || !taskId) return false;

  const status = getTaskStatus(data);
  if (asyncMode) return true;

  if (status && !["succeed", "success", "failed", "error"].includes(status)) {
    return true;
  }

  return !extractFirstImage(data);
}
