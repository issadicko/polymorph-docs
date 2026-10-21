// Tests de l'outil : les exemples passent, les erreurs courantes sont refusées comme à l'installation.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { archiver, controler, lireArchive, lireDossier } from './polymorph-ext.mjs';

const EXEMPLES = new URL('../exemples/', import.meta.url).pathname;
const MODELE = new URL('../modele/', import.meta.url).pathname;

const fichiersDe = (manifeste, scripts = {}) =>
  new Map([['polymorph.json', Buffer.from(JSON.stringify(manifeste))], ...Object.entries(scripts).map(([n, s]) => [n, Buffer.from(s)])]);
const cantine = () => JSON.parse(readFileSync(join(EXEMPLES, 'cantine/polymorph.json'), 'utf8'));

for (const dossier of [...readdirSync(EXEMPLES).filter((d) => d !== 'native').map((d) => join(EXEMPLES, d)), MODELE]) {
  test(`${dossier.split('/').filter(Boolean).pop()} est valide, en dossier comme en archive`, () => {
    const { fichiers } = lireDossier(dossier);
    assert.deepEqual(controler(fichiers).erreurs, []);
    const archive = lireArchive(archiver(fichiers));
    assert.deepEqual(archive.erreurs, []);
    assert.deepEqual(controler(archive.fichiers).erreurs, []);
  });
}

const CAS = {
  'format inconnu': (m) => ({ ...m, format: 2 }),
  'identifiant invalide': (m) => ({ ...m, id: 'Cantine' }),
  'identifiant réservé': (m) => ({ ...m, id: 'paiements' }),
  'permission sans préfixe': (m) => ({ ...m, permissions: { ...m.permissions, voir: 'Voir' } }),
  'permission d’une autre extension': (m) => ({ ...m, permissions: { ...m.permissions, 'autre.voir': 'Voir' } }),
  'rôle inconnu': (m) => ({ ...m, roles: { ADMIN: ['cantine.voir'] } }),
  'rôle avec une permission non déclarée': (m) => ({ ...m, roles: { DIRECTION: ['cantine.supprimer'] } }),
  'type de champ inconnu': (m) => { m.entites[0].champs[0].type = 'COULEUR'; return m; },
  'liste sans options': (m) => { m.entites[0].champs.push({ code: 'menu', libelle: 'Menu', type: 'LISTE' }); return m; },
  'champ en double': (m) => { m.entites[0].champs.push({ ...m.entites[0].champs[0] }); return m; },
  'règle mal écrite': (m) => { m.entites[0].champs[4].visible_si = 'champs.allergies !='; return m; },
  'hook inconnu': (m) => ({ ...m, hooks: [{ hook: 'apprenant.supprime', nom: 'X', script: 'scripts/x.kodi' }] }),
  'script absent': (m) => ({ ...m, hooks: [{ hook: 'paiement.enregistre', nom: 'X', script: 'scripts/absent.kodi' }] }),
  'écran sur une entité inconnue': (m) => { m.application.ecrans[0].entite = 'repas'; return m; },
  'emplacement inconnu': (m) => ({ ...m, emplacements: [{ emplacement: 'tableau-de-bord.aujourdhui', entite: 'abonnement' }] }),
  'emplacement de la fiche apprenant pour une entité d’inscription': (m) => ({ ...m, emplacements: [{ emplacement: 'fiche-apprenant.cartes', entite: 'abonnement' }] }),
  'version majeure du produit différente': (m) => ({ ...m, compatibilite: { polymorph: '^2.0' } }),
  'clé inconnue': (m) => ({ ...m, ecrans: [] }),
};
for (const [cas, modifier] of Object.entries(CAS)) {
  test(`refuse : ${cas}`, () => {
    assert.notDeepEqual(controler(fichiersDe(modifier(cantine()))).erreurs, [], `l’outil accepte : ${cas}`);
  });
}

test('refuse un script mal écrit et signale le fichier', () => {
  const m = { ...cantine(), hooks: [{ hook: 'paiement.enregistre', nom: 'X', script: 'scripts/x.kodi' }] };
  const { erreurs } = controler(fichiersDe(m, { 'scripts/x.kodi': 'if (paiement.montant > { print("x") }' }));
  assert.ok(erreurs.some((e) => e.startsWith('scripts/x.kodi : syntaxe KodiScript invalide')), erreurs.join('\n'));
});

test('refuse une archive qui contient du code (extension native)', () => {
  const fichiers = fichiersDe(cantine(), { 'backend/Fournisseur.php': '<?php' });
  assert.match(lireArchive(archiver(fichiers)).erreurs[0], /extension native/);
});

test('refuse un fichier non prévu dans l’archive', () => {
  const fichiers = fichiersDe(cantine(), { 'notes.txt': 'x' });
  assert.match(lireArchive(archiver(fichiers)).erreurs[0], /Fichier non prévu/);
});

test('avertit des textes sans traduction, sans bloquer', () => {
  const m = cantine();
  delete m.traductions;
  const { erreurs, avertissements } = controler(fichiersDe(m));
  assert.deepEqual(erreurs, []);
  assert.equal(avertissements.filter((a) => a.startsWith('traductions.')).length, 2);
});

test('produit une archive reproductible', () => {
  const { fichiers } = lireDossier(join(EXEMPLES, 'cantine'));
  assert.deepEqual(archiver(fichiers), archiver(fichiers));
});
