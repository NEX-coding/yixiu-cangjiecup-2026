export const STORAGE_KEY = "geeknow_image_gen";
export const DEFAULT_BASE_URL = "https://api.geeknow.top/v1";

export type StudioSettings = {
  baseUrl: string;
  apiKey: string;
  useProxy: boolean;
};

export const DEFAULT_SETTINGS: StudioSettings = {
  baseUrl: DEFAULT_BASE_URL,
  apiKey: "",
  useProxy: true,
};

export function loadStudioSettings(): StudioSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") as Partial<
      StudioSettings & { asyncMode?: boolean }
    >;
    return {
      baseUrl: (raw.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, ""),
      apiKey: raw.apiKey || "",
      useProxy: raw.useProxy !== undefined ? Boolean(raw.useProxy) : true,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveStudioSettings(next: StudioSettings) {
  if (typeof window === "undefined") return;
  try {
    const prev = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...prev,
        baseUrl: next.baseUrl.replace(/\/$/, ""),
        apiKey: next.apiKey,
        useProxy: next.useProxy,
      })
    );
  } catch {
    /* ignore */
  }
}
