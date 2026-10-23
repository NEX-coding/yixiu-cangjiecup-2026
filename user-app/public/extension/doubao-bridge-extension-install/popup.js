const idEl = document.getElementById("ext-id");
const extId = chrome.runtime.id;
if (idEl) idEl.textContent = extId;

document.getElementById("copy-id-btn")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(extId);
    const el = document.getElementById("test-result");
    if (el) el.textContent = "已复制扩展 ID";
  } catch {
    const el = document.getElementById("test-result");
    if (el) el.textContent = "复制失败，请手动全选上方 ID";
  }
});

document.getElementById("test-fill-btn")?.addEventListener("click", () => {
  const el = document.getElementById("test-result");
  if (el) el.textContent = "测试中…";
  chrome.runtime.sendMessage(
    { type: "YIXIU_DOUBAO_TEST_FILL", text: "【测试】衣秀扩展填入成功" },
    (res) => {
      if (chrome.runtime.lastError) {
        if (el) el.textContent = chrome.runtime.lastError.message;
        return;
      }
      if (el) {
        el.textContent = res?.ok
          ? "成功：请看豆包输入框"
          : `失败：${res?.error || "未知"}`;
      }
    }
  );
});
