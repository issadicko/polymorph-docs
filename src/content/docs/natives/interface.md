---
title: L'interface et le SDK
description: Écrans et cartes d'une extension native en éléments personnalisés, le SDK version 1 et les classes pm-* du produit.
---

L'interface d'une extension native est un **module ES** (`ui/index.js`) qui définit des **éléments personnalisés** (*custom elements*, un standard du navigateur). Polymorph le charge à la demande, depuis son API, sur la même origine que l'application.

Ce choix a trois raisons :

- **aucun couplage de versions** : l'interface ne dépend pas de la version d'Angular ni de PrimeNG du produit. Une mise à jour majeure du produit ne force pas à recompiler l'extension ;
- **n'importe quel outil** : JavaScript sans compilation, Lit, Svelte, Angular Elements… Livrez le résultat compilé dans `ui/` ;
- **un contrat petit et stable**, versionné : le SDK.

## Activer l'interface

Le module exporte une fonction `activate(polymorph)`. Polymorph l'appelle une fois, quand l'extension est active dans l'établissement, avec le SDK :

```js
export function activate(polymorph) {
  customElements.define('infirmary-visits', Visits);
  customElements.define('infirmary-visit', Visit);
  customElements.define('infirmary-card', Card);

  polymorph.screen('', 'infirmary-visits');          // /modules/infirmary
  polymorph.screen('visits/:id', 'infirmary-visit'); // /modules/infirmary/visits/12
  polymorph.slot('fiche-apprenant.cartes', 'infirmary-card', { permission: 'infirmary.view' });
}
```

Le nom de chaque élément commence par l'identifiant de l'extension suivi d'un tiret (`infirmary-…`) : deux extensions ne peuvent pas se gêner. `polymorph-ext verifier` refuse un module qui n'exporte pas `activate`.

## Ce que reçoit un élément

Polymorph crée l'élément, puis pose deux propriétés **dans cet ordre** avant de l'insérer :

1. `context` :
   - sur un **écran** : `{ params, query }`, les paramètres du chemin (`visits/:id` donne `{ id: '12' }`) et ceux de l'adresse (`?from=2026-01-01`) ;
   - dans un **emplacement** : le contexte de l'écran du produit, `{ apprenant }` sur la fiche apprenant, `{ inscription }` sur la fiche inscription.
2. `polymorph` : le SDK.

Un élément qui démarre à la réception du SDK trouve donc déjà son contexte. Quand seul le contexte change (un autre apprenant, un autre paramètre), l'élément reste en place et reçoit le nouveau contexte : écrivez un accesseur `set context(c)` si l'élément doit se redessiner.

```js
class Card extends HTMLElement {
  set context(c) { this._context = c; if (this.sdk) this.render(); }
  get context() { return this._context; }
  set polymorph(sdk) { this.sdk = sdk; this.render(); }

  async render() {
    const d = await this.sdk.api.get(`learners/${this.context.apprenant.id}`);
    this.innerHTML = `<section class="pm-card"><h2 class="pm-card-title">${this.sdk.t('Infirmerie')}</h2>…</section>`;
  }
}
```

## Le SDK, version 1

Le SDK est figé : une extension ne peut pas le modifier pour une autre. Une version 1.x ne fait qu'ajouter des membres ; la version actuelle est la 1.1.0. Une interface qui utilise `setting` demande `"sdk": "^1.1"` dans le manifeste.

| Membre | Rôle |
|---|---|
| `version` | version du SDK, `1.1.0` |
| `extension` | `{ id, version }` de l'extension |
| `api.get(path, params?)`, `api.post(path, body?)`, `api.put(…)`, `api.delete(path)` | appels à l'API avec la session de l'utilisateur. `path` relatif à `/api/v1/modules/<id>/`, ou absolu sous `/api/v1/` (`/api/v1/apprenants/recherche`) ; toute autre adresse est refusée |
| `user` | l'utilisateur connecté : `{ id, name, email, roles }` |
| `can(permission)` | vrai si l'utilisateur a la permission (`a\|b` : l'une ou l'autre) |
| `setting(code)` | depuis 1.1.0 : la valeur d'un réglage de l'extension marqué `ui`, saisie par l'établissement, ou sa valeur par défaut ; `null` pour un autre code ([les réglages](../manifeste/#réglages)) |
| `locale`, `direction` | `fr`, `ar` ou `en` ; `ltr` ou `rtl` |
| `t(text, values?)` | le texte traduit par l'extension (traductions du manifeste), `:nom` remplacé par `values.nom` |
| `navigate(link)` | lien absolu (`/apprenants/12`) ou relatif aux écrans de l'extension (`reasons`) |
| `notify(message, severity?)` | message éphémère : `success`, `info` (par défaut), `warning` ou `error` |
| `confirm(message, options?)` | la confirmation du produit ; `options` : `title`, `acceptLabel` (libellé du bouton), `danger`. Renvoie une promesse de booléen |
| `title(text)` | titre de l'onglet du navigateur pour l'écran affiché |
| `amount(value, withCurrency?)` | `15000` → « 15 000 FCFA », dans la devise de l'établissement ; `withCurrency` à `false` : le nombre seul |
| `date(value, format?)` | une date (`AAAA-MM-JJ`) ou une date et heure (ISO 8601), au format `short` (par défaut), `long` ou `time` |
| `screen(path, element)` | inscrit un écran sous `/modules/<id>/` |
| `slot(name, element, options?)` | inscrit une contribution à un emplacement ; `options` : `permission`, `order` |

### Les erreurs de l'API

Une erreur rejette la promesse avec une erreur `ApiError` : `{ message, status, errors }`. Le produit affiche déjà la notification ; l'élément n'a qu'à montrer les erreurs de saisie, champ par champ :

```js
try {
  await this.sdk.api.post('visits', data);
} catch (error) {
  this.errors = error.errors; // { reason: ['Le champ motif est obligatoire.'] }
  this.render();
}
```

## Les emplacements

| Emplacement | Contexte | Disposition |
|---|---|---|
| `fiche-apprenant.cartes` | `{ apprenant }` | cartes de la fiche apprenant |
| `fiche-inscription.cartes` | `{ inscription }` | cartes de la fiche inscription |
| `fiche-inscription.actions` | `{ inscription }` | boutons d'action de la fiche inscription |
| `fiche-demande.cartes` | `{ demande }` | cartes du volet d'une demande d'inscription en ligne |
| `class.timetable` | `{ classe }` | boutons au-dessus de l'emploi du temps d'une classe |
| `payment.cards` | `{ paiement }` | cartes sous le détail d'un paiement |
| `cash-closure.actions` | `{ arrete }` | boutons dans la ligne d'un arrêté de caisse |
| `header.actions` | `{}` | boutons ronds de 44 px dans l'en-tête, avant la cloche |
| `tableau-de-bord.aujourdhui` | `{}` | cartes du tableau de bord du jour |
| `parametrage.sections` | `{}` | sections du Paramétrage |

Une contribution n'apparaît que si l'extension est active et si l'utilisateur a la `permission` demandée. Elle se range par `order` : 0 pour les modules du produit, 50 par défaut pour une extension native, 100 pour les cartes des extensions déclaratives.

Le contexte est en lecture seule : une contribution charge et enregistre ses propres données par l'API de son extension.

## L'apparence : les classes `pm-*`

Les éléments s'affichent dans la page, sans *shadow DOM* imposé. Ils héritent de la police et des couleurs du produit, en clair, en sombre et de droite à gauche. Les classes `pm-*` leur donnent les dimensions et l'allure des écrans du produit ; elles font partie du contrat du SDK.

| Classes | Pour |
|---|---|
| `pm-screen`, `pm-header`, `pm-title`, `pm-subtitle` (depuis 1.1.0), `pm-toolbar`, `pm-end` | la mise en page d'un écran : en-tête avec titre, sous-titre et actions, barre de boutons |
| `pm-card`, `pm-card-title` | une carte, comme celles des fiches |
| `pm-grid`, `pm-full` | une grille de formulaire, un champ sur toute la largeur |
| `pm-field`, `pm-inline` | un libellé et son champ natif (`input`, `select`, `textarea`), aux dimensions du produit |
| `pm-input` | un champ seul, hors de `pm-field` |
| `pm-checkbox` | une case à cocher et son libellé |
| `pm-error` | le message d'erreur d'un champ |
| `pm-button`, `pm-secondary`, `pm-danger`, `pm-text`, `pm-small` | les boutons et leurs variantes |
| `pm-table`, `pm-actions` | un tableau, la colonne des actions |
| `pm-list` | une liste à lignes séparées |
| `pm-badge`, `pm-success`, `pm-warning`, `pm-danger`, `pm-info` | une étiquette colorée |
| `pm-muted`, `pm-link`, `pm-empty`, `pm-sr-only` | texte secondaire, lien, état vide, texte réservé aux lecteurs d'écran |

Les icônes [PrimeIcons](https://primeng.org/icons) (`<i class="pi pi-heart"></i>`) sont disponibles. Les autres classes du produit (`app-*`, composants PrimeNG) sont internes et peuvent changer.

Pour des styles propres, livrez une feuille dans `ui/` et chargez-la depuis le module :

```js
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = new URL('./infirmary.css', import.meta.url).href;
document.head.append(link);
```

Préfixez vos classes par l'identifiant (`.infirmary-…`) : la page est partagée.

## Sécurité

- **Échappez** tout texte venu de l'API avant de l'insérer en HTML, ou passez par `textContent`. L'exemple a une fonction `escape()`.
- N'appelez que l'API de Polymorph, par le SDK : il refuse toute autre adresse.
- Ne stockez rien de sensible dans `localStorage`.

## Si l'interface ne se charge pas

Une interface prévue pour un autre SDK, un module qui n'exporte pas `activate`, ou une erreur au chargement : l'interface n'est pas chargée, ses écrans affichent « Cette extension n'a pas pu être chargée », et le reste de l'application continue. Le détail est dans la console du navigateur.

Le module est servi avec un cache immuable, par version : `/api/v1/native-extensions/<id>/<version>/ui/index.js`. Une nouvelle version de l'extension change l'adresse ; un rechargement de la page suffit.
