---
title: Erreurs courantes
description: Les messages de l'examen d'une archive et de l'outil de vérification, leur cause et leur correction.
---

Chaque erreur commence par le chemin de la clé fautive. Par exemple, `entites[0].champs[2].type` est le type du troisième champ de la première entité ; les listes se comptent à partir de 0.

## Le manifeste

| Message | Cause | Correction |
|---|---|---|
| Format de manifeste non pris en charge | `format` absent ou différent de `1` | `"format": 1` |
| `id` : format invalide | majuscule, espace, accent, ou moins de 2 caractères | minuscules, chiffres et tirets : `ma-cantine` |
| Identifiant réservé | l'`id` reprend un module ou une permission du produit, comme `paiements` | préfixez-le par votre marque : `acme-paiements` |
| `compatibilite.polymorph` : format invalide | `1.0`, `~1.0`, `1.x`… | `^1.0` ou `>=1.2` |
| Extension prévue pour la version … du produit | la contrainte exclut la version de l'établissement | visez la version majeure : `^1.0` |
| `permissions.voir` : une permission s'écrit « id.action » | permission sans le préfixe de l'extension | `"cantine.voir"` |
| `roles` : valeur non reconnue (« ADMIN ») | rôle inconnu, ou `ADMIN`, qui a déjà tout | un rôle de la liste : `DIRECTION`, `SECRETARIAT`, `CAISSE`, `RESP_PEDAGOGIQUE`, `ENSEIGNANT`, `COMPTABLE` |
| la permission « … » n'est pas déclarée par l'extension | un rôle ou une entité désigne une permission absente de `permissions` | déclarez-la, ou corrigez la faute de frappe |
| clé non prévue (« … ») | clé inconnue, souvent une faute de frappe : `entite` pour `entites` | le nom exact de la clé ; voir [Le manifeste](../manifeste/) |

## Les entités et les champs

| Message | Cause | Correction |
|---|---|---|
| `….code` : « … » est déjà utilisé | deux entités, ou deux champs d'une entité, ont le même code | des codes distincts |
| `….champs` : au moins un élément | entité sans champ | au moins un champ |
| `….type` : valeur non reconnue | type inconnu, ou en minuscules | `TEXTE`, `NOMBRE`, `DATE`, `LISTE`, `OUI_NON`, `TELEPHONE` |
| `….options` : au moins un élément, sans doublon | `LISTE` sans `options`, ou avec deux options identiques | des options distinctes |
| `….visible_si` : syntaxe KodiScript invalide | expression incomplète, `=` au lieu de `==`, guillemets manquants | `champs.etat == "Rendu"` |
| `….valeur_defaut` : syntaxe KodiScript invalide | texte écrit sans guillemets | `"valeur_defaut": "\"Tous les jours\""` |

## Les scripts

| Message | Cause | Correction |
|---|---|---|
| `hooks[0].hook` : valeur non reconnue | hook inconnu | un hook du [catalogue](../hooks/#catalogue) |
| fichier absent de l'archive | le chemin de `script` ne correspond à aucun fichier | `scripts/<nom>.kodi`, en minuscules, à l'intérieur du dossier `scripts` |
| `scripts/….kodi` : syntaxe KodiScript invalide (… at line N) | erreur de syntaxe à la ligne N | parenthèse ou accolade manquante, virgule en trop |

## L'application et les cartes

| Message | Cause | Correction |
|---|---|---|
| `application.ecrans` : au moins un élément | application sans écran | au moins un écran |
| l'entité « … » n'existe pas dans l'extension | un écran ou une carte désigne une entité absente | le `code` exact de l'entité |
| cet emplacement n'accepte qu'une entité rattachée à … | une carte de la fiche d'inscription pour une entité de l'apprenant, ou l'inverse | `fiche-inscription.cartes` pour `INSCRIPTION`, `fiche-apprenant.cartes` pour `APPRENANT` |
| `….icone` : format invalide | icône sans le préfixe `pi-` | `pi-users`, `pi-book` |
| `application.teinte.…` : format invalide | couleur courte ou nommée | `#rrggbb` : `#8cb33f` |

## L'archive

| Message | Cause | Correction |
|---|---|---|
| Le fichier polymorph.json manque à la racine | le zip contient un dossier parent | zippez le contenu du dossier, pas le dossier ; ou utilisez `npm run empaqueter` |
| Fichier non prévu dans une extension déclarative | un fichier autre que le manifeste, `README.md` et les scripts | retirez-le ; l'outil d'empaquetage le fait pour vous |
| Cette archive contient du code ou une signature | dossier `backend/` ou `ui/`, ou fichier `SIGNATURE` | une extension déclarative ne contient pas de code |
| polymorph.json n'est pas un JSON valide | virgule en trop, guillemets typographiques, commentaire | un éditeur qui valide le JSON, avec le `$schema` |
| L'archive a changé depuis son examen | le fichier a été remplacé entre l'examen et l'installation | examinez la nouvelle archive |
| La version … est déjà installée | même version, ou plus ancienne, que celle de l'établissement | augmentez `version` |
