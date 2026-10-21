---
title: Entités et champs
description: Décrire les données d'une extension — entités, rattachement, types de champs et règles KodiScript.
---

Une **entité** est un type d'enregistrement que l'extension ajoute : un abonnement à la cantine, un prêt de manuel, une visite médicale. Polymorph en tire un écran de liste, un formulaire de saisie et, si vous le demandez, une carte sur une fiche.

```json
{
  "code": "abonnement",
  "nom": "Cantine",
  "nom_pluriel": "Abonnés de la cantine",
  "rattachement": "INSCRIPTION",
  "unique": true,
  "permissions": { "voir": "cantine.voir", "gerer": "cantine.gerer" },
  "champs": [ … ]
}
```

## L'entité

| Clé | Obligatoire | Contenu |
|---|---|---|
| `code` | oui | minuscules, chiffres et `_`, commence par une lettre, 40 caractères au plus ; unique dans l'extension |
| `nom` | oui | nom d'un enregistrement, 120 caractères au plus : titre de la carte et du formulaire |
| `nom_pluriel` | non | titre de l'écran de liste ; `nom` par défaut |
| `rattachement` | non | `INSCRIPTION`, `APPRENANT`, ou absent |
| `unique` | non | `true` : un seul enregistrement par inscription ou par apprenant |
| `permissions` | oui | `voir` et `gerer`, deux permissions déclarées par l'extension |
| `champs` | oui | de 1 à 30 champs |

Une extension a 10 entités au plus.

### Rattachement

- **`INSCRIPTION`** : chaque enregistrement appartient à une inscription, donc à une session. Il convient à ce qui se renouvelle à chaque session : abonnement à la cantine, au transport, assurance.
- **`APPRENANT`** : chaque enregistrement appartient à l'apprenant, quelle que soit la session. Il convient à ce qui le suit : prêts de manuels, dossier médical, pièces fournies.
- **Absent** : une liste indépendante, sans lien avec une fiche, comme un inventaire ou un registre de visiteurs.

Un enregistrement rattaché se crée depuis la carte de la fiche ; l'écran de liste sert alors à consulter, chercher et modifier. Pour une entité rattachée à l'inscription, il ne montre que les inscriptions des centres que l'utilisateur voit. Une entité sans rattachement se crée depuis son écran de liste.

`unique` n'a de sens qu'avec un rattachement. La carte propose alors « Ajouter » tant que la fiche n'a pas d'enregistrement, puis seulement « Modifier ».

Sur la fiche d'une inscription, la carte ne propose d'ajout que tant que l'inscription est en cours (préinscrite ou active).

### Permissions

- `voir` donne accès à l'écran de liste et à la carte.
- `gerer` permet d'ajouter, de modifier et de supprimer des enregistrements.

## Les champs

```json
{ "code": "allergie_grave", "libelle": "Allergie grave", "type": "OUI_NON", "visible_si": "champs.allergies != null", "liste": false }
```

| Clé | Obligatoire | Contenu |
|---|---|---|
| `code` | oui | minuscules, chiffres et `_`, unique dans l'entité ; c'est le nom de la valeur dans `champs` |
| `libelle` | oui | 120 caractères au plus |
| `type` | oui | voir le tableau suivant |
| `aide` | non | texte sous le champ, 255 caractères au plus |
| `options` | pour `LISTE` | de 1 à 50 valeurs distinctes, de 100 caractères au plus |
| `obligatoire` | non | `true` : le champ doit être rempli |
| `visible_si` | non | règle KodiScript : le champ n'apparaît que si elle est vraie |
| `obligatoire_si` | non | règle KodiScript : le champ est exigé quand elle est vraie |
| `valeur_defaut` | non | expression KodiScript : la valeur proposée quand le champ est vide |
| `liste` | non | `true` : colonne de l'écran de liste. Par défaut, les quatre premiers champs |

### Types

| Type | Valeur enregistrée | Contrôle |
|---|---|---|
| `TEXTE` | texte | 255 caractères au plus |
| `NOMBRE` | nombre entier ou décimal | un nombre |
| `DATE` | `AAAA-MM-JJ` | une date réelle |
| `LISTE` | l'une des `options` | une valeur de la liste |
| `OUI_NON` | `true` ou `false` | oui ou non |
| `TELEPHONE` | texte | 30 caractères au plus |

Les valeurs sont contrôlées par le serveur, comme celles des champs personnalisés du produit. Un champ vide n'est pas enregistré : il vaut `null`.

Les options d'une liste sont des **valeurs enregistrées** : elles ne se traduisent pas, et en renommer une dans une nouvelle version laisse les anciens enregistrements avec l'ancienne valeur.

## Les règles

`visible_si`, `obligatoire_si` et `valeur_defaut` sont des expressions [KodiScript](../kodiscript/). Elles sont évaluées à l'identique dans le navigateur, pendant la saisie, et sur le serveur, à l'enregistrement.

Elles ne voient qu'une variable, **`champs`** : les valeurs du même enregistrement, un code par champ, `null` quand il est vide.

```json
{ "code": "contact_urgence", "libelle": "Contact en cas d'urgence", "type": "TELEPHONE",
  "visible_si": "champs.allergie_grave == true",
  "obligatoire_si": "champs.allergie_grave == true" }
```

- **`visible_si`** : un champ masqué n'est pas exigé. Sans règle, ou si la règle est en erreur, le champ est visible.
- **`obligatoire_si`** : s'ajoute à `obligatoire`. Une règle en erreur n'exige rien.
- **`valeur_defaut`** : une expression, pas une valeur. Un texte s'écrit donc entre guillemets, échappés dans le JSON : `"valeur_defaut": "\"Tous les jours\""`. Le résultat doit convenir au type du champ.

Deux pièges du langage :

- **Seuls `null` et `false` sont faux.** `0`, `""` et une liste vide sont vrais. Écrivez `champs.nombre > 0`, pas `champs.nombre`.
- **Comparez avec `==`** : `champs.etat == "Rendu"`. Un seul `=` est une affectation.

La syntaxe des règles est vérifiée par l'outil et à l'examen de l'archive.

## Où vivent les données

Les enregistrements sont stockés dans l'espace de l'établissement, dans une table commune à toutes les extensions : l'extension ne crée aucune table. La recherche de l'écran de liste porte sur toutes les valeurs et sur le nom de l'apprenant.

Une mise à jour conserve les enregistrements. La désinstallation les supprime tous : Polymorph affiche leur nombre avant de demander confirmation.
