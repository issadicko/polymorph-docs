---
title: Versions et compatibilité
description: Numéroter les versions d'une extension, déclarer la version du produit qu'elle demande, et suivre l'évolution des contrats.
---

## La version de l'extension

`version` suit le [versionnage sémantique](https://semver.org/lang/fr/) : `MAJEURE.MINEURE.CORRECTIF`.

- **Correctif** (`1.0.1`) : un libellé corrigé, une traduction, un script réparé.
- **Mineure** (`1.1.0`) : un champ, une entité, un écran ou un script en plus.
- **Majeure** (`2.0.0`) : ce qui change le sens des données déjà saisies, comme une option de liste renommée, un champ retiré ou un type changé.

Polymorph n'accepte qu'une version plus récente que celle installée. Ne réutilisez jamais un numéro pour une archive différente.

## La version du produit

```json
"compatibilite": { "polymorph": "^1.0" }
```

| Contrainte | Signifie |
|---|---|
| `^1.0` | toute version 1.x, à partir de 1.0 |
| `^1.2` | toute version 1.x, à partir de 1.2 |
| `>=1.2` | 1.2 ou plus récente, y compris les versions majeures suivantes |

L'installation refuse une extension prévue pour une autre version majeure du produit, ou pour une version plus récente que celle de l'établissement.

**Visez la version majeure** (`^1.0`) : une extension écrite pour 1.0 fonctionne avec toutes les versions 1.x. Ne demandez `^1.2` que si vous utilisez un apport de la 1.2, par exemple un nouveau hook. Évitez `>=` : rien ne garantit que votre extension fonctionnera avec la version majeure suivante.

## Les contrats

Une extension s'appuie sur trois contrats du produit, publiés dans le dossier [`contrats`](https://github.com/issadicko/polymorph-docs/tree/main/contrats) de ce dépôt :

| Contrat | Fichier | Repère de version |
|---|---|---|
| Le manifeste | `polymorph.schema.json` | `format` (aujourd'hui 1) |
| Les hooks, leurs variables et les fonctions du produit | `hooks.json` | la version du produit |
| Le langage | — | la version de KodiScript, inscrite dans `hooks.json` |

Polymorph s'engage sur ces règles :

- **Au sein d'une version majeure, rien ne casse.** Une version mineure ajoute : un hook, une variable, un champ, une fonction, un type de champ, un emplacement, une clé facultative.
- **Ce qui doit disparaître est d'abord déprécié** : annoncé dans le journal des changements, avec sa solution de remplacement, et toujours disponible jusqu'à la version majeure suivante au moins.
- **Un nouveau format de manifeste** est accepté à côté de l'ancien pendant au moins une version majeure.

En retour, une extension doit tolérer les ajouts : un script ne doit pas dépendre de l'absence d'un champ, ni de l'ordre des clés d'un objet.

**Exception de sécurité** : une faille peut imposer de restreindre un accès dans une version mineure. Le journal des changements le signale alors.

## Suivre les changements

- Surveillez ce dépôt (« Watch » sur GitHub) : les contrats y sont mis à jour à chaque version du produit.
- Après une mise à jour du dépôt, vérifiez de nouveau vos extensions avec l'outil : il compare `compatibilite.polymorph` à la version des contrats.
