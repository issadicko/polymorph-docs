---
title: Signer, livrer, déployer
description: Clés de l'éditeur, signature, archive, trousseau de la plateforme, déploiement, mise à jour et retrait d'une extension native.
---

Une extension native passe par trois mains : l'**éditeur** la signe et l'empaquette, l'**exploitant de la plateforme** la déploie, l'**administrateur de l'établissement** l'installe.

Chaque geste existe en deux outils équivalents : l'outil `polymorph-ext` de ce dépôt (Node 22, sans serveur Polymorph), et les commandes `php artisan` du produit. Ils produisent la même signature, octet pour octet.

## Éditeur : une paire de clés, une fois

```bash
node outils/polymorph-ext.mjs key generate --owner "Mon entreprise" --output ~/.polymorph/key.json
# ou : php artisan extension:key generate --owner="Mon entreprise" --output=~/.polymorph/key.json
```

Le fichier contient, en JSON, le titulaire (`owner`), la clé publique (`public_key`) et la clé **secrète** (`secret_key`), en Ed25519. Il est créé lisible par vous seul : gardez-le hors de tout dépôt de code, et sauvegardez-le. La commande affiche la **clé publique** : transmettez-la à l'exploitant de chaque plateforme qui recevra vos extensions.

## Éditeur : vérifier, signer, empaqueter

```bash
node outils/polymorph-ext.mjs verifier infirmary
node outils/polymorph-ext.mjs sign infirmary --key ~/.polymorph/key.json
node outils/polymorph-ext.mjs empaqueter infirmary --sortie dist
# ou : php artisan extension:sign ../infirmary --key=~/.polymorph/key.json
```

- `verifier` reprend les contrôles du déploiement : schéma du manifeste et clés inconnues, règles de l'archive, espace de noms, préfixes, compatibilité. Il vérifie aussi que le module de l'interface exporte `activate`.
- `sign` écrit le fichier `SIGNATURE`, `{ "format": 1, "key": …, "signature": … }` : l'empreinte de votre clé (`key`, le SHA-256 de la clé publique), et une signature Ed25519 de la liste triée « `sha256  chemin` » de tous les autres fichiers. **Signez en dernier** : toute modification d'un fichier après la signature fait refuser l'archive.
- `empaqueter` produit `dist/infirmary-1.0.0.poly`, une archive reproductible : le même dossier donne toujours la même archive et la même empreinte SHA-256.

Les fichiers cachés (`.git`, `.gitignore`…) sont laissés de côté. `vendor/` et `node_modules/` font refuser le dossier : compilez votre interface dans `ui/` et livrez seulement le résultat.

## Exploitant : le trousseau

La plateforme n'accepte que les archives signées par une clé de son trousseau :

```bash
php artisan extension:key add <clé publique> --owner="Mon entreprise"
php artisan extension:key list
php artisan extension:key revoke <empreinte>
```

Une clé **révoquée** bloque tout nouveau déploiement signé par elle, et les extensions déjà déployées avec cette clé **ne se chargent plus** : leurs écrans et leurs routes disparaissent, un avertissement est journalisé. Leurs données restent dans chaque établissement.

## Exploitant : déployer

```bash
php artisan extension:deploy infirmary-1.0.0.poly
```

Le déploiement contrôle, dans l'ordre :

1. l'archive : chemins, types de fichiers, limites (20 Mo, 50 Mo décompressée, 2 000 fichiers), aucun lien symbolique ;
2. le manifeste, comme `verifier` ;
3. la signature, contre le trousseau ;
4. la compatibilité : version du produit, de PHP, et dépendances présentes sur la plateforme ;
5. la version : seule une version plus récente remplace la version déployée ;
6. aucune extension déclarative du même identifiant dans un établissement.

Puis il copie le code et inscrit l'extension au registre de la plateforme. Elle apparaît dans Paramétrage → Modules de chaque établissement, avec son éditeur et le titulaire de la clé.

```bash
php artisan extension:deployed             # extensions déployées, version, signataire
php artisan extension:deployed --rebuild   # reconstruit le registre compilé depuis la base
```

### En développement

Pour essayer une extension sans la signer : `NATIVE_EXTENSIONS_ALLOW_UNSIGNED=true` dans `backend/.env`. Ce réglage n'a d'effet qu'avec `APP_ENV=local` ; ailleurs, une extension non signée est toujours refusée. Paramétrage → Modules l'indique « Non signée (développement) ».

## Établissement : installer

**Paramétrage → Modules → Installer.** L'installation, dans une transaction :

1. installe d'abord les dépendances absentes ;
2. passe les migrations dans le schéma de l'établissement, et vérifie le préfixe des tables créées ;
3. ajoute les permissions, et les donne aux rôles prévus ;
4. appelle `install()` de l'extension.

Une erreur à n'importe quelle étape annule tout. Ensuite, **Désactiver** masque écrans, cartes, routes et tâches, et garde les données ; **Activer** les rend.

La purge efface les données de l'extension dans un établissement : elle appelle `uninstall()`, défait les migrations et retire les permissions. Elle se fait en ligne de commande, et elle est refusée tant qu'une autre extension installée dans l'établissement dépend de celle-ci :

```bash
php artisan module purger infirmary --etablissement=<code>
```

## Mettre à jour

1. L'éditeur augmente `version`, signe et empaquette de nouveau.
2. L'exploitant déploie la nouvelle archive. La version précédente reste sur le disque, pour un retour arrière ; les plus anciennes sont supprimées.
3. Chaque établissement passe les nouvelles migrations, puis `upgrade($from)` :

```bash
php artisan etablissements:migrer
```

ou, établissement par établissement, le bouton **Mettre à jour** de Paramétrage → Modules.

L'interface est servie à une adresse qui porte la version : les navigateurs chargent la nouvelle au rechargement de la page.

## Retirer

```bash
php artisan extension:remove infirmary
```

Refusé tant qu'un établissement a l'extension installée : purgez-la d'abord dans chacun. Le retrait efface le code et l'inscription au registre.
