---
title: Les extensions déclaratives
description: Ce qu'une extension déclarative ajoute à un établissement Polymorph, comment elle s'installe, et ce qu'elle ne peut pas faire.
---

Une **extension déclarative** ajoute à un établissement Polymorph ce que le produit ne prévoit pas pour lui : une cantine, une bibliothèque, une remise propre à l'établissement, un SMS après chaque paiement. Elle **décrit** ce qu'elle apporte dans un fichier JSON ; Polymorph le dessine, le contrôle et l'exécute. Elle ne contient aucun code compilé.

N'importe quel éditeur peut en écrire une : un prestataire, l'informaticien d'un établissement, un intégrateur. L'administrateur de l'établissement l'installe lui-même, après avoir vu ce qu'elle demande.

## Ce qu'une extension apporte

| Apport | Exemple | Page |
|---|---|---|
| Des **données** : entités et champs | un abonnement à la cantine, avec sa formule et ses allergies | [Entités et champs](entites/) |
| Des **écrans** de liste et de saisie, générés | la liste des abonnés, avec recherche, ajout, modification et suppression | [Tuile, écrans et cartes](application/) |
| Une **tuile** sur l'accueil, avec son icône | « Cantine », entre les applications du produit | [Tuile, écrans et cartes](application/) |
| Des **cartes** sur les fiches | l'abonnement affiché sur la fiche d'une inscription | [Tuile, écrans et cartes](application/) |
| Des **scripts** attachés aux hooks | 10 % de remise pour une fratrie, un SMS après un paiement | [Scripts et hooks](hooks/) |
| Des **droits** et leur répartition par rôle | le secrétariat abonne, la direction consulte | [Le manifeste](manifeste/) |
| Des **traductions** en arabe et en anglais | « Cantine », « المطعم », « Canteen » | [Textes et traductions](traductions/) |

## Ce qu'une extension ne peut pas faire

Une extension s'installe sans revue de code. Ses limites rendent cette installation sûre :

- **Aucun code exécutable** hors des scripts KodiScript, qui ne voient que les variables de leur hook et quelques fonctions bornées. Pas d'accès aux fichiers, au réseau, ni à la base de données.
- **Aucun droit du produit** : ses permissions commencent toutes par son identifiant. Elle ne crée ni n'accorde une permission du cœur, comme `paiements.annuler`.
- **Aucune modification** des écrans du produit : elle ajoute des cartes aux emplacements prévus, et rien d'autre.
- **Aucune table** : ses données vivent dans le stockage prévu pour les extensions, dans l'espace de l'établissement. La désinstallation les efface sans laisser de trace.
- **Des scripts bornés** : un nombre d'opérations, une durée, un plafond de SMS. Un script en erreur ne bloque jamais le guichet.

Un besoin qui dépasse ces limites, par exemple un écran sur mesure, des tables propres ou un calcul sur toute la base, relève d'une **[extension native](../natives/)** : du code PHP et une interface, dans une archive signée.

| | Extension déclarative | Extension native | Module |
|---|---|---|---|
| Écrite par | n'importe quel éditeur | un éditeur dont la clé est de confiance | l'équipe de Polymorph |
| Contenu | un manifeste JSON et des scripts KodiScript | du code PHP, une interface JavaScript, un manifeste | du code PHP et Angular |
| Livraison | une archive `.poly`, téléversée par l'établissement | une archive `.poly` signée, déployée par l'exploitant de la plateforme | avec le produit |
| Installation | Paramétrage → Modules → Extensions | Paramétrage → Modules, comme un module | Paramétrage → Modules |
| Pouvoir | ce que le manifeste sait décrire | ses tables, son API, ses écrans, ses tâches planifiées | tout ce que fait le produit |

## L'archive `.poly`

Une extension se livre en une archive `.poly`, un zip qui contient :

```
cantine-1.0.0.poly
├── polymorph.json      le manifeste (obligatoire)
├── scripts/
│   └── controle.kodi   les scripts des hooks
└── README.md           une présentation (facultative, ignorée à l'installation)
```

Tout autre fichier est refusé. Le manifeste suit le format 1, décrit par un [schéma JSON](https://github.com/issadicko/polymorph-docs/blob/main/contrats/polymorph.schema.json) que votre éditeur de code sait lire.

## Le parcours

1. **Écrire** le manifeste et les scripts, en partant du [modèle](https://github.com/issadicko/polymorph-docs/tree/main/modele) ou d'un [exemple](exemples/).
2. **Vérifier et empaqueter** avec l'outil de ce dépôt, qui reprend les contrôles de l'installation : [Vérifier et empaqueter](verifier-empaqueter/).
3. **Livrer** l'archive à l'établissement, par le canal de votre choix.
4. **Installer** : l'administrateur la téléverse dans Paramétrage → Modules, examine ce qu'elle demande, puis l'installe. Voir [Installation et cycle de vie](installation/).

Pour une première fois, suivez [Votre première extension déclarative](premiere-extension/) : un prêt de manuels, du dossier vide à la tuile sur l'accueil.
