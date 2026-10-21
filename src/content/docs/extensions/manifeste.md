---
title: Le manifeste
description: Référence de polymorph.json (format 1) — chaque clé, ses valeurs, ses limites.
---

Le manifeste `polymorph.json` décrit tout ce que l'extension apporte. Il se trouve à la racine de l'archive. Son format est fixé par un [schéma JSON](https://github.com/issadicko/polymorph-docs/blob/main/contrats/polymorph.schema.json) : déclarez-le en tête du fichier pour profiter de la complétion et des contrôles de votre éditeur.

```json
{
  "$schema": "https://raw.githubusercontent.com/issadicko/polymorph-docs/main/contrats/polymorph.schema.json",
  "format": 1,
  "id": "cantine",
  …
}
```

L'installation ignore la clé `$schema`.

## Les clés

| Clé | Obligatoire | Contenu | Limites |
|---|---|---|---|
| `format` | oui | version du format du manifeste | `1` |
| `id` | oui | identifiant stable de l'extension | voir plus bas |
| `version` | oui | version de l'extension, `X.Y.Z` | chiffres seulement, 4 au plus par partie |
| `nom` | oui | nom affiché | 120 caractères |
| `description` | non | présentation en une ou deux phrases | 500 caractères |
| `editeur` | non | votre nom ou celui de votre société | 120 caractères, non traduit |
| `compatibilite` | oui | `{ "polymorph": "^1.0" }` : version du produit demandée | voir [Versions](../versions/) |
| `permissions` | non | permissions de l'extension et leurs libellés | 20 au plus |
| `roles` | non | permissions données à chaque rôle à la première installation | rôles connus seulement |
| `entites` | non | données de l'extension | 10 au plus, voir [Entités et champs](../entites/) |
| `hooks` | non | scripts attachés aux hooks | 10 au plus, voir [Scripts et hooks](../hooks/) |
| `application` | non | tuile de l'accueil et écrans | voir [Tuile, écrans et cartes](../application/) |
| `emplacements` | non | cartes ajoutées aux fiches | 10 au plus |
| `traductions` | non | textes en arabe et en anglais | voir [Textes et traductions](../traductions/) |

Toute autre clé est refusée, à tous les niveaux du manifeste, par le schéma, l'outil de vérification et l'installation : une faute de frappe (`entite` au lieu de `entites`) ne passe pas inaperçue.

## `id`

- Minuscules, chiffres et tirets ; commence par une lettre ; de 2 à 40 caractères : `cantine`, `remise-fratrie`.
- Il ne change jamais : c'est lui qui relie une mise à jour à la version installée, et qui préfixe les permissions.
- Il ne peut pas reprendre le nom d'un module ni le préfixe d'une permission du produit. En Polymorph 1.0, ces identifiants sont réservés :

  `apprenants`, `automatisations`, `caisse`, `classes`, `deliberations`, `demandes`, `evaluations`, `extensions`, `inscriptions`, `modules`, `notes`, `operations`, `paiements`, `parametrage`, `plateforme`, `presences`, `rapports`, `sessions`, `sms`, `transport`, `utilisateurs`.

  La liste peut s'allonger avec les modules du produit. Choisissez un identifiant qui vous est propre, par exemple préfixé par votre marque : `acme-cantine`.

## `permissions`

```json
"permissions": {
  "cantine.voir": "Consulter les abonnés de la cantine",
  "cantine.gerer": "Abonner des apprenants à la cantine"
}
```

- Chaque nom s'écrit `<id>.<action>` ; l'action est faite de minuscules, de chiffres et de `_`.
- Le libellé, de 120 caractères au plus, s'affiche à l'examen de l'archive et dans le paramétrage des rôles.
- Chaque entité désigne une permission `voir` et une permission `gerer` parmi celles-ci. Plusieurs entités peuvent partager les mêmes.

## `roles`

```json
"roles": {
  "DIRECTION": ["cantine.voir"],
  "SECRETARIAT": ["cantine.voir", "cantine.gerer"]
}
```

| Rôle | Qui |
|---|---|
| `DIRECTION` | la direction : validation, contrôle, rapports |
| `SECRETARIAT` | l'accueil : inscriptions, demandes, fiches |
| `CAISSE` | le guichet : encaissements, reçus |
| `RESP_PEDAGOGIQUE` | le responsable pédagogique : évaluations, notes, délibérations |
| `ENSEIGNANT` | les enseignants : appel et notes de leurs classes |

- Seules les permissions déclarées par l'extension peuvent être données.
- L'administrateur (`ADMIN`) a toutes les permissions : il n'apparaît pas ici.
- Ces droits sont donnés **à la première installation**. L'établissement peut ensuite les modifier, et une mise à jour ne revient pas sur ses choix.

## Un manifeste complet

L'exemple [Cantine](https://github.com/issadicko/polymorph-docs/blob/main/exemples/cantine/polymorph.json) utilise toutes les clés, sauf `hooks`. Les exemples [Remise fratrie](https://github.com/issadicko/polymorph-docs/tree/main/exemples/remise-fratrie) et [SMS de paiement](https://github.com/issadicko/polymorph-docs/tree/main/exemples/sms-paiement) montrent des extensions qui n'ont que des scripts.
