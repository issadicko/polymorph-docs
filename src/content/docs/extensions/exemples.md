---
title: Exemples
description: Quatre extensions complètes, vérifiées avec les contrats de Polymorph, à copier et adapter.
---

Les exemples sont dans le dossier [`exemples`](https://github.com/issadicko/polymorph-docs/tree/main/exemples) du dépôt. Chacun est vérifié à chaque modification de ce dépôt, et l'empaquetage d'un exemple donne une archive installable telle quelle.

```bash
npm run empaqueter -- exemples/cantine --sortie livraisons
```

## Cantine

[`exemples/cantine`](https://github.com/issadicko/polymorph-docs/tree/main/exemples/cantine) — l'abonnement des apprenants à la cantine : formule, jours, régime et allergies.

- Une entité rattachée à l'**inscription**, `unique` : un abonnement par inscription.
- Des règles : le contact d'urgence n'apparaît, et n'est exigé, qu'en cas d'allergie grave.
- Une valeur par défaut, une tuile avec un pictogramme dessiné, une carte sur la fiche d'inscription.
- Des traductions arabes et anglaises.

## Bibliothèque

[`exemples/bibliotheque`](https://github.com/issadicko/polymorph-docs/tree/main/exemples/bibliotheque) — le prêt de manuels aux apprenants, construit pas à pas dans [Votre première extension](../premiere-extension/).

- Une entité rattachée à l'**apprenant**, sans limite de nombre.
- Un état (« Prêté », « Rendu », « Perdu ») qui fait apparaître la date de retour ou les observations.
- Une carte sur la fiche de l'apprenant, des droits pour trois rôles.

## Remise fratrie

[`exemples/remise-fratrie`](https://github.com/issadicko/polymorph-docs/tree/main/exemples/remise-fratrie) — 10 % de remise sur le tarif quand un frère ou une sœur suit déjà une formation.

- Une extension **sans données ni écran** : un seul script, sur le filtre `tarif.resoudre`.
- `inscriptionsActives` retrouve les inscriptions des apprenants joignables au numéro du tuteur principal.

## SMS de paiement

[`exemples/sms-paiement`](https://github.com/issadicko/polymorph-docs/tree/main/exemples/sms-paiement) — après chaque paiement, un SMS confirme le montant reçu et le reste à payer.

- Un script sur l'action `paiement.enregistre`, avec `envoyerSms` et `montant`.
- `print` laisse une trace dans le journal quand aucun numéro n'est connu.

## Le modèle

[`modele`](https://github.com/issadicko/polymorph-docs/tree/main/modele) est un point de départ vide : une entité, un écran, des droits. Copiez-le, remplacez `mon-extension` par votre identifiant, et suivez [Votre première extension](../premiere-extension/).
