#!/usr/bin/env node
/**
 * Vérifie, empaquette et signe une extension de Polymorph, sans serveur Polymorph.
 *
 *   node outils/polymorph-ext.mjs verifier <dossier | archive.poly>
 *   node outils/polymorph-ext.mjs empaqueter <dossier> [--sortie <dossier>]
 *   node outils/polymorph-ext.mjs key generate --owner <nom> --output <fichier>     (extension native)
 *   node outils/polymorph-ext.mjs sign <dossier> --key <fichier>                     (extension native)
 *
 * Extension déclarative : les contrôles reprennent ceux de l'installation (manifeste format 1) : schéma JSON,
 * références entre clés, syntaxe KodiScript, règles de l'archive. Extension native (« type » : « native ») : ceux du
 * déploiement (outils/native.mjs). L'examen par Polymorph reste la référence.
 */
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Lexer, Parser } from '@issadicko/kodi-script';
import Ajv2020 from 'ajv/dist/2020.js';
import { unzipSync, zipSync } from 'fflate';
import {
  checkNative, fingerprint, generateKeyPair, isNative, NATIVE_LIMITS, readNativeDirectory, rejectionReason, sign, SIGNATURE_FILE,
} from './native.mjs';

const RACINE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = JSON.parse(readFileSync(join(RACINE, 'contrats/polymorph.schema.json'), 'utf8'));
const HOOKS = JSON.parse(readFileSync(join(RACINE, 'contrats/hooks.json'), 'utf8'));

/** Version du produit décrite par les contrats de ce dépôt. */
export const VERSION_PRODUIT = HOOKS.version;

export const LIMITES = { archive: 1_048_576, contenu: 2_097_152, fichiers: 60, script: 20_000 };

const MANIFESTE = 'polymorph.json';
const MOTIF_SCRIPT = /^scripts\/[a-z0-9][a-z0-9_-]{0,59}\.kodi$/;

/** Identifiants qu'une extension ne peut pas prendre : codes des modules et préfixes des permissions du cœur. */
export const RESERVES = [
  'apprenants', 'automatisations', 'caisse', 'classes', 'deliberations', 'demandes', 'evaluations', 'extensions',
  'inscriptions', 'modules', 'notes', 'operations', 'paiements', 'parametrage', 'plateforme', 'presences', 'rapports',
  'sessions', 'sms', 'transport', 'utilisateurs',
];

/** Emplacements ouverts aux extensions, et le rattachement qu'ils demandent à l'entité affichée. */
const EMPLACEMENTS = { 'fiche-inscription.cartes': 'INSCRIPTION', 'fiche-apprenant.cartes': 'APPRENANT' };

const valider = new Ajv2020({ allErrors: true, strict: false }).compile(SCHEMA);

/* ---------------------------------------------------------------- Lecture */

/**
 * Fichiers d'un dossier d'extension. Les fichiers cachés sont ignorés ; ceux qu'une archive n'accepte pas
 * sont laissés de côté et signalés.
 */
export function lireDossier(dossier) {
  const fichiers = new Map();
  const ignores = [];
  const parcourir = (courant) => {
    for (const nom of readdirSync(courant)) {
      if (nom.startsWith('.') || nom === 'node_modules') continue;
      const chemin = join(courant, nom);
      if (statSync(chemin).isDirectory()) {
        parcourir(chemin);
        continue;
      }
      const relatif = relative(dossier, chemin).split(sep).join('/');
      if (relatif === MANIFESTE || relatif === 'README.md' || MOTIF_SCRIPT.test(relatif)) {
        fichiers.set(relatif, readFileSync(chemin));
      } else {
        ignores.push(relatif);
      }
    }
  };
  parcourir(dossier);
  return { fichiers, ignores };
}

/** Fichiers d'une archive .poly, avec les refus de l'installation (chemins, extension native, fichiers non prévus). */
export function lireArchive(donnees) {
  if (donnees.length > LIMITES.archive) {
    return { fichiers: new Map(), erreurs: ['L’archive dépasse 1 Mo.'] };
  }
  let entrees;
  try {
    entrees = unzipSync(new Uint8Array(donnees));
  } catch {
    return { fichiers: new Map(), erreurs: ['L’archive n’est pas un zip lisible.'] };
  }
  const fichiers = new Map();
  const erreurs = [];
  for (const [nom, contenu] of Object.entries(entrees)) {
    if (nom.endsWith('/')) continue;
    if (!cheminSur(nom)) {
      erreurs.push(`Chemin refusé dans l’archive : « ${nom} ».`);
    } else if (nom === 'SIGNATURE' || nom.startsWith('backend/') || nom.startsWith('ui/')) {
      return { fichiers: new Map(), erreurs: ['Cette archive contient du code ou une signature : une extension native déclare « type » : « native » dans son manifeste.'] };
    } else if (nom !== MANIFESTE && nom !== 'README.md' && !MOTIF_SCRIPT.test(nom)) {
      erreurs.push(`Fichier non prévu dans une extension déclarative : « ${nom} ».`);
    } else {
      fichiers.set(nom, Buffer.from(contenu));
    }
  }
  return { fichiers, erreurs };
}

function cheminSur(nom) {
  return nom !== '' && nom.length <= 120 && !nom.startsWith('/') && !nom.includes('\\')
    && !/[\x00-\x1F]/.test(nom) && !nom.split('/').includes('..');
}

/* ---------------------------------------------------------------- Contrôle */

/**
 * Contrôle complet d'une extension à partir de ses fichiers.
 * @param {Map<string, Buffer>} fichiers
 * @returns {{ manifeste: object | null, erreurs: string[], avertissements: string[] }}
 */
export function controler(fichiers) {
  const erreurs = [];
  const avertissements = [];
  if (fichiers.size > LIMITES.fichiers) {
    erreurs.push(`L’extension contient trop de fichiers (${LIMITES.fichiers} au plus).`);
  }
  const total = [...fichiers.values()].reduce((somme, f) => somme + f.length, 0);
  if (total > LIMITES.contenu) {
    erreurs.push('Le contenu dépasse 2 Mo une fois décompressé.');
  }
  const textes = new Map();
  const decodeur = new TextDecoder('utf-8', { fatal: true });
  for (const [nom, contenu] of fichiers) {
    try {
      textes.set(nom, decodeur.decode(contenu));
    } catch {
      erreurs.push(`Fichier illisible (UTF-8 attendu) : « ${nom} ».`);
    }
  }
  if (!textes.has(MANIFESTE)) {
    return { manifeste: null, erreurs: [...erreurs, 'Le fichier polymorph.json manque à la racine.'], avertissements };
  }
  let manifeste;
  try {
    manifeste = JSON.parse(textes.get(MANIFESTE));
  } catch (e) {
    return { manifeste: null, erreurs: [...erreurs, `polymorph.json n’est pas un JSON valide : ${e.message}`], avertissements };
  }
  if (manifeste === null || typeof manifeste !== 'object' || Array.isArray(manifeste)) {
    return { manifeste: null, erreurs: [...erreurs, 'polymorph.json doit décrire un objet.'], avertissements };
  }

  const scripts = new Map([...textes].filter(([nom]) => nom.startsWith('scripts/')));
  if (!valider(manifeste)) {
    // Les noms de permissions ont leur propre contrôle, plus précis (préfixe attendu) : voir references().
    const utiles = valider.errors.filter((e) => e.keyword !== 'if' && e.propertyName === undefined
      && !(e.keyword === 'propertyNames' && e.instancePath === '/permissions'));
    erreurs.push(...new Set(utiles.map(messageSchema)));
  }
  references(manifeste, scripts, erreurs, avertissements);
  traductionsManquantes(manifeste, avertissements);
  return { manifeste, erreurs: [...new Set(erreurs)], avertissements };
}

/** Ce que le schéma ne peut pas dire : préfixes, références entre clés, syntaxe des scripts et des règles. */
function references(m, scripts, erreurs, avertissements) {
  const id = typeof m.id === 'string' ? m.id : '';
  if (RESERVES.includes(id)) {
    erreurs.push(`id : identifiant réservé (« ${id} »).`);
  }
  compatibilite(m.compatibilite?.polymorph, erreurs);

  const permissions = objet(m.permissions);
  for (const nom of Object.keys(permissions)) {
    if (!nom.startsWith(`${id}.`)) {
      erreurs.push(`permissions.${nom} : une permission s’écrit « ${id}.action ».`);
    }
  }
  for (const [role, liste] of Object.entries(objet(m.roles))) {
    for (const permission of tableau(liste)) {
      if (typeof permission === 'string' && !(permission in permissions)) {
        erreurs.push(`roles.${role} : la permission « ${permission} » n’est pas déclarée par l’extension.`);
      }
    }
  }

  const entites = new Map();
  tableau(m.entites).forEach((e, i) => {
    const chemin = `entites[${i}]`;
    if (!e || typeof e !== 'object') return;
    if (entites.has(e.code)) erreurs.push(`${chemin}.code : « ${e.code} » est déjà utilisé.`);
    entites.set(e.code, e);
    for (const droit of ['voir', 'gerer']) {
      const permission = e.permissions?.[droit];
      if (typeof permission !== 'string' || !(permission in permissions)) {
        erreurs.push(`${chemin}.permissions.${droit} : la permission « ${permission ?? ''} » n’est pas déclarée par l’extension.`);
      }
    }
    const codes = new Set();
    tableau(e.champs).forEach((c, j) => {
      const cheminChamp = `${chemin}.champs[${j}]`;
      if (!c || typeof c !== 'object') return;
      if (codes.has(c.code)) erreurs.push(`${cheminChamp}.code : « ${c.code} » est déjà utilisé.`);
      codes.add(c.code);
      if (c.type === 'LISTE' && Array.isArray(c.options) && new Set(c.options).size !== c.options.length) {
        erreurs.push(`${cheminChamp}.options : au moins un élément, sans doublon.`);
      }
      for (const regle of ['visible_si', 'obligatoire_si', 'valeur_defaut']) {
        const erreur = typeof c[regle] === 'string' && c[regle].trim() !== '' ? syntaxe(c[regle]) : null;
        if (erreur) erreurs.push(`${cheminChamp}.${regle} : syntaxe KodiScript invalide (${erreur}).`);
      }
    });
  });

  const utilises = new Set();
  tableau(m.hooks).forEach((h, i) => {
    const fichier = h?.script;
    if (typeof fichier !== 'string') return;
    utilises.add(fichier);
    const script = scripts.get(fichier);
    if (script === undefined) {
      erreurs.push(`hooks[${i}].script : fichier absent de l’archive (« ${fichier} »).`);
    } else if (script.length > LIMITES.script) {
      erreurs.push(`hooks[${i}].script : ${LIMITES.script} caractères au plus.`);
    } else {
      const erreur = syntaxe(script);
      if (erreur) erreurs.push(`${fichier} : syntaxe KodiScript invalide (${erreur}).`);
    }
  });
  for (const fichier of scripts.keys()) {
    if (!utilises.has(fichier)) avertissements.push(`${fichier} : script attaché à aucun hook.`);
  }

  tableau(m.application?.ecrans).forEach((e, i) => {
    if (e && typeof e.entite === 'string' && !entites.has(e.entite)) {
      erreurs.push(`application.ecrans[${i}].entite : l’entité « ${e.entite} » n’existe pas dans l’extension.`);
    }
  });
  tableau(m.emplacements).forEach((e, i) => {
    if (!e || !(e.emplacement in EMPLACEMENTS)) return;
    const entite = entites.get(e.entite);
    if (!entite) {
      erreurs.push(`emplacements[${i}].entite : l’entité « ${e.entite} » n’existe pas dans l’extension.`);
    } else if ((entite.rattachement ?? null) !== EMPLACEMENTS[e.emplacement]) {
      erreurs.push(`emplacements[${i}] : cet emplacement n’accepte qu’une entité rattachée à ${EMPLACEMENTS[e.emplacement]}.`);
    }
  });
}

function compatibilite(contrainte, erreurs) {
  const p = typeof contrainte === 'string' ? contrainte.match(/^(\^|>=)(\d+)\.(\d+)(?:\.(\d+))?$/) : null;
  if (!p) return; // le schéma signale déjà le format
  const produit = VERSION_PRODUIT.split('.').map(Number);
  const minimum = [Number(p[2]), Number(p[3]), Number(p[4] ?? 0)];
  const ecart = produit.map((n, i) => n - minimum[i]).find((d) => d !== 0) ?? 0;
  if (ecart < 0 || (p[1] === '^' && produit[0] !== minimum[0])) {
    erreurs.push(`compatibilite.polymorph : extension prévue pour la version ${contrainte} du produit, ces contrats décrivent la version ${VERSION_PRODUIT}.`);
  }
}

/**
 * Les textes traduits à l'affichage qui n'ont pas de traduction arabe ou anglaise : un avertissement par langue.
 * Les options d'une liste sont des valeurs enregistrées : elles ne se traduisent pas.
 */
function traductionsManquantes(m, avertissements) {
  const textes = new Set([m.nom, m.description, ...Object.values(objet(m.permissions)), m.application?.nom, m.application?.court]);
  for (const e of tableau(m.entites)) {
    textes.add(e?.nom);
    textes.add(e?.nom_pluriel);
    for (const c of tableau(e?.champs)) {
      textes.add(c?.libelle);
      textes.add(c?.aide);
    }
  }
  for (const h of tableau(m.hooks)) textes.add(h?.nom);
  for (const e of tableau(m.application?.ecrans)) textes.add(e?.libelle);
  const aTraduire = [...textes].filter((t) => typeof t === 'string' && t.trim() !== '');
  for (const [langue, nom] of [['ar', 'arabe'], ['en', 'anglais']]) {
    const traduits = objet(objet(m.traductions)[langue]);
    const manquants = aTraduire.filter((t) => !(t in traduits));
    if (manquants.length > 0) {
      avertissements.push(`traductions.${langue} : ${manquants.length} texte(s) sans traduction en ${nom}, affiché(s) en français (« ${manquants[0]} »${manquants.length > 1 ? '…' : ''}).`);
    }
  }
}

/** Erreur de syntaxe KodiScript, ou null. */
export function syntaxe(source) {
  try {
    new Parser(new Lexer(source).tokenize()).parse();
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

const TYPES = { object: 'un objet', array: 'une liste', string: 'un texte', integer: 'un entier', number: 'un nombre', boolean: 'vrai ou faux' };

export function messageSchema(e) {
  const chemin = e.instancePath === ''
    ? 'polymorph.json'
    : e.instancePath.slice(1).split('/').map((s, i) => (/^\d+$/.test(s) ? `[${s}]` : `${i ? '.' : ''}${s.replaceAll('~1', '/').replaceAll('~0', '~')}`)).join('');
  const p = e.params;
  switch (e.keyword) {
    case 'required': return `${chemin} : la clé « ${p.missingProperty} » est obligatoire.`;
    case 'additionalProperties': return `${chemin} : clé non prévue (« ${p.additionalProperty} »).`;
    case 'enum': return `${chemin} : valeur non reconnue (permises : ${p.allowedValues.join(', ')}).`;
    case 'const': return `${chemin} : doit valoir ${JSON.stringify(p.allowedValue)}.`;
    case 'pattern': return `${chemin} : format invalide.`;
    case 'type': return `${chemin} : doit être ${TYPES[p.type] ?? p.type}.`;
    case 'maxItems': return `${chemin} : ${p.limit} élément(s) au plus.`;
    case 'minItems': return `${chemin} : au moins ${p.limit} élément(s).`;
    case 'maxLength': return `${chemin} : ${p.limit} caractère(s) au plus.`;
    case 'minLength': return `${chemin} : texte requis.`;
    case 'maxProperties': return `${chemin} : ${p.limit} entrée(s) au plus.`;
    case 'minimum': case 'maximum': return `${chemin} : valeur ${e.keyword === 'minimum' ? '≥' : '≤'} ${p.limit} attendue.`;
    case 'uniqueItems': return `${chemin} : sans doublon.`;
    case 'propertyNames': return `${chemin}.${p.propertyName} : nom de clé invalide.`;
    default: return `${chemin} : ${e.message}.`;
  }
}

const objet = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const tableau = (v) => (Array.isArray(v) ? v : []);

/* ---------------------------------------------------------------- Archive */

/** Archive .poly reproductible : mêmes fichiers, même archive, même empreinte. */
export function archiver(fichiers) {
  const date = new Date('2026-01-01T00:00:00Z');
  const entrees = Object.fromEntries([...fichiers].sort(([a], [b]) => a.localeCompare(b)).map(([nom, contenu]) => [nom, [new Uint8Array(contenu), { mtime: date }]]));
  return Buffer.from(zipSync(entrees, { level: 9 }));
}

export const empreinte = (donnees) => createHash('sha256').update(donnees).digest('hex');

/* ---------------------------------------------------------------- Commandes */

function rapport({ erreurs, avertissements }, ignores = []) {
  for (const f of ignores) console.log(`  · ignoré : ${f} (seuls polymorph.json, README.md et scripts/*.kodi entrent dans l’archive)`);
  for (const a of avertissements) console.log(`  ⚠ ${a}`);
  for (const e of erreurs) console.log(`  ✗ ${e}`);
}

/** Context of the native-extension checks: product version, reserved identifiers, schema messages. */
const NATIVE_CONTEXT = {
  productVersion: VERSION_PRODUIT,
  reserved: [...RESERVES, 'native-extensions'],
  schemaMessage: messageSchema,
};

/** Files of a native extension (folder or archive), or null when the target is not one. */
function readNative(path) {
  if (statSync(path).isDirectory()) {
    const manifestFile = join(path, MANIFESTE);
    const raw = existsSync(manifestFile) ? readFileSync(manifestFile, 'utf8') : '';
    try {
      return isNative(JSON.parse(raw)) ? { files: readNativeDirectory(path), errors: [] } : null;
    } catch {
      return null;
    }
  }
  const data = readFileSync(path);
  let entries;
  try {
    entries = unzipSync(new Uint8Array(data));
  } catch {
    return null;
  }
  let manifest = null;
  try {
    manifest = JSON.parse(Buffer.from(entries[MANIFESTE] ?? []).toString('utf8'));
  } catch {
    /* unreadable manifest: the declarative check reports it */
  }
  if (!isNative(manifest)) return null;
  const files = new Map(Object.entries(entries).filter(([name]) => !name.endsWith('/')).map(([name, c]) => [name, Buffer.from(c)]));
  return { files, errors: data.length > NATIVE_LIMITS.archive ? ['L’archive dépasse 20 Mo.'] : [] };
}

/** Report of a native check, in the same shape as the declarative one. */
const nativeReport = ({ errors, warnings }) => rapport({ erreurs: errors, avertissements: warnings });

function verifier(cible) {
  const chemin = resolve(cible);
  const native = readNative(chemin);
  if (native) {
    const result = checkNative(native.files, NATIVE_CONTEXT);
    result.errors.unshift(...native.errors);
    console.log(`${result.manifest?.id ?? cible} ${result.manifest?.version ?? ''} (native) — contrats de Polymorph ${VERSION_PRODUIT}`);
    nativeReport(result);
    if (result.errors.length > 0) {
      console.log(`✗ ${result.errors.length} erreur(s) à corriger avant de livrer l’extension.`);
      return 1;
    }
    console.log('✓ Extension native valide.');
    return 0;
  }
  let lecture;
  if (statSync(chemin).isDirectory()) {
    lecture = { ...lireDossier(chemin), erreurs: [] };
  } else {
    const donnees = readFileSync(chemin);
    lecture = { ...lireArchive(donnees), ignores: [] };
  }
  const resultat = controler(lecture.fichiers);
  resultat.erreurs.unshift(...lecture.erreurs);
  const nom = resultat.manifeste ? `${resultat.manifeste.id ?? '?'} ${resultat.manifeste.version ?? ''}`.trim() : cible;
  console.log(`${nom} — contrats de Polymorph ${VERSION_PRODUIT}`);
  rapport(resultat, lecture.ignores);
  if (resultat.erreurs.length > 0) {
    console.log(`✗ ${resultat.erreurs.length} erreur(s) à corriger avant de livrer l’extension.`);
    return 1;
  }
  console.log('✓ Extension valide.');
  return 0;
}

function packageNative(directory, output) {
  const files = readNativeDirectory(directory);
  const result = checkNative(files, NATIVE_CONTEXT);
  console.log(`${result.manifest?.id ?? directory} (native) — contrats de Polymorph ${VERSION_PRODUIT}`);
  nativeReport(result);
  if (result.errors.length > 0) {
    console.log(`✗ ${result.errors.length} erreur(s) : archive non produite.`);
    return 1;
  }
  const archive = archiver(files);
  if (archive.length > NATIVE_LIMITS.archive) {
    console.log('✗ L’archive dépasse 20 Mo.');
    return 1;
  }
  mkdirSync(resolve(output), { recursive: true });
  const file = join(resolve(output), `${result.manifest.id}-${result.manifest.version}.poly`);
  writeFileSync(file, archive);
  console.log(`✓ ${relative(process.cwd(), file)} (${(archive.length / 1024).toFixed(1)} Ko)`);
  console.log(`  Empreinte SHA-256 : ${empreinte(archive)}`);
  return 0;
}

/** A publisher's key pair: the file stays with them, the public key goes to the platform operator. */
function generateKey(owner, output) {
  if (!owner || !output) {
    console.log('Usage : polymorph-ext key generate --owner <nom> --output <fichier>');
    return 2;
  }
  if (existsSync(output)) {
    console.log(`✗ Le fichier ${output} existe déjà.`);
    return 1;
  }
  const keys = generateKeyPair();
  writeFileSync(output, `${JSON.stringify({ format: 1, owner, ...keys }, null, 4)}\n`, { mode: 0o600 });
  chmodSync(output, 0o600);
  console.log(`✓ Paire de clés écrite dans ${output} : gardez ce fichier secret.`);
  console.log(`  Clé publique, à transmettre à l’exploitant de la plateforme : ${keys.public_key}`);
  console.log(`  Empreinte : ${fingerprint(keys.public_key)}`);
  return 0;
}

/** Signs a native extension folder, as « php artisan extension:sign » does: SIGNATURE covers every other file. */
function signDirectory(target, keyFile) {
  let key = null;
  try {
    key = JSON.parse(readFileSync(keyFile ?? '', 'utf8'));
  } catch {
    /* reported below */
  }
  if (typeof key?.secret_key !== 'string') {
    console.log('✗ Indiquez le fichier de la clé secrète : --key <fichier>, produit par « polymorph-ext key generate ».');
    return 2;
  }
  const directory = resolve(target);
  const files = readNativeDirectory(directory);
  files.delete(SIGNATURE_FILE);
  const errors = [...files.keys()].map(rejectionReason).filter(Boolean);
  if (!files.has(MANIFESTE)) errors.push('Le fichier polymorph.json manque à la racine.');
  if (errors.length > 0) {
    for (const e of errors) console.log(`  ✗ ${e}`);
    console.log(`✗ ${errors.length} erreur(s) : dossier non signé.`);
    return 1;
  }
  let signature;
  try {
    signature = sign(files, key.secret_key);
  } catch (e) {
    console.log(`✗ ${e.message}`);
    return 1;
  }
  writeFileSync(join(directory, SIGNATURE_FILE), signature);
  const signedBy = key.owner ?? (typeof key.public_key === 'string' ? fingerprint(key.public_key) : JSON.parse(signature).key);
  console.log(`✓ ${relative(process.cwd(), directory) || '.'} signé (${files.size} fichiers) par ${signedBy}.`);
  return 0;
}

function empaqueter(cible, sortie) {
  const dossier = resolve(cible);
  if (readNative(dossier)) return packageNative(dossier, sortie);
  const { fichiers, ignores } = lireDossier(dossier);
  const resultat = controler(fichiers);
  console.log(`${resultat.manifeste?.id ?? cible} — contrats de Polymorph ${VERSION_PRODUIT}`);
  rapport(resultat, ignores);
  if (resultat.erreurs.length > 0) {
    console.log(`✗ ${resultat.erreurs.length} erreur(s) : archive non produite.`);
    return 1;
  }
  const archive = archiver(fichiers);
  if (archive.length > LIMITES.archive) {
    console.log('✗ L’archive dépasse 1 Mo.');
    return 1;
  }
  mkdirSync(resolve(sortie), { recursive: true });
  const fichier = join(resolve(sortie), `${resultat.manifeste.id}-${resultat.manifeste.version}.poly`);
  writeFileSync(fichier, archive);
  console.log(`✓ ${relative(process.cwd(), fichier)} (${(archive.length / 1024).toFixed(1)} Ko)`);
  console.log(`  Empreinte SHA-256 : ${empreinte(archive)}`);
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [commande, cible, ...options] = process.argv.slice(2);
  const option = (nom) => (options.includes(nom) ? options[options.indexOf(nom) + 1] : undefined);
  const aide = [
    'Usage :',
    '  polymorph-ext verifier <dossier | archive.poly>',
    '  polymorph-ext empaqueter <dossier> [--sortie <dossier>]',
    '  polymorph-ext key generate --owner <nom> --output <fichier>',
    '  polymorph-ext sign <dossier> --key <fichier>',
  ].join('\n');
  const commandes = {
    verifier: () => verifier(cible),
    empaqueter: () => empaqueter(cible, option('--sortie') ?? '.'),
    key: () => (cible === 'generate' ? generateKey(option('--owner'), option('--output')) : 2),
    sign: () => signDirectory(cible, option('--key')),
  };
  const code = cible && commandes[commande] ? commandes[commande]() : 2;
  if (code === 2) console.log(aide);
  process.exit(code);
}
