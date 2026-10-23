const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../public/extension/doubao-bridge-extension-install/background.js'), 'utf8');

(async () => {
  for (const mode of ['rich', 'textarea', 'missing']) {
    let value = '';
    let scheduled = 0;
    class Textarea {}
    Object.defineProperty(Textarea.prototype, 'value', { set(v) { value = v; } });
    const input = { isContentEditable: mode === 'rich', focus() {}, dispatchEvent() {}, querySelectorAll() { return []; } };
    if (mode === 'textarea') Object.setPrototypeOf(input, Textarea.prototype);
    const context = vm.createContext({
      chrome: { runtime: { onMessageExternal: { addListener() {} }, onMessage: { addListener() {} } } },
      document: {
        querySelector(selector) { return mode === 'missing' ? null : (selector.includes('contenteditable') === (mode === 'rich') ? input : null); },
        querySelectorAll() { return []; },
        createRange() { return { selectNodeContents() {} }; },
        execCommand(command, _, text) { assert.equal(command, 'insertText'); value = text; return true; },
      },
      window: { HTMLTextAreaElement: Textarea, getSelection() { return { removeAllRanges() {}, addRange() {} }; } },
      Event: class {},
      setTimeout(fn) { assert.ok(++scheduled < 50, 'input lookup must be bounded'); queueMicrotask(fn); },
    });
    vm.runInContext(source, context);
    const result = await vm.runInContext('doubaoFillInMainWorld({ text: "兼容测试" })', context);
    assert.equal(result.ok, mode !== 'missing');
    if (mode !== 'missing') assert.equal(value, '兼容测试');
  }
  console.log('PASS: rich editor, legacy textarea, bounded missing-input failure');
})();
