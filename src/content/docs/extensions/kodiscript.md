---
title: KodiScript en bref
description: L'essentiel du langage des règles et des scripts d'une extension, et ses particularités dans Polymorph.
---

Les règles des champs et les scripts des hooks s'écrivent en **KodiScript**, un petit langage de script conçu pour être embarqué : il ne voit que les variables et les fonctions que Polymorph lui donne. Cette page en résume l'essentiel ; la [documentation complète du langage](https://docs-kodiscript.dickode.net/) décrit tout le reste.

## Une règle, un script

- Une **règle** (`visible_si`, `obligatoire_si`, `valeur_defaut`) est une seule expression : `champs.etat == "Rendu"`.
- Un **script** est un programme : des variables, des conditions, des boucles et, pour un filtre, un `return`.

## Les bases

```js
// Variables
let total = 0
let noms = ["Awa", "Ibrahim"]
let apprenant = { nom: "KABORE", prenom: "Awa" }

// Conditions
if (total > 10000) {
  print("gros montant")
} else {
  print("petit montant")
}

// Boucles
for (nom in noms) {
  total = total + size(nom)
}
let i = 0
while (i < 3) {
  i = i + 1
}

// Fonctions
let double = fn(x) { return x * 2 }
let grands = filter([5, 12, 30], fn(n) { return n > 10 })

// Erreurs
try {
  let fin = addDays("2026-10-19", "deux")
} catch (e) {
  print("nombre de jours invalide")
}
```

- Les chaînes s'écrivent entre guillemets doubles et se concatènent avec `+`. Un nombre devient un texte avec `toString(n)`, un texte devient un nombre avec `toNumber(t)`, qui renvoie `0` pour un texte qui n'en est pas un.
- Les opérateurs sont ceux de JavaScript : `==`, `!=`, `<`, `>=`, `&&`, `||`, `!`.
- Un objet se lit par `objet.cle` ou `objet["cle"]`, une liste par `liste[0]`.

## `null` et la vérité

- **Seuls `null` et `false` sont faux.** `0`, `""` et une liste vide sont vrais. Écrivez `montant > 0`, `size(liste) > 0`, `nom != null`.
- `a?.b` vaut `null` si `a` est `null`, au lieu d'une erreur. Utilisez-le pour tout objet qui peut manquer, comme `classe` ou `categorie`.
- `a ?: b` vaut `b` quand `a` est `null` : `principal?.telephone ?: apprenant.telephone`.

## Fonctions natives

Plus de 50 fonctions sont disponibles partout, en fonction ou en méthode : `size(liste)` ou `liste.size()`.

| Famille | Fonctions |
|---|---|
| Textes | `toString`, `toNumber`, `length`, `substring`, `toUpperCase`, `toLowerCase`, `trim`, `split`, `join`, `replace`, `contains`, `startsWith`, `endsWith`, `indexOf` |
| Nombres | `abs`, `floor`, `ceil`, `round`, `min`, `max`, `pow`, `sqrt` |
| Types | `typeOf`, `isNull`, `isNumber`, `isString`, `isBool` |
| Listes | `size`, `first`, `last`, `reverse`, `slice`, `sort`, `sortBy`, `unique`, `push`, `concat`, `range`, `sum`, `avg`, `has` |
| Listes et fonctions | `map`, `filter`, `reduce`, `find`, `findIndex`, `some`, `every`, `flatMap` |
| Regroupements | `groupBy`, `countBy`, `indexBy`, `sumBy`, `minBy`, `maxBy`, `partition`, `pluck` |
| Dates | `now`, `formatDate`, `parseDate`, `year`, `month`, `day`, `dayOfWeek`, `addDays`, `addMonths`, `diffDays`, `diffMonths`, `diffYears`, `age`, `startOfMonth`, `endOfMonth`, `isWeekend` |
| JSON | `jsonParse`, `jsonStringify` |

Exemples :

```js
age(apprenant.date_naissance)                 // âge en années révolues
diffDays(session.date_debut, formatDate(now())) // jours écoulés depuis le début de la session
sumBy(inscriptionsActives(numero), "solde")    // total restant dû d'une famille
```

## Particularités dans Polymorph

- **Les dates sont des textes ISO** : `"2026-10-21"`. Les calculs de dates se font en UTC.
- **Les montants sont des entiers** dans la devise de l'établissement. Pour les afficher, utilisez `montant(valeur)`.
- **Aucun accès extérieur** : ni fichiers, ni réseau, ni base de données, sauf par les [fonctions du produit](../hooks/#fonctions-du-produit).
- **Des limites** : un nombre d'opérations et une durée maximale par exécution, propres à chaque hook (10 000 opérations et 200 ms pour un filtre). Une boucle sur des milliers d'éléments les atteint vite.
- `print(…)` écrit dans le journal d'exécution, pas à l'écran.

## Le moteur de référence

Polymorph exécute les scripts avec le moteur KodiScript du serveur. L'outil de vérification de ce dépôt, comme les formulaires dans le navigateur, utilise la version TypeScript du langage, et une même expression donne le même résultat des deux côtés. En cas de doute, l'examen de l'archive par Polymorph tranche.
