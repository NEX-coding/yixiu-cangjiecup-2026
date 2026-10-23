const DOUBAO_CHAT_URL = "https://www.doubao.com/chat";
export const CANONICAL_DOUBAO_EXTENSION_ID = "ojcfmgnmlnhjnkomecakgifjegclamfh";

type DoubaoPayload = {
  text: string;
  imageDataUrl: string;
};

type ChromeRuntime = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    callback: (response?: { ok?: boolean; error?: string }) => void
  ) => void;
  lastError?: { message?: string };
};

function getChromeRuntime(): ChromeRuntime | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { chrome?: { runtime?: ChromeRuntime } }).chrome
    ?.runtime;
}

export function sendToDoubaoExtension(
  extensionId: string,
  payload: DoubaoPayload
): Promise<{ ok?: boolean; error?: string }> {
  return new Promise((resolve, reject) => {
    const runtime = getChromeRuntime();
    if (!runtime?.sendMessage) {
      reject(
        new Error(
          "请用 Chrome 打开，并安装「衣秀 · 豆包填入」扩展（doubao-bridge-extension）。"
        )
      );
      return;
    }
    runtime.sendMessage(
      extensionId,
      { type: "GEEKNOW_DOUBAO_FILL", payload },
      (res) => {
        const err = runtime.lastError;
        if (err) {
          const msg = String(err.message || "扩展通信失败");
          const hint = /invalid extension id/i.test(msg)
            ? "扩展 ID 无效：请在 chrome://extensions 重新加载扩展并核对 ID。"
            : `${msg}。请确认扩展已启用。`;
          reject(new Error(hint));
          return;
        }
        if (res?.ok === false) {
          reject(new Error(res.error || "扩展填入失败"));
          return;
        }
        resolve(res || { ok: true });
      }
    );
  });
}

export function openDoubaoChatTab() {
  window.open(DOUBAO_CHAT_URL, "_blank", "noopener,noreferrer");
}

export async function sendJobToDoubao(jobId: string): Promise<{
  promptTitle: string;
  videoCredits: number;
}> {
  const res = await fetch(`/api/jobs/${jobId}/doubao`, { method: "POST" });
  const data = (await res.json()) as {
    error?: string;
    text?: string;
    imageDataUrl?: string;
    promptTitle?: string;
    extensionId?: string;
    videoCredits?: number;
  };
  if (!res.ok || !data.text || !data.imageDataUrl) {
    throw new Error(data.error || "准备豆包数据失败");
  }
  const extId = data.extensionId || CANONICAL_DOUBAO_EXTENSION_ID;
  await sendToDoubaoExtension(extId, {
    text: data.text,
    imageDataUrl: data.imageDataUrl,
  });
  return {
    promptTitle: data.promptTitle || "未命名",
    videoCredits: data.videoCredits ?? 0,
  };
}
