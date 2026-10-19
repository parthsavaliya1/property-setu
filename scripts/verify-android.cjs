const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

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
