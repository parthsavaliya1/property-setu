const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { createRoot } = require('react-dom/client');
const { JSDOM } = require('../../propertysetu-web/node_modules/jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.IS_REACT_ACT_ENVIRONMENT = true;
let fetchImpl;
const cache = new Map();
function Box({ children }) { return React.createElement('div', null, children); }
const native = {
  ActivityIndicator: () => React.createElement('span', { role: 'progressbar' }),
  View: Box, ScrollView: Box, Text: ({ children }) => React.createElement('span', null, children),
  Pressable: ({ children, onPress, disabled, accessibilityLabel }) => React.createElement('button', { onClick: onPress, disabled, 'aria-label': accessibilityLabel }, children),
  Modal: ({ visible, children }) => visible ? React.createElement('div', { 'data-modal': true }, children) : null,
  TextInput: () => React.createElement('textarea'),
};
function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  function localRequire(name) {
    if (name === 'react-native') return native;
    if (name === '@expo/vector-icons') return { Ionicons: () => null };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 24, right: 0 }) };
    if (name === 'expo-constants') return { default: {} };
    if (name === 'expo-file-system') return { File: class {} };
    if (name.endsWith('/theme')) return { colors: {} };
    if (name.endsWith('/AuthContext')) return { useAuth: () => ({ token: 'test' }) };
    if (name.endsWith('/i18n/active')) return { getCopy: () => ({}) };
    if (name.endsWith('/remoteConfig')) return { getRemoteSettings: () => ({}), subscribeRemoteSettings: () => () => {} };
    if (name.startsWith('.')) return load(path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(filename), name + '.ts')));
    return require(name);
  }
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', { __DEV__: false, process, Headers, fetch: (...args) => fetchImpl(...args), console })(localRequire, module, module.exports);
  return module.exports;
}
const { api } = load('src/lib/api.ts');
const changes = load('src/lib/blockChanges.ts');
async function mount(Component) {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  await React.act(async () => root.render(React.createElement(Component)));
  return { host, async close() { await React.act(async () => root.unmount()); host.remove(); } };
}
function button(host, text) { return [...host.querySelectorAll('button')].find(node => node.textContent === text); }

test('chat three-dot menu opens and Block stays in one modal through confirmation', async () => {
  const { SafetyActions } = load('src/components/SafetyActions.tsx');
  let calls = 0;
  fetchImpl = async () => { calls++; return new Response(null, { status: 204 }); };
  const view = await mount(() => React.createElement(SafetyActions, { userId: 'owner', conversationId: 'chat', token: 'test' }));
  try {
    assert.equal(view.host.querySelectorAll('[data-modal]').length, 0);
    await React.act(async () => view.host.querySelector('[aria-label="More options"]').click());
    assert.ok(button(view.host, 'Report user'));
    assert.ok(button(view.host, 'Block user'));
    await React.act(async () => button(view.host, 'Block user').click());
    assert.equal(view.host.querySelectorAll('[data-modal]').length, 1);
    assert.equal(calls, 0);
    await React.act(async () => [...view.host.querySelectorAll('button')].filter(node => node.textContent === 'Block user').at(-1).click());
    assert.equal(calls, 1);
    assert.match(view.host.textContent, /User blocked/);
  } finally { await view.close(); }
});

test('block changes publish only after a successful server response', async () => {
  const observed = [];
  const stop = changes.subscribeBlockChanges(change => observed.push({ ...change }));
  try {
    fetchImpl = async () => new Response(JSON.stringify({ error: 'Denied' }), { status: 403 });
    await assert.rejects(api.blockUser('owner', 'test'));
    assert.equal(observed.length, 0);
    fetchImpl = async () => new Response(null, { status: 204 });
    await api.blockUser('owner', 'test');
    await api.unblockUser('owner', 'test');
    assert.deepEqual(observed, [{ userId: 'owner', blocked: true }, { userId: 'owner', blocked: false }]);
  } finally { stop(); }
});

test('blocking removes cached Home rows and rejects a stale in-flight page', async () => {
  const { usePagedProperties } = load('src/lib/paging.ts');
  const stale = Array.from({ length: 20 }, (_, id) => ({ id: String(id), owner_id: 'blocked-owner' }));
  let resolveStale;
  let calls = 0;
  let page;
  const loader = async () => {
    calls++;
    if (calls === 1) return stale;
    if (calls === 2) return new Promise(resolve => { resolveStale = resolve; });
    return [{ id: 'safe', owner_id: 'other-owner' }];
  };
  const view = await mount(() => { page = usePagedProperties(loader, 'home'); return React.createElement('span', null, page.items.map(row => row.id).join(',')); });
  try {
    assert.equal(page.items.length, 20);
    let pending;
    await React.act(async () => { pending = page.loadMore(); });
    await React.act(async () => { changes.publishBlockChange({ userId: 'blocked-owner', blocked: true }); });
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0].id, 'safe');
    await React.act(async () => { resolveStale(stale); await pending; });
    assert.equal(page.items.length, 1);
    assert.equal(page.items[0].owner_id, 'other-owner');
  } finally { await view.close(); }
});

test('Saved cache rejects an initial response from before a block and reloads on unblock', async () => {
  const { FavoritesProvider, useFavorites } = load('src/context/FavoritesContext.tsx');
  const oldRows = [{ id: 'blocked', owner_id: 'blocked-owner' }, { id: 'safe', owner_id: 'other-owner' }];
  let resolveInitial;
  let calls = 0;
  fetchImpl = async () => {
    calls++;
    if (calls === 1) return new Promise(resolve => { resolveInitial = resolve; });
    return new Response(JSON.stringify(calls === 2 ? [oldRows[1]] : oldRows), { status: 200 });
  };
  let favorites;
  function Consumer() { favorites = useFavorites(); return React.createElement('span', null, favorites.items.map(row => row.id).join(',')); }
  const view = await mount(() => React.createElement(FavoritesProvider, null, React.createElement(Consumer)));
  try {
    await React.act(async () => changes.publishBlockChange({ userId: 'blocked-owner', blocked: true }));
    assert.equal(favorites.items.length, 1);
    assert.equal(favorites.ready, true);
    await React.act(async () => resolveInitial(new Response(JSON.stringify(oldRows), { status: 200 })));
    assert.equal(favorites.items.length, 1);
    assert.equal(favorites.items[0].id, 'safe');
    await React.act(async () => changes.publishBlockChange({ userId: 'blocked-owner', blocked: false }));
    assert.equal(favorites.items.length, 2);
  } finally { await view.close(); }
});
