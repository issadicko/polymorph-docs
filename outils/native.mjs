/**
 * Native extensions (manifest "type": "native"): reading, checks, keys and signature, with no Polymorph server.
 * The rules mirror those of the deployment (NativeArchive, NativeManifest and Signature on the server); the deployment
 * remains the reference. The signature produced here is identical, byte for byte, to that of "php artisan extension:sign".
 *
 * Messages returned by the checks are shown to the publisher: they are in French, like the rest of polymorph-ext and
 * like the product's own deployment messages.
 */
import { createHash, createPrivateKey, generateKeyPairSync, sign as ed25519Sign } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = JSON.parse(readFileSync(join(ROOT, 'contrats/polymorph-native.schema.json'), 'utf8'));

/** Version of the user-interface SDK provided by the product these contracts describe (NativeManifest::SDK_VERSION). */
export const SDK_VERSION = '1.0.0';

/** Limits of NativeArchive: archive size, uncompressed content, number of files. */
export const NATIVE_LIMITS = { archive: 20 * 1024 * 1024, uncompressed: 50 * 1024 * 1024, files: 2000 };

/** Name of the signature file at the root of the extension (Signature::FILE). */
export const SIGNATURE_FILE = 'SIGNATURE';

const MANIFEST = 'polymorph.json';
const ROOT_FILES = ['README.md', 'LICENSE', 'LICENSE.md', 'LICENSE.txt', 'CHANGELOG.md'];
const ALLOWED_TYPES = {
  'backend/': ['php', 'json', 'md'],
  'ui/': ['js', 'mjs', 'css', 'json', 'svg', 'png', 'webp', 'jpg', 'jpeg', 'gif', 'woff2', 'woff', 'map', 'txt'],
};
const CONSTRAINT_PATTERN = /^(\^|>=)\d+\.\d+(\.\d+)?$/;

/** Keys allowed in each object of the manifest (NativeManifest::KEYS); any other key is rejected, with its path. */
export const MANIFEST_KEYS = {
  manifest: ['$schema', 'format', 'type', 'id', 'version', 'name', 'description', 'publisher', 'compatibility', 'dependencies',
    'permissions', 'roles', 'backend', 'ui', 'application', 'translations'],
  compatibility: ['polymorph', 'php'],
  backend: ['class'],
  ui: ['module', 'sdk'],
  application: ['name', 'short_name', 'tint', 'pictogram', 'screens'],
  tint: ['tile', 'plate', 'edge', 'detail'],
  screen: ['label', 'icon', 'path', 'permission'],
  shape: ['element', 'color', 'x', 'y', 'width', 'height', 'rx', 'cx', 'cy', 'r', 'd', 'opacity'],
  translations: ['ar', 'en'],
};

const validateSchema = new Ajv2020({ allErrors: true, strict: false }).compile(SCHEMA);

/** Does the manifest describe a native extension? */
export const isNative = (manifest) => manifest?.type === 'native';

/** Every file of the folder, except hidden ones (.git, .gitignore…). Rejections come with the checks. */
export function readNativeDirectory(directory) {
  const files = new Map();
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      if (name.startsWith('.')) continue;
      const path = join(current, name);
      if (statSync(path).isDirectory()) walk(path);
      else files.set(relative(directory, path).split(sep).join('/'), readFileSync(path));
    }
  };
  walk(directory);
  return files;
}

/** Why a path is rejected in the archive, or null when it is allowed (NativeArchive::rejectionReason). */
export function rejectionReason(name) {
  const segments = name.split('/');
  if (name === '' || name.length > 200 || name.startsWith('/') || name.includes('\\') || /[\x00-\x1F]/.test(name)
    || segments.includes('..') || segments.includes('.')) {
    return `Chemin refusé dans l’archive : « ${name} ».`;
  }
  if (segments.includes('vendor') || segments.includes('node_modules')) {
    return `Dépendances embarquées refusées (« ${name} ») : une extension utilise les bibliothèques du produit.`;
  }
  if (name === MANIFEST || name === SIGNATURE_FILE || ROOT_FILES.includes(name)) return null;
  const extension = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  for (const [folder, types] of Object.entries(ALLOWED_TYPES)) {
    if (name.startsWith(folder)) {
      return types.includes(extension) ? null : `Type de fichier refusé dans ${folder} : « ${name} ».`;
    }
  }
  return `Fichier non prévu dans une extension native : « ${name} ».`;
}

/** Is "^1.2" or ">=1.2" satisfied by this version (Versions::satisfies)? */
export function satisfies(version, constraint) {
  const v = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(version ?? '');
  const c = /^(\^|>=)(\d+)\.(\d+)(?:\.(\d+))?$/.exec(constraint ?? '');
  if (!v || !c) return false;
  const actual = [Number(v[1]), Number(v[2]), Number(v[3] ?? 0)];
  const minimum = [Number(c[2]), Number(c[3]), Number(c[4] ?? 0)];
  const difference = actual.map((n, i) => n - minimum[i]).find((d) => d !== 0) ?? 0;
  return difference >= 0 && (c[1] === '>=' || actual[0] === minimum[0]);
}

/** Required PHP namespace: PolymorphExt\<Id in StudlyCase>\ (NativeManifest::namespaceFor). */
export const namespaceFor = (id) => `PolymorphExt\\${id.split(/[-_]/).map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join('')}\\`;

/**
 * Names exported by an ES module, read statically: function, class and variable declarations, and export lists
 * (`export { a, b as activate }`). `reexports` is true when the module has `export * from`, whose names cannot be known.
 */
export function exportedNames(source) {
  const names = new Set();
  for (const m of source.matchAll(/\bexport\s+(?:async\s+)?(?:function\s*\*?|class)\s*([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of source.matchAll(/\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g)) names.add(m[1]);
  for (const m of source.matchAll(/\bexport\s*\{([^}]*)\}/g)) {
    for (const specifier of m[1].split(',')) {
      const parts = specifier.trim().split(/\s+as\s+/);
      const exported = (parts[1] ?? parts[0]).trim().replace(/^["']|["']$/g, '');
      if (exported) names.add(exported);
    }
  }
  return { names, reexports: /\bexport\s*\*\s*(?:as\s+[\w$]+\s*)?from\b/.test(source) };
}

/**
 * Checks a native extension from its files: the archive rules, the manifest schema, then what the schema cannot say.
 * @param {Map<string, Buffer>} files
 * @param {{ productVersion: string, reserved: string[], schemaMessage: (e: object) => string }} context
 * @returns {{ manifest: object | null, errors: string[], warnings: string[] }}
 */
export function checkNative(files, { productVersion, reserved, schemaMessage }) {
  const errors = [];
  const warnings = [];
  for (const name of files.keys()) {
    const reason = rejectionReason(name);
    if (reason) errors.push(reason);
  }
  if (files.size > NATIVE_LIMITS.files) errors.push(`L’extension contient trop de fichiers (${NATIVE_LIMITS.files} au plus).`);
  const total = [...files.values()].reduce((sum, f) => sum + f.length, 0);
  if (total > NATIVE_LIMITS.uncompressed) errors.push('Le contenu dépasse 50 Mo une fois décompressé.');

  let manifest;
  try {
    manifest = JSON.parse(files.get(MANIFEST)?.toString('utf8') ?? 'null');
  } catch (e) {
    return { manifest: null, errors: [...errors, `polymorph.json n’est pas un JSON valide : ${e.message}`], warnings };
  }
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return { manifest: null, errors: [...errors, 'Le fichier polymorph.json manque à la racine, ou ne décrit pas un objet.'], warnings };
  }
  if (!validateSchema(manifest)) {
    // Unknown keys are reported below, with their path (as the deployment does); permission names have their own,
    // more precise check (expected prefix).
    const useful = validateSchema.errors.filter((e) => !['if', 'anyOf', 'additionalProperties'].includes(e.keyword)
      && e.propertyName === undefined && !(e.keyword === 'propertyNames' && e.instancePath === '/permissions'));
    errors.push(...useful.map(schemaMessage));
  }
  errors.push(...unknownKeys(manifest));

  const id = typeof manifest.id === 'string' ? manifest.id : '';
  if (reserved.includes(id)) errors.push(`id : identifiant réservé (« ${id} »).`);
  const constraint = manifest.compatibility?.polymorph;
  if (typeof constraint === 'string' && CONSTRAINT_PATTERN.test(constraint) && !satisfies(productVersion, constraint)) {
    errors.push(`compatibility.polymorph : extension prévue pour la version ${constraint} du produit, ces contrats décrivent la version ${productVersion}.`);
  }
  for (const [code, dependency] of Object.entries(asObject(manifest.dependencies))) {
    if (code === id) errors.push(`dependencies.${code} : une extension ne dépend pas d’elle-même.`);
    else if (typeof dependency === 'string' && !CONSTRAINT_PATTERN.test(dependency)) errors.push(`dependencies.${code} : format invalide.`);
  }
  const permissions = asObject(manifest.permissions);
  for (const name of Object.keys(permissions)) {
    if (!name.startsWith(`${id}.`)) errors.push(`permissions.${name} : une permission s’écrit « ${id}.action ».`);
  }
  for (const [role, list] of Object.entries(asObject(manifest.roles))) {
    for (const p of Array.isArray(list) ? list : []) {
      if (!(p in permissions)) errors.push(`roles.${role} : la permission « ${p} » n’est pas déclarée par l’extension.`);
    }
  }

  if (manifest.backend === undefined && manifest.ui === undefined) {
    errors.push('Une extension native apporte du code : « backend », « ui », ou les deux.');
  }
  const className = manifest.backend?.class;
  if (typeof className === 'string') {
    const namespace = namespaceFor(id);
    if (!className.startsWith(namespace) || !/^[A-Za-z_][A-Za-z0-9_\\]*$/.test(className)) {
      errors.push(`backend.class : la classe doit appartenir à l’espace de noms « ${namespace} ».`);
    } else {
      const file = `backend/src/${className.slice(namespace.length).replaceAll('\\', '/')}.php`;
      if (!files.has(file)) errors.push(`backend.class : fichier absent de l’archive (« ${file} »).`);
    }
  }
  const module = manifest.ui?.module;
  if (typeof module === 'string') {
    if (!files.has(module)) {
      errors.push(`ui.module : fichier absent de l’archive (« ${module} »).`);
    } else {
      const { names, reexports } = exportedNames(files.get(module).toString('utf8'));
      if (names.has('activate')) {
        // the entry point the product calls
      } else if (reexports) {
        warnings.push(`ui.module : « ${module} » réexporte un autre module ; vérifiez qu’il exporte la fonction activate(polymorph).`);
      } else {
        errors.push(`ui.module : « ${module} » n’exporte pas de fonction activate(polymorph), que le produit appelle au chargement.`);
      }
    }
  }
  const sdk = manifest.ui?.sdk;
  if (typeof sdk === 'string' && CONSTRAINT_PATTERN.test(sdk) && !satisfies(SDK_VERSION, sdk)) {
    errors.push(`ui.sdk : interface prévue pour le SDK ${sdk} (SDK de ce produit : ${SDK_VERSION}).`);
  }
  if (manifest.application !== undefined && manifest.ui === undefined) {
    errors.push('« application » demande une « ui » : les écrans de la tuile sont dessinés par l’interface de l’extension.');
  }
  for (const [i, screen] of asArray(manifest.application?.screens).entries()) {
    if (screen?.permission && !(screen.permission in permissions)) {
      errors.push(`application.screens[${i}].permission : la permission « ${screen.permission} » n’est pas déclarée par l’extension.`);
    }
  }
  const mark = id.replaceAll('-', '_');
  for (const name of files.keys()) {
    if (name.startsWith('backend/database/migrations/') && !name.split('/').pop().includes(mark)) {
      errors.push(`${name} : le nom d’une migration contient l’identifiant de l’extension (« ${mark} »).`);
    }
  }
  if (!files.has(SIGNATURE_FILE)) {
    warnings.push('Extension non signée : signez-la (polymorph-ext sign) avant de la livrer.');
  } else if (parseSignature(files.get(SIGNATURE_FILE).toString('utf8')) === null) {
    errors.push('Le fichier SIGNATURE est illisible : signez de nouveau (polymorph-ext sign).');
  }
  return { manifest, errors: [...new Set(errors)], warnings };
}

/** Keys the format does not provide, each with its path (NativeManifest::rejectUnknownKeys). */
function unknownKeys(m) {
  const errors = [];
  const reject = (object, kind, path) => {
    if (!object || typeof object !== 'object' || Array.isArray(object)) return;
    for (const key of Object.keys(object)) {
      if (!MANIFEST_KEYS[kind].includes(key)) errors.push(`${path} : clé non prévue (« ${key} »).`);
    }
  };
  reject(m, 'manifest', MANIFEST);
  reject(m.compatibility, 'compatibility', 'compatibility');
  reject(m.backend, 'backend', 'backend');
  reject(m.ui, 'ui', 'ui');
  reject(m.translations, 'translations', 'translations');
  const application = m.application;
  if (application && typeof application === 'object' && !Array.isArray(application)) {
    reject(application, 'application', 'application');
    reject(application.tint, 'tint', 'application.tint');
    asArray(application.screens).forEach((s, i) => reject(s, 'screen', `application.screens[${i}]`));
    asArray(application.pictogram).forEach((s, i) => reject(s, 'shape', `application.pictogram[${i}]`));
  }
  return errors;
}

/* ---------------------------------------------------------------- Keys and signature */

const base64url = (b) => Buffer.from(b).toString('base64url');

/**
 * Ed25519 key pair, in the server's format (libsodium): public key of 32 bytes, secret key of 64 (seed + public key),
 * both base64-encoded. Same keys as Signature::generateKeyPair().
 */
export function generateKeyPair() {
  const { privateKey } = generateKeyPairSync('ed25519');
  const jwk = privateKey.export({ format: 'jwk' });
  const seed = Buffer.from(jwk.d, 'base64url');
  const publicKey = Buffer.from(jwk.x, 'base64url');
  return { public_key: publicKey.toString('base64'), secret_key: Buffer.concat([seed, publicKey]).toString('base64') };
}

/** Fingerprint of a key: SHA-256 (hexadecimal) of the raw public key (Signature::fingerprint). */
export const fingerprint = (publicKey) => createHash('sha256').update(Buffer.from(publicKey, 'base64')).digest('hex');

/** Signed payload: the header, then "sha256  path" for every file except SIGNATURE, in byte order (Signature::payload). */
export function signaturePayload(files) {
  const lines = [...files]
    .filter(([name]) => name !== SIGNATURE_FILE)
    .sort(([a], [b]) => Buffer.compare(Buffer.from(a), Buffer.from(b)))
    .map(([name, content]) => `${createHash('sha256').update(content).digest('hex')}  ${name}`);
  return `polymorph-signature 1\n${lines.join('\n')}\n`;
}

/** Content of the SIGNATURE file for these files, made with a secret key (64 bytes, base64-encoded) (Signature::sign). */
export function sign(files, secretKey) {
  const raw = Buffer.from(secretKey ?? '', 'base64');
  if (raw.length !== 64) throw new Error('Clé secrète invalide : 64 octets encodés en base64 attendus.');
  const seed = raw.subarray(0, 32);
  const publicKey = raw.subarray(32);
  const key = createPrivateKey({ key: { kty: 'OKP', crv: 'Ed25519', d: base64url(seed), x: base64url(publicKey) }, format: 'jwk' });
  const signature = ed25519Sign(null, Buffer.from(signaturePayload(files)), key).toString('base64');
  return `${JSON.stringify({ format: 1, key: fingerprint(publicKey.toString('base64')), signature }, null, 4)}\n`;
}

/** The SIGNATURE file read back: { key, signature }, or null when it is not in the expected format (Signature::parse). */
export function parseSignature(content) {
  let json;
  try {
    json = JSON.parse(content);
  } catch {
    return null;
  }
  if (!json || json.format !== 1 || typeof json.key !== 'string' || typeof json.signature !== 'string' || !/^[0-9a-f]{64}$/.test(json.key)) {
    return null;
  }
  return { key: json.key, signature: json.signature };
}

const asObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const asArray = (v) => (Array.isArray(v) ? v : []);
