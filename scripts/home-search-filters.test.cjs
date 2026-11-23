const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');

// Exercise the real screen callbacks with native UI and device services stubbed.
function harness(screenPath = 'src/screens/BrowseScreens.tsx', options = {}) {
  let slots = [], cursor = 0, effects = [], loads = [], apiQueries = [];
  const useState = initial => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
    return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
  };
  const colors = new Proxy({}, { get: () => '#123456' });
  const text = new Proxy({}, { get: (_, key) => new Proxy({}, { get: (_, word) => `${key}.${word}` }) });
  const native = Object.fromEntries(['View', 'Text', 'Pressable', 'ScrollView', 'Modal', 'FlatList', 'Image', 'RefreshControl', 'ActivityIndicator'].map(name => [name, name]));
  native.useWindowDimensions = () => ({ width: 390, height: 844 });
  native.Dimensions = { get: () => ({ width: 390, height: 844 }) };
  native.Platform = { OS: 'android' };
  const fallback = new Proxy({}, { get: (_, key) => key });
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '..', screenPath), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mockRequire = name => {
    if (name === 'react') return { ...React, useState, useRef: initial => { const [ref] = useState(() => ({ current: initial })); return ref; }, useEffect: (fn, deps) => effects.push({ fn, deps }), useCallback: fn => fn };
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return native;
    if (name === '@react-navigation/native') return { useFocusEffect() {}, useNavigation: () => ({ goBack() {} }) };
    if (name === '@expo/vector-icons') return { Ionicons: 'Ionicons', MaterialCommunityIcons: 'MaterialCommunityIcons' };
    if (name === 'expo-image-picker') return { launchImageLibraryAsync: async pickerOptions => { options.pickerOptions?.push(pickerOptions); return options.pickerResponse; } };
    if (name.endsWith('/i18n/format')) return { fill: (text, values) => String(text).replace(/\{(\w+)\}/g, (_, key) => values[key]) };
    if (name.endsWith('/propertyCategories') || name.endsWith('/mediaSettings')) {
      const categoryModule = { exports: {} };
      const categoryJs = ts.transpileModule(fs.readFileSync(path.join(__dirname, name.endsWith('/mediaSettings') ? '../src/lib/mediaSettings.ts' : '../src/lib/propertyCategories.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
      vm.runInNewContext('(function(module,exports){' + categoryJs + '\n})')(categoryModule, categoryModule.exports);
      return categoryModule.exports;
    }
    if (name.endsWith('/useWalletTopUp')) return { useWalletTopUp: () => ({}) };
    if (name.endsWith('/keyboard')) return { KeyboardScreen: 'KeyboardScreen', KeyboardFormScroll: 'KeyboardFormScroll', useKeyboardOverlap: () => 0 };
    if (name.endsWith('/labels')) return { kindName: slug => slug };
    if (name.endsWith('/i18n/active')) return { getCopy: () => text };
    if (name.endsWith('/i18n')) return { useI18n: () => ({ t: text }) };
    if (name.endsWith('/AuthContext')) return { useAuth: () => ({ me: null, token: options.token || null }) };
    if (name.endsWith('/FavoritesContext')) return { useFavorites: () => ({ isSaved: () => false, toggle: () => {} }) };
    if (name.endsWith('/LoginGate')) return { useRequireLogin: () => () => {} };
    if (name.endsWith('/location')) return { useBrowseCity: () => ({ city: 'Rajkot', ready: true, denied: false }) };
    if (name.endsWith('/paging')) return { usePagedProperties: load => { loads.push(load); return { items: options.items || [], loading: !options.items, loadMore() {}, refresh() {} }; } };
    if (name.endsWith('/api')) return { cityName: value => value, PROPERTY_PAGE_SIZE: 20, sortForSearch: rows => rows, uploadMedia: async uri => { options.uploads?.push(uri); return `https://media.example/${uri}`; }, api: { mediaSettings: async () => options.mediaLimits || { maxPhotos: 29, maxVideos: 1, maxVideoDurationSeconds: 60 }, property: async () => options.property, properties: async query => { apiQueries.push(query); return []; } } };
    if (name.endsWith('/theme')) return { colors, buttonShadow: {} };
    if (name === 'react-native-safe-area-context') return { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
    if (name.endsWith('/components/ui')) return { styles: {}, EmptyState: 'EmptyState', PropertyGridSkeleton: 'Skeleton', PageHeader: 'PageHeader' };
    return fallback;
  };
  vm.runInNewContext('(function(require,module,exports){' + js + '\n})', { URLSearchParams, console, setTimeout, clearTimeout })(mockRequire, module, module.exports);
  return {
    screens: module.exports,
    render(fn, props) { cursor = 0; effects = []; loads = []; return fn(props); },
    effectFor(request) { effects.find(effect => effect.deps?.[0] === request).fn(); },
    async effectContaining(text) { effects.find(effect => effect.fn.toString().includes(text)).fn(); await new Promise(setImmediate); },
    load(index = 0, offset = 0) { return loads[index](offset); },
    apiQueries,
  };
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  for (const child of React.Children.toArray(node.props?.children)) {
    const match = find(child, predicate);
    if (match) return match;
  }
}
function sheet(tree) { return find(tree, node => node.type?.name === 'SearchFiltersSheet'); }
function chip(tree, label) { return find(tree, node => node.type?.name === 'LeVechChip' && node.props.label === label); }

test('home uses the search filter sheet and Apply transfers every selection into Search and its API query', async () => {
  const home = harness();
  let request;
  const props = { onApplyFilters: next => { request = next; } };
  let tree = home.render(home.screens.HomeScreen, props);
  find(tree, node => node.props?.accessibilityLabel === 'search.filters').props.onPress();
  tree = home.render(home.screens.HomeScreen, props);
  assert.equal(sheet(tree).props.visible, true);
  const selections = [
    ['home.rent', 'listing', 'rent'],
    ['kinds.apartment', 'propertyType', 'apartment'],
    ['search.range25', 'price', '25to50'],
    ['search.bhk2', 'bedrooms', '2'],
    ['search.photos', 'withPhotos', true],
    ['details.parking', 'withParking', true],
    ['search.priceLow', 'sort', 'low'],
  ];
  for (const [label, field, expected] of selections) {
    const current = sheet(tree);
    const controls = current.type(current.props);
    chip(controls, label).props.onPress();
    tree = home.render(home.screens.HomeScreen, props);
    assert.equal(sheet(tree).props.value[field], expected);
  }
  find(tree, node => node.props?.placeholder === 'home.localityPlaceholder').props.onChangeText('  Kalawad Road  ');
  tree = home.render(home.screens.HomeScreen, props);
  sheet(tree).props.onApply();
  assert.equal(request.q, 'Kalawad Road');
  tree = home.render(home.screens.HomeScreen, props);
  assert.equal(sheet(tree).props.visible, false);

  const search = harness();
  let results = search.render(search.screens.SearchScreen, { filterRequest: request });
  assert.equal(sheet(results).type.name, sheet(tree).type.name);
  search.effectFor(request);
  results = search.render(search.screens.SearchScreen, { filterRequest: request });
  assert.deepEqual(JSON.parse(JSON.stringify(sheet(results).props.value)), JSON.parse(JSON.stringify(request.filters)));
  await search.load();
  const params = new URLSearchParams(search.apiQueries[0].slice(1));
  for (const [key, value] of Object.entries({ q: 'Kalawad Road', listing_type: 'rent', category: 'apartment', min_price: '2500000', max_price: '5000000', bedrooms: '2', parking: 'true', prefer_city: 'Rajkot' })) assert.equal(params.get(key), value);

  // A second Apply must replace previous choices, including false/empty values.
  const cleared = { q: '', filters: { listing: '', category: '', propertyType: '', price: '', bedrooms: '', withPhotos: false, withParking: false, sort: 'newest' } };
  search.render(search.screens.SearchScreen, { filterRequest: cleared });
  search.effectFor(cleared);
  results = search.render(search.screens.SearchScreen, { filterRequest: cleared });
  assert.deepEqual(JSON.parse(JSON.stringify(sheet(results).props.value)), cleared.filters);
  await search.load();
  const clearParams = new URLSearchParams(search.apiQueries[1].slice(1));
  for (const key of ['q', 'category', 'listing_type', 'min_price', 'max_price', 'bedrooms', 'parking']) assert.equal(clearParams.has(key), false);
});

test('dismissing home filters does not apply or navigate, and Clear resets the sheet', () => {
  const home = harness();
  let applied = 0;
  const props = { onApplyFilters: () => { applied++; } };
  let tree = home.render(home.screens.HomeScreen, props);
  const current = sheet(tree);
  current.props.onChange({ ...current.props.value, listing: 'sale', bedrooms: '3' });
  tree = home.render(home.screens.HomeScreen, props);
  const controls = sheet(tree).type(sheet(tree).props);
  find(controls, node => node.type === 'Pressable' && React.Children.toArray(node.props.children).some(child => child.props?.children === 'common.clear')).props.onPress();
  tree = home.render(home.screens.HomeScreen, props);
  assert.equal(sheet(tree).props.value.listing, '');
  assert.equal(sheet(tree).props.value.bedrooms, '');
  sheet(tree).props.onClose();
  assert.equal(applied, 0);
});


test('home tabs filter both tiers in place, combine Rent with Villa, and show the active colors', async () => {
  const home = harness();
  let navigations = 0;
  const props = { onSearch: () => { navigations++; }, onApplyFilters: () => { navigations++; } };
  const render = () => home.render(home.screens.HomeScreen, props);
  const tab = (tree, label) => find(tree, node => node.type === 'Pressable' && node.props.accessibilityLabel === label);
  let tree = render();
  assert.equal(tab(tree, 'home.buy').props.accessibilityState.selected, true);
  assert.equal(tab(tree, 'kinds.all').props.style.backgroundColor, tab(tree, 'home.buy').props.style.backgroundColor);

  tab(tree, 'home.rent').props.onPress();
  tree = render();
  tab(tree, 'kinds.villa').props.onPress();
  tree = render();
  assert.equal(tab(tree, 'home.rent').props.accessibilityState.selected, true);
  assert.equal(tab(tree, 'home.buy').props.accessibilityState.selected, false);
  assert.equal(tab(tree, 'kinds.villa').props.accessibilityState.selected, true);
  for (const index of [0, 1]) {
    await home.load(index);
    const params = new URLSearchParams(home.apiQueries.at(-1).slice(1));
    assert.equal(params.get('listing_type'), 'rent');
    assert.equal(params.get('category'), 'villa');
    assert.equal(params.get('listing_tier'), index === 0 ? 'premium' : 'standard');
  }

  tab(tree, 'kinds.all').props.onPress();
  tree = render();
  await home.load();
  let params = new URLSearchParams(home.apiQueries.at(-1).slice(1));
  assert.equal(params.get('listing_type'), 'rent');
  assert.equal(params.has('category'), false);

  tab(tree, 'home.commercial').props.onPress();
  tree = render();
  await home.load();
  params = new URLSearchParams(home.apiQueries.at(-1).slice(1));
  assert.equal(params.get('category'), 'commercial');
  assert.equal(params.has('listing_type'), false);

  tab(tree, 'kinds.plot').props.onPress();
  tree = render();
  await home.load();
  params = new URLSearchParams(home.apiQueries.at(-1).slice(1));
  assert.equal(params.get('category'), 'commercial-plot');
  assert.equal(params.has('listing_type'), false);
  assert.equal(tab(tree, 'home.commercial').props.accessibilityState.selected, true);
  assert.equal(tab(tree, 'kinds.villa'), undefined);
  assert.ok(tab(tree, 'kinds.shop'));

  tab(tree, 'home.buy').props.onPress();
  tree = render();
  await home.load();
  params = new URLSearchParams(home.apiQueries.at(-1).slice(1));
  assert.equal(params.get('listing_type'), 'sale');
  assert.equal(params.has('category'), false);
  tab(tree, 'kinds.house').props.onPress();
  tree = render();
  await home.load();
  params = new URLSearchParams(home.apiQueries.at(-1).slice(1));
  assert.equal(params.get('category'), 'house');
  assert.equal(params.get('listing_type'), 'sale');
  tab(tree, 'kinds.plot').props.onPress();
  tree = render();
  await home.load();
  params = new URLSearchParams(home.apiQueries.at(-1).slice(1));
  assert.equal(params.get('category'), 'residential-plot');
  assert.equal(navigations, 0);
});


test('creation groups Shop with Commercial and preserves the chosen category when moving between steps', () => {
  const form = harness('src/screens/ListingScreens.tsx');
  const render = () => form.render(form.screens.AddScreen, { onDone() {} });
  let tree = render();
  const commercial = find(tree, node => node.type === 'View' && React.Children.toArray(node.props.children).some(child => child.type === 'Text' && child.props.children === 'home.commercial'));
  assert.ok(commercial);
  for (const slug of ['shop', 'office', 'warehouse', 'commercial-plot']) assert.ok(find(commercial, node => node.props?.accessibilityLabel === slug));
  assert.equal(find(commercial, node => node.props?.accessibilityLabel === 'house'), undefined);
  find(tree, node => node.props?.accessibilityLabel === 'shop').props.onPress();
  tree = render();
  assert.equal(find(tree, node => node.props?.accessibilityLabel === 'shop').props.accessibilityState.selected, true);
  assert.equal(find(tree, node => node.props?.accessibilityLabel === 'house').props.accessibilityState.selected, false);
  const buttonWith = (tree, label) => find(tree, node => node.type === 'Pressable' && React.Children.toArray(node.props.children).some(child => child.props?.children === label));
  buttonWith(tree, 'common.next').props.onPress();
  tree = render();
  buttonWith(tree, 'common.back').props.onPress();
  tree = render();
  assert.equal(find(tree, node => node.props?.accessibilityLabel === 'shop').props.accessibilityState.selected, true);
});


test('premium See All opens Search with premium-only pagination and a removable tier filter', async () => {
  const home = harness('src/screens/BrowseScreens.tsx', { items: [{ id: 'premium-property' }] });
  let request;
  const tree = home.render(home.screens.HomeScreen, { onApplyFilters: next => { request = next; } });
  find(tree, node => node.type === 'Pressable' && node.props.accessibilityLabel === 'home.premium').props.onPress();
  assert.equal(request.tier, 'premium');
  const search = harness();
  search.render(search.screens.SearchScreen, { filterRequest: request });
  search.effectFor(request);
  let results = search.render(search.screens.SearchScreen, { filterRequest: request });
  for (const offset of [0, 20]) {
    await search.load(0, offset);
    const params = new URLSearchParams(search.apiQueries.at(-1).slice(1));
    assert.equal(params.get('listing_tier'), 'premium');
    assert.equal(params.get('offset'), String(offset));
  }
  const badge = find(results, node => node.props?.accessibilityLabel === 'common.clear: home.premium');
  assert.ok(badge);
  badge.props.onPress();
  search.render(search.screens.SearchScreen, { filterRequest: request });
  await search.load();
  assert.equal(new URLSearchParams(search.apiQueries.at(-1).slice(1)).has('listing_tier'), false);

  const repeated = { ...request };
  search.render(search.screens.SearchScreen, { filterRequest: repeated });
  search.effectFor(repeated);
  results = search.render(search.screens.SearchScreen, { filterRequest: repeated });
  const controls = sheet(results).type(sheet(results).props);
  find(controls, node => node.type === 'Pressable' && React.Children.toArray(node.props.children).some(child => child.props?.children === 'common.clear')).props.onPress();
  search.render(search.screens.SearchScreen, { filterRequest: repeated });
  await search.load();
  assert.equal(new URLSearchParams(search.apiQueries.at(-1).slice(1)).has('listing_tier'), false);
});


test('editing preserves existing videos, permits a second video, and rejects an overlong video before upload', async () => {
  const options = {
    token: 'owner-token',
    mediaLimits: { maxPhotos: 5, maxVideos: 2, maxVideoDurationSeconds: 60 },
    pickerOptions: [], uploads: [],
    pickerResponse: { canceled: false, assets: [{ uri: 'new-video.mp4', duration: 61000 }] },
    property: { title: 'Existing house', category_slug: 'house', images: [
      { image_type: 'gallery', image_url: 'https://media.example/photo1.jpg' },
      { image_type: 'gallery', image_url: 'https://media.example/photo2.jpg' },
      { image_type: 'video', image_url: 'https://media.example/existing.mp4' },
    ] },
  };
  const form = harness('src/screens/ListingScreens.tsx', options);
  const render = () => form.render(form.screens.AddScreen, { propertyId: 'property-id', onDone() {} });
  const buttonWith = (tree, label) => find(tree, node => node.type === 'Pressable' && React.Children.toArray(node.props.children).some(child => child.props?.children === label));
  render();
  await form.effectContaining('.property(');
  await form.effectContaining('.mediaSettings()');
  let tree = render();
  for (let step = 0; step < 4; step++) { buttonWith(tree, 'common.next').props.onPress(); tree = render(); }
  const existing = () => find(tree, node => node.type === 'Text' && React.Children.toArray(node.props.children).join('') === 'listing.videoAdded 1');
  assert.ok(existing());
  await buttonWith(tree, 'listing.addVideo').props.onPress();
  tree = render();
  assert.equal(options.uploads.length, 0);
  assert.ok(existing());
  options.pickerResponse.assets[0].duration = 59000;
  await buttonWith(tree, 'listing.addVideo').props.onPress();
  tree = render();
  assert.deepEqual(options.uploads, ['new-video.mp4']);
  assert.equal(options.pickerOptions.at(-1).selectionLimit, 1);
  assert.equal(options.pickerOptions.at(-1).videoMaxDuration, 60);
  assert.ok(existing());
  assert.ok(find(tree, node => node.type === 'Text' && React.Children.toArray(node.props.children).join('') === 'listing.videoAdded 2'));
  assert.equal(buttonWith(tree, 'listing.addVideo'), undefined);
});
