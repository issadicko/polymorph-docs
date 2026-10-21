---
title: Textes et traductions
description: Écrire les textes d'une extension en français et les traduire en arabe et en anglais.
---

Polymorph s'affiche en **français**, en **arabe** (de droite à gauche) et en **anglais** ; chaque utilisateur choisit sa langue. Une extension écrit ses textes en français dans le manifeste, et fournit leurs traductions dans la clé `traductions`.

```json
"traductions": {
  "ar": {
    "Cantine": "المطعم",
    "Abonnés de la cantine": "المشتركون في المطعم"
  },
  "en": {
    "Cantine": "Canteen",
    "Abonnés de la cantine": "Canteen subscribers"
  }
}
```

- La clé est le **texte français exact**, tel qu'il apparaît dans le manifeste : une virgule ou une majuscule de différence, et la traduction n'est pas trouvée.
- Un même texte, employé à plusieurs endroits, se traduit une seule fois.
- Un texte sans traduction s'affiche en français.
- 300 traductions au plus par langue, de 500 caractères chacune.

## Ce qui se traduit

| Texte | Clé du manifeste |
|---|---|
| nom et description de l'extension | `nom`, `description` |
| libellés des permissions | `permissions` |
| noms des entités | `entites[].nom`, `entites[].nom_pluriel` |
| libellés et aides des champs | `entites[].champs[].libelle`, `aide` |
| noms des scripts | `hooks[].nom` |
| nom de l'application, nom court, écrans | `application.nom`, `court`, `ecrans[].libelle` |

## Ce qui ne se traduit pas

- **Les options d'une liste** : ce sont des valeurs enregistrées, comparées par les règles (`champs.etat == "Rendu"`). Elles s'affichent telles quelles dans toutes les langues. Choisissez des options courtes et compréhensibles par tous les utilisateurs de l'établissement.
- **L'éditeur** (`editeur`), qui est un nom propre.
- **Les textes produits par vos scripts**, comme un SMS : c'est au script de choisir sa langue.

## Conseils

- Écrivez d'abord tous les textes français, puis traduisez en une fois : l'outil de vérification compte les textes sans traduction pour chaque langue.
- En arabe, gardez les chiffres et les sigles tels quels (« 10 % », « SMS ») : l'interface gère le sens de lecture.
- Faites relire les traductions par un locuteur : une interface dans sa langue, mal traduite, inspire moins confiance qu'une interface en français.
