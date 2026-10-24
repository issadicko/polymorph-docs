---
title: Le manifeste natif
description: Chaque clé du polymorph.json d'une extension native, ses valeurs et ses contrôles au déploiement.
---

Le manifeste décrit ce qu'il faut savoir d'une extension **sans exécuter son code** : identité, compatibilité, dépendances, droits, tuile, interface. Le déploiement le lit et le contrôle ; le code ne se charge qu'une fois la signature vérifiée.

Son schéma JSON est [`contrats/polymorph-native.schema.json`](https://github.com/issadicko/polymorph-docs/blob/main/contrats/polymorph-native.schema.json). Déclarez-le en tête du fichier pour la complétion dans votre éditeur :

```json
{ "$schema": "https://raw.githubusercontent.com/issadicko/polymorph-docs/main/contrats/polymorph-native.schema.json" }
```

Les clés sont en anglais ; les textes affichés sont en français, traduits par `translations`. Toute clé que le format ne prévoit pas est refusée, avec son chemin (`application.screens[0] : clé non prévue (« libelle »)`) : une faute de frappe ne passe pas inaperçue.

## Identité

| Clé | Obligatoire | Valeur |
|---|---|---|
| `format` | oui | `1` |
| `type` | oui | `"native"` : c'est ce qui distingue une extension native d'une extension déclarative |
| `id` | oui | minuscules, chiffres et tirets, 2 à 40 caractères, une lettre d'abord. Ni le code d'un module du produit, ni le préfixe d'une permission du cœur (`paiements`, `apprenants`…) |
| `version` | oui | `X.Y.Z`. Seule une version plus récente remplace la version déployée |
| `name` | oui | 120 caractères au plus, en français |
| `description` | non | 500 caractères au plus, affichée dans Paramétrage → Modules |
| `publisher` | non | 120 caractères au plus, affiché à côté de la signature |

## Compatibilité et dépendances

```json
"compatibility": { "polymorph": "^1.0", "php": ">=8.4" },
"dependencies": { "transport": "^1.0" }
```

- `compatibility.polymorph` (obligatoire) : `^1.0` demande la même version majeure, au moins 1.0 ; `>=1.2` demande au moins 1.2.
- `compatibility.php` (facultatif) : la version de PHP du serveur.
- `dependencies` : des modules du produit ou d'autres extensions natives, avec leur version. Au déploiement, chacune doit exister sur la plateforme dans une version compatible. À l'installation dans un établissement, les dépendances absentes s'installent d'abord ; tant que l'extension est active, elles ne peuvent être ni désactivées ni purgées.

## Droits

```json
"permissions": {
  "infirmary.view": "Consulter les visites à l'infirmerie",
  "infirmary.manage": "Enregistrer et modifier les visites à l'infirmerie"
},
"roles": { "DIRECTION": ["infirmary.view"], "SECRETARIAT": ["infirmary.view", "infirmary.manage"] }
```

- 50 permissions au plus, chacune écrite `<id>.<action>`.
- `roles` donne des permissions de l'extension aux rôles du produit, **à la première installation seulement** : l'établissement les ajuste ensuite. Rôles possibles : `DIRECTION`, `SECRETARIAT`, `CAISSE`, `RESP_PEDAGOGIQUE`, `ENSEIGNANT`, `COMPTABLE`. L'administrateur a toujours tout.

## Réglages

```json
"settings": [
  { "code": "phone", "label": "Téléphone de l'infirmerie", "help": "Affiché en tête de l'écran des visites.", "type": "TELEPHONE", "ui": true },
  { "code": "evening_reminder", "label": "Rappel du soir", "type": "OUI_NON", "default": true }
]
```

Les réglages sont les options de l'extension, comme celles de WordPress : chaque établissement les saisit dans **Paramétrage → Modules → Réglages**, une fois l'extension installée. 30 réglages au plus.

| Clé | Valeur |
|---|---|
| `code` | identifiant du réglage, unique dans l'extension : minuscules, chiffres et `_` |
| `label`, `help` | libellé et aide, en français, traduits par `translations` |
| `type` | un type des champs personnalisés : `TEXTE`, `NOMBRE`, `DATE`, `LISTE`, `OUI_NON`, `TELEPHONE` |
| `options` | les valeurs proposées, pour le type `LISTE` (obligatoire alors) |
| `required` | la saisie exige une valeur |
| `default` | la valeur tant que l'établissement n'en a pas saisi, et quand le champ est vidé ; contrôlée contre le type au déploiement |
| `ui` | la valeur est transmise à l'interface (`polymorph.setting`). Par défaut, elle reste sur le serveur |

Le PHP de l'extension lit un réglage avec `$this->setting('evening_reminder')`, son interface avec `polymorph.setting('phone')` pour les seuls réglages marqués `ui` ([L'interface et le SDK](../interface/)). Un réglage `ui` est lisible par tout utilisateur connecté de l'établissement : une clé d'API reste un réglage sans `ui`, lu par le PHP.

## Code

```json
"backend": { "class": "PolymorphExt\\Infirmary\\Extension" },
"ui": { "module": "ui/index.js", "sdk": "^1.0" }
```

Une extension apporte `backend`, `ui`, ou les deux.

- `backend.class` : la classe de l'extension, dans l'espace de noms `PolymorphExt\<Id>\` (l'identifiant en StudlyCase : `sans-prefixe` donne `PolymorphExt\SansPrefixe\`). Son fichier doit exister : `backend/src/Extension.php` ici.
- `ui.module` : le module ES chargé dans le navigateur, sous `ui/`. Il exporte la fonction `activate(polymorph)`.
- `ui.sdk` : la version du SDK demandée. Une interface prévue pour un SDK que le produit ne fournit pas est refusée au déploiement.

## Tuile et écrans

```json
"application": {
  "name": "Infirmerie",
  "short_name": "Infirmerie",
  "tint": { "tile": "#fde4e4", "plate": "#e5484d", "edge": "#b8323a", "detail": "#8f1f27" },
  "pictogram": [
    { "element": "rect", "x": 32, "y": 30, "width": 46, "height": 36, "rx": 8, "color": "white" }
  ],
  "screens": [
    { "label": "Visites", "icon": "pi-heart", "path": "" },
    { "label": "Motifs", "icon": "pi-list", "path": "reasons", "permission": "infirmary.manage" }
  ]
}
```

La tuile et le pictogramme suivent les mêmes règles que pour une extension déclarative (voir [Tuile, écrans et cartes](../../extensions/application/)), avec des clés en anglais :

| Extension native | Extension déclarative | Pour |
|---|---|---|
| `name`, `short_name` | `nom`, `court` | le nom sous la tuile et en tête du menu (40 caractères au plus) ; le nom dans le rail (14 au plus, par défaut le début de `name`) |
| `tint.tile`, `tint.plate`, `tint.edge`, `tint.detail` | `teinte.tuile`, `teinte.plaque`, `teinte.tranche`, `teinte.detail` | les couleurs de l'icône : fond de la tuile, plaque, tranche de la plaque, détails |
| `pictogram[]` : `element`, `color`, puis `x`, `y`, `width`, `height`, `rx`, `cx`, `cy`, `r`, `d`, `opacity` | `pictogramme[]` : `element`, `couleur`… | les formes dessinées sur la plaque |
| `color` : `white`, `detail`, `ink`, `plate`, `gold` | `couleur` : `blanc`, `detail`, `encre`, `plaque`, `dore` | la couleur d'une forme |

Les écrans diffèrent : chacun (`label`, `icon`, `path`, `permission`) mène à `/modules/<id>/<path>`, et c'est l'**interface** de l'extension qui le dessine (`polymorph.screen(path, element)`). Une tuile demande donc une `ui`. Sans `permission`, un écran demande la première permission déclarée. Huit écrans au plus.

## Traductions

```json
"translations": {
  "en": { "Infirmerie": "Infirmary", "Visites": "Visits" },
  "ar": { "Infirmerie": "العيادة المدرسية", "Visites": "الزيارات" }
}
```

Texte français → traduction, 1 000 entrées au plus par langue. Elles servent au manifeste (nom, description, permissions, tuile) **et** à l'interface : `polymorph.t('Visites')` les lit. Les textes du serveur (validation, journal, sources de rapports) se traduisent dans `backend/lang/ar.json` et `en.json`, comme dans Laravel.

## Ce que le déploiement contrôle en plus du schéma

- la signature ([Signer, livrer, déployer](../livrer/)) ;
- les fichiers : la classe et le module de l'interface existent ; aucun fichier hors des règles de l'archive ;
- le nom de chaque migration contient l'identifiant (`_` à la place de `-`) ;
- la compatibilité avec le produit, PHP et les dépendances présentes sur la plateforme ;
- les réglages : codes uniques, valeur par défaut valide pour son type ;
- aucune extension déclarative du même identifiant n'est installée dans un établissement.
