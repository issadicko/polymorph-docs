// Native-extension tests: the example passes, the deployment rejections are the same, the signature is the server's.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createPublicKey, verify } from 'node:crypto';
import { cpSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { archiver, messageSchema, RESERVES, VERSION_PRODUIT } from './polymorph-ext.mjs';
import {
  checkNative, exportedNames, fingerprint, generateKeyPair, namespaceFor, parseSignature, readNativeDirectory, satisfies, sign,
  signaturePayload,
} from './native.mjs';

const INFIRMARY = new URL('../exemples/native/infirmary/', import.meta.url).pathname;
const TOOL = new URL('./polymorph-ext.mjs', import.meta.url).pathname;
const CONTEXT = { productVersion: VERSION_PRODUIT, reserved: [...RESERVES, 'native-extensions'], schemaMessage: messageSchema };
const check = (files) => checkNative(files, CONTEXT);

/** The example, with a modified manifest and added files. */
function variant(modify = (m) => m, added = {}) {
  const files = readNativeDirectory(INFIRMARY);
  const manifest = modify(JSON.parse(files.get('polymorph.json').toString('utf8')));
  files.set('polymorph.json', Buffer.from(JSON.stringify(manifest)));
  for (const [name, content] of Object.entries(added)) files.set(name, Buffer.from(content));
  return files;
}

const verifies = (files, publicKey, signature) => verify(null, Buffer.from(signaturePayload(files)),
  createPublicKey({ key: { kty: 'OKP', crv: 'Ed25519', x: Buffer.from(publicKey, 'base64').toString('base64url') }, format: 'jwk' }),
  Buffer.from(signature, 'base64'));

test('the Infirmary example is valid, unsigned', () => {
  const { errors, warnings } = check(readNativeDirectory(INFIRMARY));
  assert.deepEqual(errors, []);
  assert.match(warnings.join('\n'), /non signée/);
});

const CASES = {
  'bundled dependencies': [(m) => m, { 'backend/vendor/autoload.php': '<?php' }, /Dépendances embarquées refusées/],
  'PHP outside backend': [(m) => m, { 'ui/tool.php': '<?php' }, /Type de fichier refusé dans ui\//],
  'unexpected file': [(m) => m, { 'scripts/a.kodi': 'return 1' }, /Fichier non prévu dans une extension native/],
  'path climbing out': [(m) => m, { 'backend/../escape.php': '<?php' }, /Chemin refusé/],
  'class outside the namespace': [(m) => ({ ...m, backend: { class: 'PolymorphExt\\Other\\Extension' } }), {}, /backend\.class : .*espace de noms « PolymorphExt\\Infirmary\\ »/],
  'missing class file': [(m) => ({ ...m, backend: { class: 'PolymorphExt\\Infirmary\\Missing' } }), {}, /backend\.class : fichier absent de l’archive \(« backend\/src\/Missing.php »\)/],
  'missing ui module': [(m) => ({ ...m, ui: { ...m.ui, module: 'ui/main.js' } }), {}, /ui\.module : fichier absent de l’archive \(« ui\/main.js »\)/],
  'ui module without activate': [(m) => m, { 'ui/index.js': 'export function activer(polymorph) {}\n' }, /ui\.module : « ui\/index.js » n’exporte pas de fonction activate/],
  'migration without the id': [(m) => m, { 'backend/database/migrations/2026_01_01_000000_create_tables.php': '<?php' }, /le nom d’une migration contient l’identifiant de l’extension \(« infirmary »\)/],
  'tile without ui': [({ ui: _, ...m }) => m, {}, /« application » demande une « ui »/],
  'unknown SDK': [(m) => ({ ...m, ui: { ...m.ui, sdk: '^2.0' } }), {}, /ui\.sdk : interface prévue pour le SDK \^2.0/],
  'product too recent': [(m) => ({ ...m, compatibility: { polymorph: '^2.0' } }), {}, /compatibility\.polymorph : extension prévue pour la version \^2.0 du produit/],
  'permission of another extension': [(m) => ({ ...m, permissions: { ...m.permissions, 'finance.view': 'Voir' } }), {}, /une permission s’écrit « infirmary.action »/],
  'undeclared screen permission': [(m) => { m.application.screens[1].permission = 'infirmary.delete'; return m; }, {}, /application\.screens\[1\]\.permission : la permission « infirmary.delete »/],
  'reserved identifier': [(m) => ({ ...m, id: 'native-extensions' }), {}, /identifiant réservé/],
  'self dependency': [(m) => ({ ...m, dependencies: { infirmary: '^1.0' } }), {}, /dependencies\.infirmary/],
  'unknown key': [(m) => ({ ...m, hooks: [] }), {}, /polymorph\.json : clé non prévue \(« hooks »\)/],
  'French key left over': [(m) => ({ ...m, nom: m.name }), {}, /polymorph\.json : clé non prévue \(« nom »\)/],
  'unknown key in a screen': [(m) => { m.application.screens[0].libelle = 'Visites'; return m; }, {}, /application\.screens\[0\] : clé non prévue \(« libelle »\)/],
  'unknown key in the tint': [(m) => { m.application.tint.tuile = '#ffffff'; return m; }, {}, /application\.tint : clé non prévue \(« tuile »\)/],
  'unknown pictogram colour': [(m) => { m.application.pictogram[0].color = 'blanc'; return m; }, {}, /application\.pictogram\[0\]\.color : valeur non reconnue/],
  'unknown key in backend': [(m) => ({ ...m, backend: { classe: m.backend.class } }), {}, /backend : clé non prévue \(« classe »\)/],
  'neither backend nor ui': [({ backend: _b, ui: _u, application: _a, ...m }) => m, {}, /apporte du code : « backend », « ui »/],
  'duplicate setting code': [(m) => ({ ...m, settings: [...m.settings, { code: 'phone', label: 'Autre', type: 'TEXTE' }] }), {}, /settings\[2\]\.code : « phone » est déjà utilisé/],
  'default of the wrong type': [(m) => { m.settings[1].default = 'peut-être'; return m; }, {}, /settings\[1\]\.default : valeur par défaut invalide pour le type OUI_NON/],
  'invalid default date': [(m) => ({ ...m, settings: [{ code: 'start', label: 'Début', type: 'DATE', default: '2026-02-30' }] }), {}, /settings\[0\]\.default : valeur par défaut invalide pour le type DATE/],
  'list without options': [(m) => ({ ...m, settings: [{ code: 'level', label: 'Niveau', type: 'LISTE' }] }), {}, /settings\[0\] : la clé « options » est obligatoire/],
  'default outside the list': [(m) => ({ ...m, settings: [{ code: 'level', label: 'Niveau', type: 'LISTE', options: ['Bas', 'Haut'], default: 'Moyen' }] }), {}, /settings\[0\]\.default : valeur par défaut invalide pour le type LISTE/],
  'unknown key in a setting': [(m) => { m.settings[0].libelle = 'Téléphone'; return m; }, {}, /settings\[0\] : clé non prévue \(« libelle »\)/],
  'unreadable SIGNATURE': [(m) => m, { SIGNATURE: '{"format":1,"cle":"x","signature":"y"}' }, /SIGNATURE est illisible/],
};
for (const [name, [modify, added, expected]] of Object.entries(CASES)) {
  test(`rejects: ${name}`, () => {
    assert.match(check(variant(modify, added)).errors.join('\n'), expected);
  });
}

test('finds the exported names of a ui module', () => {
  assert.ok(exportedNames('export async function activate(p) {}').names.has('activate'));
  assert.ok(exportedNames('const activate = () => {}; export { activate };').names.has('activate'));
  assert.ok(exportedNames('function a(){} export{a as activate}').names.has('activate'));
  assert.ok(!exportedNames('export { activate as start }').names.has('activate'));
  assert.ok(exportedNames("export * from './main.js'").reexports);
  assert.match(check(variant((m) => m, { 'ui/index.js': "export * from './main.js';\n", 'ui/main.js': 'export function activate() {}\n' })).warnings.join('\n'), /réexporte/);
});

test('signs exactly like the server (vector produced by the product’s Signature::sign)', () => {
  // Fixed seed key (32 bytes 0x07) and fixed files: Ed25519 is deterministic.
  const secretKey = 'BwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwfqSmxj4pxSCr71UHsTLsX5lUd2rr6+e5JCHuppFEbSLA==';
  const files = new Map([
    ['polymorph.json', Buffer.from('{"id":"essai"}\n')],
    ['ui/index.js', Buffer.from('export function activate() {}\n')],
    ['backend/src/Extension.php', Buffer.from('<?php\n')],
  ]);
  assert.equal(sign(files, secretKey), '{\n    "format": 1,\n    "key": "fe812c12f3ab4ce6ac5db69ac352f906cb1b11ef43fb33e252ef7ff552263889",\n'
    + '    "signature": "771Dm+tN0IdECwbeTdkFnBFiHfx+xKBRu3hqt3FxOdogMomPvMXHuxdhVYj5goPNDBkKUKrepERtoRxAvk33CA=="\n}\n');
  assert.equal(fingerprint('6kpsY+KcUgq+9VB7Ey7F+ZVHdq6+vnuSQh7qaRRG0iw='), 'fe812c12f3ab4ce6ac5db69ac352f906cb1b11ef43fb33e252ef7ff552263889');
  assert.deepEqual(Object.keys(JSON.parse(sign(files, secretKey))), ['format', 'key', 'signature']);
});

test('a generated pair signs an archive that its public key verifies', () => {
  const keys = generateKeyPair();
  assert.deepEqual(Object.keys(keys), ['public_key', 'secret_key']);
  assert.equal(Buffer.from(keys.secret_key, 'base64').subarray(32).toString('base64'), keys.public_key);
  const files = readNativeDirectory(INFIRMARY);
  const signature = parseSignature(sign(files, keys.secret_key));
  assert.equal(signature.key, fingerprint(keys.public_key));
  assert.ok(verifies(files, keys.public_key, signature.signature));
  files.set('ui/index.js', Buffer.concat([files.get('ui/index.js'), Buffer.from('\n// modified')]));
  assert.ok(!verifies(files, keys.public_key, signature.signature));
});

test('command line: key generate, sign, then verifier and empaqueter accept the signed folder', () => {
  const work = mkdtempSync(join(tmpdir(), 'polymorph-native-'));
  try {
    const keyFile = join(work, 'key.json');
    const folder = join(work, 'infirmary');
    cpSync(INFIRMARY, folder, { recursive: true });
    const run = (...args) => execFileSync(process.execPath, [TOOL, ...args], { encoding: 'utf8' });
    run('key', 'generate', '--owner', 'Essai', '--output', keyFile);
    const key = JSON.parse(readFileSync(keyFile, 'utf8'));
    assert.deepEqual(Object.keys(key), ['format', 'owner', 'public_key', 'secret_key']);
    assert.equal(key.owner, 'Essai');
    assert.equal(statSync(keyFile).mode & 0o777, 0o600);
    assert.match(run('sign', folder, '--key', keyFile), /signé \(\d+ fichiers\) par Essai/);
    const files = readNativeDirectory(folder);
    const { key: signedWith, signature } = parseSignature(files.get('SIGNATURE').toString('utf8'));
    assert.equal(signedWith, fingerprint(key.public_key));
    assert.ok(verifies(files, key.public_key, signature));
    assert.match(run('verifier', folder), /Extension native valide/);
    assert.match(run('empaqueter', folder, '--sortie', work), /infirmary-1\.0\.0\.poly/);
    assert.match(run('verifier', join(work, 'infirmary-1.0.0.poly')), /Extension native valide/);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
});

test('reproducible archive, versions and namespace', () => {
  const files = readNativeDirectory(INFIRMARY);
  assert.deepEqual(archiver(files), archiver(new Map([...files].reverse())));
  assert.equal(namespaceFor('no-prefix'), 'PolymorphExt\\NoPrefix\\');
  assert.ok(satisfies('1.4.0', '^1.2') && !satisfies('2.0.0', '^1.0') && satisfies('2.0.0', '>=1.0'));
});
