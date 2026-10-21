---
title: Tuile, écrans et cartes
description: Donner à une extension sa tuile sur l'accueil, son icône, ses écrans, et ses cartes sur les fiches.
---

Dans Polymorph, chaque métier est une **application** : une tuile sur l'accueil, un menu de quelques écrans, une icône dans le rail qui permet de passer de l'une à l'autre. Une extension peut devenir l'une d'elles avec la clé `application`, et ajouter des cartes aux fiches avec la clé `emplacements`.

## L'application

```json
"application": {
  "nom": "Cantine",
  "court": "Cantine",
  "teinte": { "tuile": "#e3efc4", "plaque": "#8cb33f", "tranche": "#6c9025", "detail": "#577a17" },
  "pictogramme": [ … ],
  "ecrans": [
    { "libelle": "Abonnés", "icone": "pi-users", "entite": "abonnement" }
  ]
}
```

| Clé | Obligatoire | Contenu |
|---|---|---|
| `nom` | oui | nom sous la tuile et en tête du menu, 40 caractères au plus |
| `court` | non | nom dans le rail, 14 caractères au plus ; par défaut, les 14 premiers caractères de `nom` |
| `teinte` | oui | les quatre couleurs de l'icône, en `#rrggbb` |
| `pictogramme` | non | le dessin porté par la plaque ; une boîte par défaut |
| `ecrans` | oui | de 1 à 6 écrans |

La tuile n'apparaît qu'aux utilisateurs qui ont la permission `voir` d'au moins une entité de ses écrans.

## L'icône

Toutes les icônes de Polymorph suivent le même dessin : une **plaque** colorée, inclinée, avec son épaisseur, posée sur une pile de feuillets, sur une **tuile** pastel. Votre extension choisit ses couleurs et son pictogramme ; Polymorph dessine le reste, en thème clair comme en thème sombre, et anime la plaque au survol.

### La teinte

| Couleur | Rôle | Conseil |
|---|---|---|
| `tuile` | fond pastel de l'icône | la teinte très claircie |
| `plaque` | la plaque | la teinte franche |
| `tranche` | l'épaisseur de la plaque | la plaque assombrie d'environ 20 % |
| `detail` | accents du pictogramme, écran actif du menu | la plaque assombrie d'environ 35 % |

La teinte suit l'application partout : sa tuile à l'accueil, son icône dans le rail, l'écran actif de son menu. Choisissez une teinte que les applications du produit n'utilisent pas déjà : bleu, orange, violet, vert, jaune, rose, rouge, sarcelle, indigo et ardoise sont pris. Restent par exemple l'olive de la cantine, le brun de la bibliothèque ou le corail.

### Le pictogramme

Le pictogramme se dessine sur la plaque, un carré qui va de **27 à 83 en x** et de **17 à 73 en y**. Son centre est en (55, 45). Polymorph incline ensuite le tout de -7°.

<figure>
<svg viewBox="10 4 96 82" width="360" role="img" aria-label="La plaque, de 27 à 83 en x et de 17 à 73 en y, avec le pictogramme de la bibliothèque" style="max-width: 100%; height: auto; font-family: inherit;">
  <rect x="27" y="17" width="56" height="56" rx="10" fill="#b07a45"/>
  <g stroke="#ffffff" stroke-opacity=".25" stroke-width=".3">
    <line x1="41" y1="17" x2="41" y2="73"/><line x1="55" y1="17" x2="55" y2="73"/><line x1="69" y1="17" x2="69" y2="73"/>
    <line x1="27" y1="31" x2="83" y2="31"/><line x1="27" y1="45" x2="83" y2="45"/><line x1="27" y1="59" x2="83" y2="59"/>
  </g>
  <rect x="36" y="27" width="10" height="34" rx="2" fill="#fff"/>
  <rect x="36" y="33" width="10" height="3" fill="#6f4520"/>
  <rect x="48.5" y="31" width="9" height="30" rx="2" fill="#fff" opacity=".85"/>
  <rect x="48.5" y="37" width="9" height="3" fill="#6f4520"/>
  <rect x="60" y="29" width="11" height="32" rx="2" fill="#fff"/>
  <rect x="60" y="35" width="11" height="3" fill="#6f4520"/>
  <rect x="33" y="61" width="44" height="3.4" rx="1.7" fill="#2e3340"/>
  <g fill="currentColor" font-size="3.6" text-anchor="middle" opacity=".75">
    <text x="27" y="79">27</text><text x="55" y="79">55</text><text x="83" y="79">83</text>
    <text x="21" y="18.2">17</text><text x="21" y="46.2">45</text><text x="21" y="74.2">73</text>
  </g>
</svg>
<figcaption>La plaque et sa grille, avec le pictogramme de l'exemple Bibliothèque.</figcaption>
</figure>

Il se compose de 20 formes au plus, dessinées dans l'ordre :

| Forme | Attributs |
|---|---|
| `rect` | `x`, `y`, `width`, `height`, `rx` (coins, facultatif) |
| `circle` | `cx`, `cy`, `r` |
| `path` | `d` : un tracé SVG, 500 caractères au plus, fait de commandes (`M`, `L`, `H`, `V`, `C`, `S`, `Q`, `T`, `A`, `Z`, en majuscules ou minuscules) et de nombres |

- Chaque forme a une `couleur` : `blanc`, `detail`, `encre` (un gris très sombre), `plaque` (pour évider une forme blanche) ou `dore` (un jaune d'accent).
- `opacity`, de 0 à 1, est facultative.
- Les nombres vont de 0 à 110.

Le pictogramme se lit à 40 pixels dans le rail : préférez deux ou trois formes franches, en blanc, avec un accent `detail`, plutôt qu'un dessin fin.

## Les écrans

```json
"ecrans": [
  { "libelle": "Abonnés", "icone": "pi-users", "entite": "abonnement" }
]
```

- Chaque écran affiche une entité de l'extension, à l'adresse `/extensions/<id>/<entité>` : liste avec recherche, formulaire d'ajout et de modification, suppression.
- `libelle` (40 caractères au plus) est le nom de l'écran dans le menu de l'application.
- `icone` est une icône [PrimeIcons](https://primeng.org/icons), écrite `pi-…` ; `pi-list` par défaut.
- Un écran est réservé à la permission `voir` de son entité.

## Les cartes sur les fiches

```json
"emplacements": [
  { "emplacement": "fiche-inscription.cartes", "entite": "abonnement" }
]
```

| Emplacement | Où | Entité acceptée |
|---|---|---|
| `fiche-inscription.cartes` | fiche d’une inscription | rattachée à `INSCRIPTION` |
| `fiche-apprenant.cartes` | fiche d'un apprenant | rattachée à `APPRENANT` |

La carte affiche les enregistrements de la fiche et permet, avec la permission `gerer`, d'en ajouter, d'en modifier et d'en supprimer. Une extension peut poser 10 cartes au plus. Une extension sans `application` peut quand même ajouter des cartes : ses données ne vivent alors que sur les fiches.
