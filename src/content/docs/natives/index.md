---
title: Les extensions natives
description: Ce qu'une extension native ajoute à Polymorph, comment elle passe de l'éditeur à l'établissement, et pourquoi elle est signée.
---

Une **extension native** apporte du code à Polymorph : du PHP qui s'exécute dans le serveur, et une interface qui s'exécute dans le navigateur. Elle va donc plus loin qu'une [extension déclarative](../extensions/) : ses propres tables, son API, ses écrans, ses cartes sur les fiches, ses tâches planifiées, ses commandes, ses sources de rapports.

Son architecture reprend ce qui marche dans les deux systèmes d'extension les plus éprouvés :

- d'**Odoo**, le code disponible sur le serveur et installé base par base, les dépendances installées dans l'ordre, la mise à jour par version, les sources de rapports ;
- de **WordPress**, les hooks, le cycle de vie complet (activation, désactivation, désinstallation), les tâches planifiées, les commandes, les fonctions du cœur offertes aux extensions.

Elle en écarte trois défauts : le code non signé, l'héritage d'écrans par XPath (il casse à chaque refonte), et l'absence d'espace de noms.

## Ce qu'une extension native apporte

| Apport | Exemple (extension Infirmerie) | Page |
|---|---|---|
| Des **tables** propres, préfixées | `infirmary_visits`, `infirmary_reasons` | [Le code serveur](serveur/) |
| Une **API** sous `/api/v1/modules/<id>/` | `GET /api/v1/modules/infirmary/visits` | [Le code serveur](serveur/) |
| Des **écrans** libres, sous `/modules/<id>/` | la liste des visites et leur saisie | [L'interface et le SDK](interface/) |
| Des **cartes** dans les fiches du produit | les visites d'un apprenant, sur sa fiche | [L'interface et le SDK](interface/) |
| Une **tuile** sur l'accueil | « Infirmerie », avec sa croix rouge | [Le manifeste natif](manifeste/) |
| Des **tâches planifiées**, par établissement | chaque soir, les visites sans parent prévenu | [Le code serveur](serveur/) |
| Des **commandes** artisan | `php artisan infirmary:summary` | [Le code serveur](serveur/) |
| Des **sources de rapports** personnalisés | « Visites à l'infirmerie » | [Le code serveur](serveur/) |
| Des **écouteurs** et des relations ajoutées au cœur | `$learner->infirmaryVisits` | [Le code serveur](serveur/) |
| Des **droits**, des **dépendances**, des **traductions** | le secrétariat saisit, la direction consulte | [Le manifeste natif](manifeste/) |

## Native ou déclarative ?

L'extension native est la voie complète : elle fait tout ce que fait un module du produit. Pour un besoin plus simple (des données, des écrans de saisie générés, des cartes sur les fiches, des scripts sur les hooks), une [extension déclarative](../extensions/) suffit. Elle ne contient aucun code compilé, et l'administrateur de l'établissement l'installe lui-même, sans passer par l'exploitant de la plateforme.

| | Extension native | Extension déclarative |
|---|---|---|
| Écrite par | un éditeur dont la clé est de confiance | n'importe quel éditeur |
| Contenu | du code PHP, une interface JavaScript, un manifeste | un manifeste JSON et des scripts KodiScript |
| Livraison | une archive `.poly` signée, déployée par l'exploitant de la plateforme | une archive `.poly`, téléversée par l'établissement |
| Installation | Paramétrage → Modules, comme un module | Paramétrage → Modules → Extensions |
| Pouvoir | ses tables, son API, ses écrans, ses tâches planifiées | ce que le manifeste sait décrire |

## Deux niveaux : la plateforme, puis l'établissement

Une plateforme Polymorph héberge plusieurs établissements, chacun dans son propre schéma de base de données. Une extension native passe par deux gestes, faits par deux personnes :

| | Plateforme | Établissement |
|---|---|---|
| Qui | l'exploitant de la plateforme | l'administrateur de l'établissement |
| Geste | **déployer** le code : `php artisan extension:deploy infirmary-1.0.0.poly` | **installer** l'extension, comme un module : Paramétrage → Modules |
| Effet | contrôle de la signature et de l'archive, copie du code | tables dans le schéma de l'établissement, droits, rôles, activation |
| Annulation | `php artisan extension:remove`, quand plus aucun établissement ne l'utilise | désactiver (les données restent), purger (en ligne de commande) |

Une fois déployée, l'extension **est un module** : elle apparaît dans Paramétrage → Modules à côté de Transport, avec son éditeur et le titulaire de la clé qui l'a signée.

## Pourquoi une signature

Le code d'une extension native s'exécute avec tous les droits du serveur : il peut lire toute la base, y compris des données de mineurs et la finance. La signature n'isole pas ce code ; elle **identifie qui en répond**.

- L'éditeur signe son dossier avec sa clé secrète (Ed25519). La signature couvre chaque fichier : une archive modifiée après signature est refusée.
- L'exploitant de la plateforme tient un **trousseau** de clés de confiance, avec leur titulaire. Il n'accepte que les archives signées par l'une d'elles.
- Une clé **révoquée** bloque tout nouveau déploiement, et les extensions qu'elle a signées ne se chargent plus.
- En développement seulement, une extension non signée peut être acceptée.

Le détail : [Signer, livrer, déployer](livrer/).

## Les règles imposées

Elles rendent une extension sûre à côtoyer, pour le cœur comme pour les autres extensions :

- un **espace de noms PHP** imposé : `PolymorphExt\Infirmary\` ;
- des **tables préfixées** par l'identifiant (`infirmary_…`) : l'installation compare les tables avant et après, et annule tout si une table n'a pas le préfixe ;
- des **migrations** dont le nom contient l'identifiant ;
- des **permissions**, des **sources de rapports** et des **éléments d'interface** préfixés eux aussi ;
- **aucune dépendance embarquée** : ni `vendor/` ni `node_modules/`. Une extension utilise les bibliothèques du produit ;
- du **PHP seulement dans `backend/`**, et dans `ui/` des fichiers statiques seulement.

## L'archive

```
infirmary-1.0.0.poly
├── polymorph.json          le manifeste ("type": "native")
├── backend/
│   ├── src/Extension.php   PolymorphExt\Infirmary\Extension
│   ├── database/migrations/
│   ├── routes/api.php      routes sous /api/v1/modules/infirmary
│   └── lang/ar.json, en.json
├── ui/
│   └── index.js            module ES : export function activate(polymorph) { … }
├── README.md, LICENSE, CHANGELOG.md
└── SIGNATURE               signature Ed25519 de chaque fichier
```

Limites : 20 Mo pour l'archive, 50 Mo décompressée, 2 000 fichiers.

L'exemple complet est dans [`exemples/native/infirmary`](https://github.com/issadicko/polymorph-docs/tree/main/exemples/native/infirmary). Le guide [Votre première extension native](premiere-extension/) le construit pas à pas.
