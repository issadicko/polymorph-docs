---
title: Vérifier et empaqueter
description: Contrôler une extension sans serveur Polymorph, puis produire son archive .poly.
---

Ce dépôt fournit `polymorph-ext`, un outil en ligne de commande qui contrôle une extension comme le fera l'installation, puis produit son archive. Il ne demande ni serveur Polymorph ni accès à un établissement.

## Installer l'outil

Il faut Node.js 22 ou plus récent.

```bash
git clone https://github.com/issadicko/polymorph-docs.git
cd polymorph-docs
npm install
```

## Vérifier

```bash
npm run verifier -- chemin/vers/mon-extension
npm run verifier -- chemin/vers/mon-extension-1.0.0.poly
```

L'outil accepte un dossier ou une archive. Il affiche les avertissements (`⚠`), qui n'empêchent pas l'installation, et les erreurs (`✗`), qui l'empêchent :

```
cantine 1.0.0 — contrats de Polymorph 1.0.0
  ⚠ traductions.en : 2 texte(s) sans traduction en anglais, affiché(s) en français (« Allergies »…).
  ✗ permissions.voir : une permission s’écrit « cantine.action ».
  ✗ entites[0].champs[5].visible_si : syntaxe KodiScript invalide (Unexpected token:  at line 1).
✗ 2 erreur(s) à corriger avant de livrer l’extension.
```

Chaque erreur commence par le **chemin** de la clé fautive : `entites[0].champs[5].visible_si` est la règle `visible_si` du sixième champ de la première entité.

### Ce qui est contrôlé

- **Le schéma** : clés connues, types, valeurs permises, motifs (`id`, `version`, couleurs, icônes), longueurs et nombres maximaux.
- **Les références** :
  - permissions préfixées par l'identifiant ;
  - rôles qui ne reçoivent que des permissions déclarées ;
  - entités désignées par les écrans et les cartes ;
  - rattachement attendu par chaque emplacement ;
  - fichiers des scripts ;
  - codes uniques.
- **KodiScript** : la syntaxe des règles et des scripts.
- **Compatibilité** : la contrainte `compatibilite.polymorph`, comparée à la version du produit décrite par les contrats de ce dépôt.
- **L'archive** : fichiers permis, chemins, taille, encodage UTF-8.
- **Les traductions** : les textes sans traduction, en avertissement.

## Empaqueter

```bash
npm run empaqueter -- chemin/vers/mon-extension --sortie livraisons
```

```
cantine — contrats de Polymorph 1.0.0
✓ livraisons/cantine-1.0.0.poly (1.7 Ko)
  Empreinte SHA-256 : 6c62d4a5ae15182ffc1e1d7393a9ce19ed7b388ba1c61907bfa0e2d469e09b9f
```

- L'archive est produite seulement si l'extension est valide. Elle s'appelle `<id>-<version>.poly`.
- Elle ne contient que `polymorph.json`, `README.md` et `scripts/*.kodi`. Les autres fichiers du dossier sont signalés et laissés de côté ; les fichiers cachés sont ignorés.
- Elle est **reproductible** : les mêmes fichiers donnent la même archive, donc la même empreinte. Communiquez l'empreinte avec l'archive : l'administrateur la retrouvera à l'examen et saura que le fichier n'a pas été modifié en route.

## Les règles de l'archive

| Règle | Limite |
|---|---|
| Fichiers permis | `polymorph.json` (obligatoire, à la racine), `README.md`, `scripts/<nom>.kodi` |
| Nom d'un script | minuscules, chiffres, `-` et `_`, 60 caractères au plus |
| Nombre de fichiers | 60 au plus |
| Taille de l'archive | 1 Mo au plus |
| Taille décompressée | 2 Mo au plus |
| Encodage | UTF-8 |

Une archive qui contient un dossier `backend/` ou `ui/`, ou un fichier `SIGNATURE`, est une extension native : elle déclare `"type": "native"` et suit ses propres règles. L'outil la reconnaît à son manifeste : voir [Livrer une extension native](../../natives/livrer/).

## Dans votre intégration continue

Si votre extension vit dans son propre dépôt GitHub, faites-la vérifier à chaque modification :

```yaml
# .github/workflows/extension.yml
name: Extension
on: [push, pull_request]
jobs:
  verifier:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/checkout@v4
        with:
          repository: issadicko/polymorph-docs
          path: .polymorph-docs
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
        working-directory: .polymorph-docs
      - run: node .polymorph-docs/outils/polymorph-ext.mjs empaqueter . --sortie dist
```

## L'outil et l'installation

L'outil reprend les contrôles de l'installation, mais **l'examen de l'archive par Polymorph fait foi**. Deux différences sont à connaître :

- **Identifiants réservés** : l'outil connaît ceux de la version décrite par ses contrats. Une version plus récente du produit peut en réserver d'autres.
- **Version du produit** : l'outil compare `compatibilite.polymorph` à la version de ses contrats. L'installation la compare à la version réellement installée dans l'établissement.

Gardez ce dépôt à jour (`git pull`) pour vérifier avec les contrats les plus récents.
