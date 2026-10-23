const INPUT_SELECTOR = 'textarea[data-testid="chat_input_input"]';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function findDoubaoInput() {
  return (
    document.querySelector(INPUT_SELECTOR) ||
    document.querySelector('textarea[placeholder*="发消息"]') ||
    document.querySelector('textarea[placeholder*="消息"]') ||
      document.querySelector('.tiptap.ProseMirror[contenteditable="true"]')
  );
}

function setDoubaoText(input, text) {
  input.focus();
    if (input.isContentEditable) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      selection.removeAllRanges();
      selection.addRange(range);
      // Use the editor's native editing path so ProseMirror updates its state.
      document.execCommand("insertText", false, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(input, text);
  } else {
    input.value = text;
  }
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}

function clearDoubaoComposer(input) {
  setDoubaoText(input, "");
    if (input.isContentEditable) return;
  const scopes = [];
  let el = input;
  for (let i = 0; i < 14 && el; i++) {
    scopes.push(el);
    el = el.parentElement;
  }
  const removeSelectors = [
    '[aria-label*="删除"]',
    '[aria-label*="移除"]',
    '[aria-label*="关闭"]',
    '[data-testid*="remove"]',
    '[data-testid*="delete"]',
    'button[class*="close" i]',
    '[class*="attachment"] button',
  ];
  for (const scope of scopes) {
    for (const sel of removeSelectors) {
      scope.querySelectorAll(sel).forEach((btn) => {
        try {
          btn.click();
        } catch (_) {
          /* ignore */
        }
      });
    }
  }
}

async function pasteImageFromDataUrl(input, dataUrl) {
  if (!dataUrl?.startsWith("data:image")) return false;
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], "scene.png", { type: blob.type || "image/png" });
  const dt = new DataTransfer();
  dt.items.add(file);
  input.focus();
  input.dispatchEvent(
    new ClipboardEvent("paste", {
      bubbles: true,
      cancelable: true,
      clipboardData: dt,
    })
  );
  return true;
}

async function fillDoubao(payload) {
  const text = String(payload?.text || "").trim();
  const imageDataUrl = String(payload?.imageDataUrl || "");
  if (!text && !imageDataUrl) return { ok: false, error: "空内容" };

  let input = null;
  for (let i = 0; i < 40; i++) {
    input = findDoubaoInput();
    if (input) break;
    await sleep(250);
  }
  if (!input) {
    return {
      ok: false,
      error: "未找到输入框（需登录豆包并打开 /chat）",
    };
  }

  clearDoubaoComposer(input);
  await sleep(320);
  if (text) setDoubaoText(input, text);
  if (imageDataUrl) {
    await sleep(280);
    await pasteImageFromDataUrl(input, imageDataUrl);
  }
  return { ok: true, mode: "content_script" };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "GEEKNOW_DOUBAO_FILL") return;
  fillDoubao(msg.payload).then(sendResponse).catch((error) =>
    sendResponse({ ok: false, error: String(error.message || error) })
  );
  return true;
});
