const CHAT_URL = "https://www.doubao.com/chat";
const INPUT_SELECTOR = 'textarea[data-testid="chat_input_input"]';

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** 在页面 MAIN 环境执行（Chrome 会序列化此函数）— 参考 ScriptCat 豆包复制助手 */
function doubaoFillInMainWorld(payload) {
  const text = String(payload?.text || "").trim();
  const imageDataUrl = String(payload?.imageDataUrl || "");
  const selector = 'textarea[data-testid="chat_input_input"]';

  function findInput() {
    return (
      document.querySelector(selector) ||
      document.querySelector('textarea[placeholder*="发消息"]') ||
      document.querySelector('textarea[placeholder*="消息"]') ||
      document.querySelector('.tiptap.ProseMirror[contenteditable="true"]')
    );
  }

  function setNativeText(input, value) {
    input.focus();
    if (input.isContentEditable) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(input);
      selection.removeAllRanges();
      selection.addRange(range);
      // Use the editor's native editing path so ProseMirror updates its state.
      document.execCommand("insertText", false, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      "value"
    )?.set;
    if (setter) setter.call(input, value);
    else input.value = value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function pasteImageFile(input, file) {
    input.focus();
    const dt = new DataTransfer();
    dt.items.add(file);
    input.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: dt,
      })
    );
  }

  /** 填入前清空输入框与已挂附件，避免多次发送叠图 */
  function clearDoubaoComposer(input) {
    setNativeText(input, "");
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
      '[data-testid*="clear"]',
      'button[class*="close" i]',
      '[class*="attachment"] button',
      '[class*="upload"] button[class*="close" i]',
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
    document
      .querySelectorAll(
        '[data-testid*="attachment"], [class*="attachment" i], [class*="Attach"]'
      )
      .forEach((node) => {
        const rm = node.querySelector(
          'button, [role="button"], [aria-label*="删除"], [aria-label*="移除"]'
        );
        if (rm) {
          try {
            rm.click();
          } catch (_) {
            /* ignore */
          }
        }
      });
  }

  return new Promise((resolve) => {
    let tries = 0;
    const tick = () => {
      const input = findInput();
      if (input && text) {
        clearDoubaoComposer(input);
        setTimeout(() => {
          setNativeText(input, text);
          if (imageDataUrl && imageDataUrl.startsWith("data:image")) {
            fetch(imageDataUrl)
              .then((r) => r.blob())
              .then((blob) => {
                const file = new File([blob], "scene.png", {
                  type: blob.type || "image/png",
                });
                setTimeout(() => {
                  pasteImageFile(input, file);
                  resolve({ ok: true, mode: "main+image" });
                }, 280);
              })
              .catch(() => resolve({ ok: true, mode: "main-text-only" }));
          } else {
            resolve({ ok: true, mode: "main" });
          }
        }, 320);
        return;
      }
      if (++tries > 40) {
        resolve({ ok: false, error: "未找到豆包输入框，请确认已登录并打开对话页" });
        return;
      }
      setTimeout(tick, 250);
    };
    tick();
  });
}

async function injectFillMain(tabId, payload) {
  const results = await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    world: "MAIN",
    func: doubaoFillInMainWorld,
    args: [payload],
  });
  return results?.[0]?.result;
}

async function fillOnTab(tabId, payload) {
  let last = await injectFillMain(tabId, payload);
  if (last?.ok) return last;

  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "GEEKNOW_DOUBAO_FILL",
      payload,
    });
    if (response?.ok) return response;
    return response || last;
  } catch (err) {
    return last || { ok: false, error: String(err.message || err) };
  }
}

async function openDoubaoAndFill(payload) {
  const tabs = await chrome.tabs.query({ url: "https://www.doubao.com/*" });
  const chatTab = tabs.find((t) => t.url && t.url.includes("/chat"));

  if (chatTab?.id != null) {
    await chrome.tabs.update(chatTab.id, { active: true });
    await delay(400);
    return fillOnTab(chatTab.id, payload);
  }

  const tab = await chrome.tabs.create({ url: CHAT_URL, active: true });
  if (!tab.id) return { ok: false, error: "无法打开豆包" };

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("豆包加载超时"));
    }, 30000);
    function onUpdated(id, info) {
      if (id === tab.id && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
  });

  await delay(1200);
  return fillOnTab(tab.id, payload);
}

chrome.runtime.onMessageExternal.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "GEEKNOW_DOUBAO_FILL" || !msg.payload) {
    sendResponse({ ok: false, error: "无效消息" });
    return;
  }
  openDoubaoAndFill(msg.payload)
    .then((r) => sendResponse(r || { ok: false, error: "无响应" }))
    .catch((e) => sendResponse({ ok: false, error: String(e.message || e) }));
  return true;
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "YIXIU_DOUBAO_TEST_FILL") return;
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    if (!tab?.id || !tab.url?.includes("doubao.com")) {
      sendResponse({ ok: false, error: "请先打开豆包 chat 页" });
      return;
    }
    try {
      const r = await injectFillMain(tab.id, {
        text: msg.text || "【测试】扩展填入成功",
        imageDataUrl: "",
      });
      sendResponse(r);
    } catch (error) {
      sendResponse({ ok: false, error: String(error.message || error) });
    }
  });
  return true;
});
