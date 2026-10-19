const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const ts = require('typescript');

const appRoot = path.join(__dirname, '..');
const apiSource = ts.createSourceFile('api.ts', fs.readFileSync(path.join(appRoot, 'src/lib/api.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
const requestFunction = apiSource.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'request');
const baseVariable = requestFunction?.body?.statements.flatMap(node => ts.isVariableStatement(node) ? [...node.declarationList.declarations] : []).find(node => node.name.getText(apiSource) === 'base');
assert.ok(baseVariable?.initializer && ts.isCallExpression(baseVariable.initializer) && baseVariable.initializer.expression.getText(apiSource) === 'apiBase', 'request() must use apiBase(); remove private/local API overrides before release.');
const linksSource = fs.readFileSync(path.join(appRoot, 'src/lib/publicLinks.ts'), 'utf8');
const publicUrl = linksSource.match(/PUBLIC_WEBSITE_URL\s*=\s*["']([^"']+)/)?.[1];
assert.ok(publicUrl, 'Public policy website URL is missing');
const website = new URL(publicUrl);
assert.ok(website.protocol === 'https:' && !/^(localhost|127\.|192\.168\.|10\.|0\.)/i.test(website.hostname), 'Policy/deletion website must use a public HTTPS URL.');

const expoRoot = path.dirname(require.resolve('expo/package.json'));
const result = spawnSync(process.execPath, [path.join(expoRoot, 'bin', 'cli'), 'config', '--type', 'introspect', '--json'], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
if (result.status !== 0) throw new Error(result.stderr || 'Expo manifest inspection failed');
const config = JSON.parse(result.stdout);
const mods = config._internal.modResults.android;
const permissions = mods.manifest.manifest['uses-permission'] || [];
const active = permissions.filter(item => item.$['tools:node'] !== 'remove').map(item => item.$['android:name']);
for (const permission of ['READ_MEDIA_IMAGES', 'READ_MEDIA_VIDEO', 'READ_MEDIA_AUDIO', 'READ_EXTERNAL_STORAGE', 'WRITE_EXTERNAL_STORAGE', 'CAMERA', 'SYSTEM_ALERT_WINDOW']) {
  assert.ok(!active.includes('android.permission.' + permission), 'Unnecessary permission: ' + permission);
}
const target = mods.gradleProperties.find(item => item.key === 'android.targetSdkVersion');
assert.ok(Number(target?.value) >= 36, 'Google Play target SDK must be at least 36');
assert.equal(config.android.usesCleartextTraffic, false, 'Production cleartext traffic must be disabled');
const eas = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'eas.json'), 'utf8'));
assert.equal(eas.build.production.android.buildType, 'app-bundle', 'Production must generate an AAB');
const iapManifest = fs.readFileSync(path.join(path.dirname(require.resolve('expo-iap/package.json')), 'android', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
assert.ok(iapManifest.includes('com.android.vending.BILLING'), 'Native Play Billing permission missing');
console.log('PASS: generated target API, permission removals, HTTPS configuration, AAB profile and native billing dependency.');
console.log('Still required: signed-bundle inspection, 16 KB native-library checks, device tests and Play Console declarations.');
