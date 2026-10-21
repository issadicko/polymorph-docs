---
title: Votre première extension déclarative
description: Écrire, vérifier et installer une extension de prêt de manuels, étape par étape.
---

Ce guide construit **Bibliothèque**, une extension qui suit les manuels prêtés aux apprenants. À la fin, l'établissement aura :

- une tuile « Bibliothèque » sur son accueil, avec la liste des prêts ;
- une carte « Prêts de manuels » sur la fiche de chaque apprenant ;
- des droits : le secrétariat prête, la direction et les enseignants consultent.

Le résultat complet est dans [`exemples/bibliotheque`](https://github.com/issadicko/polymorph-docs/tree/main/exemples/bibliotheque).

## Avant de commencer

- **Node.js 22** ou plus récent, pour l'outil de vérification.
- **Ce dépôt**, cloné et installé :

  ```bash
  git clone https://github.com/issadicko/polymorph-docs.git
  cd polymorph-docs
  npm install
  ```

- Pour l'étape d'installation : un établissement Polymorph où vous avez le rôle d'administrateur, de préférence un établissement d'essai.

Un éditeur qui lit les schémas JSON, comme VS Code, complète les clés et signale les erreurs pendant la frappe.

## 1. L'identité de l'extension

Créez un dossier `bibliotheque` et, dedans, un fichier `polymorph.json` :

```json
{
  "$schema": "https://raw.githubusercontent.com/issadicko/polymorph-docs/main/contrats/polymorph.schema.json",
  "format": 1,
  "id": "bibliotheque",
  "version": "1.0.0",
  "nom": "Bibliothèque",
  "description": "Prêt de manuels aux apprenants : ouvrage, dates, retour, avec une carte sur la fiche de l'apprenant.",
  "editeur": "Votre nom",
  "compatibilite": { "polymorph": "^1.0" }
}
```

- `id` identifie l'extension pour toujours : minuscules, chiffres et tirets. Il préfixe ses permissions et son adresse dans l'application. Ne le changez plus après la première livraison.
- `version` suit le versionnage sémantique : seule une version plus récente remplace une version installée.
- `compatibilite.polymorph` à `^1.0` accepte toute version 1.x du produit, à partir de 1.0.

Vérifiez déjà :

```bash
npm run verifier -- ../bibliotheque
```

```
bibliotheque 1.0.0 — contrats de Polymorph 1.0.0
✓ Extension valide.
```

Une extension sans entité ni script est valide, même si elle n'apporte encore rien.

## 2. Les droits

Une extension déclare ses propres permissions, toutes préfixées par son identifiant, puis indique quels rôles les reçoivent à l'installation :

```json
"permissions": {
  "bibliotheque.voir": "Consulter les prêts de la bibliothèque",
  "bibliotheque.gerer": "Prêter et reprendre des manuels"
},
"roles": {
  "DIRECTION": ["bibliotheque.voir"],
  "SECRETARIAT": ["bibliotheque.voir", "bibliotheque.gerer"],
  "ENSEIGNANT": ["bibliotheque.voir"]
}
```

L'administrateur a toutes les permissions sans qu'on les lui donne. Il pourra ensuite ajuster ces droits, rôle par rôle, dans le paramétrage des utilisateurs.

## 3. Les données

Un prêt est une **entité** rattachée à l'apprenant : chaque enregistrement appartient à un apprenant, et un apprenant peut en avoir plusieurs.

```json
"entites": [
  {
    "code": "pret",
    "nom": "Prêt",
    "nom_pluriel": "Prêts de manuels",
    "rattachement": "APPRENANT",
    "permissions": { "voir": "bibliotheque.voir", "gerer": "bibliotheque.gerer" },
    "champs": [
      { "code": "ouvrage", "libelle": "Ouvrage", "type": "TEXTE", "obligatoire": true },
      { "code": "cote", "libelle": "Cote", "type": "TEXTE", "aide": "Numéro inscrit sur l'étiquette du livre.", "liste": false },
      { "code": "date_pret", "libelle": "Prêté le", "type": "DATE", "obligatoire": true },
      { "code": "retour_prevu", "libelle": "Retour prévu", "type": "DATE" },
      { "code": "etat", "libelle": "État", "type": "LISTE", "options": ["Prêté", "Rendu", "Perdu"],
        "obligatoire": true, "valeur_defaut": "\"Prêté\"", "liste": true },
      { "code": "date_retour", "libelle": "Rendu le", "type": "DATE",
        "visible_si": "champs.etat == \"Rendu\"", "obligatoire_si": "champs.etat == \"Rendu\"", "liste": false },
      { "code": "observations", "libelle": "Observations", "type": "TEXTE",
        "visible_si": "champs.etat == \"Perdu\"", "liste": false }
    ]
  }
]
```

- `visible_si`, `obligatoire_si` et `valeur_defaut` sont des expressions **KodiScript**. Elles voient les valeurs du même enregistrement dans `champs`. Ici, « Rendu le » n'apparaît, et n'est exigé, que pour un livre rendu.
- `valeur_defaut` est elle aussi une expression : le texte `Prêté` s'écrit donc entre guillemets, échappés dans le JSON.
- `liste` choisit les colonnes de l'écran de liste. Sans indication, ce sont les quatre premiers champs.

Le détail des types et des règles est dans [Entités et champs](../entites/).

## 4. La tuile et l'écran

```json
"application": {
  "nom": "Bibliothèque",
  "teinte": { "tuile": "#f1e4d3", "plaque": "#b07a45", "tranche": "#8c5c2e", "detail": "#6f4520" },
  "ecrans": [
    { "libelle": "Prêts", "icone": "pi-book", "entite": "pret" }
  ]
}
```

La tuile prend la forme des icônes de Polymorph : une plaque colorée, inclinée, posée sur une pile de feuillets, sur une tuile pastel. Vous choisissez ses quatre couleurs et, si vous le souhaitez, son pictogramme. Sans pictogramme, la plaque porte une boîte. L'exemple complet dessine trois livres sur une étagère : voir [Tuile, écrans et cartes](../application/).

L'écran « Prêts » liste tous les prêts de l'établissement, à l'adresse `/extensions/bibliotheque/pret`. Il est réservé à la permission `voir` de l'entité.

## 5. La carte sur la fiche

```json
"emplacements": [
  { "emplacement": "fiche-apprenant.cartes", "entite": "pret" }
]
```

La fiche de chaque apprenant affiche désormais ses prêts. La saisie s'y fait directement, avec la permission `gerer`. L'emplacement `fiche-apprenant.cartes` n'accepte qu'une entité rattachée à l'apprenant, et `fiche-inscription.cartes` qu'une entité rattachée à l'inscription.

## 6. Les traductions

Polymorph s'affiche en français, en arabe et en anglais, au choix de chaque utilisateur. Les textes du manifeste sont écrits en français ; leurs traductions sont associées au texte français :

```json
"traductions": {
  "ar": { "Bibliothèque": "المكتبة", "Prêts": "الإعارات", "Ouvrage": "الكتاب" },
  "en": { "Bibliothèque": "Library", "Prêts": "Loans", "Ouvrage": "Book" }
}
```

Un texte sans traduction s'affiche en français. L'outil de vérification compte ceux qui manquent.

## 7. Vérifier et empaqueter

```bash
npm run empaqueter -- ../bibliotheque --sortie ../livraisons
```

```
bibliotheque — contrats de Polymorph 1.0.0
✓ ../livraisons/bibliotheque-1.0.0.poly (1.6 Ko)
  Empreinte SHA-256 : 5cafc86f…
```

L'archive ne contient que `polymorph.json`, `README.md` et `scripts/*.kodi` ; les autres fichiers du dossier sont signalés et laissés de côté. Notez l'empreinte : l'établissement la verra à l'examen de l'archive.

## 8. Installer

Dans l'établissement d'essai, avec le rôle d'administrateur :

1. Ouvrez **Paramétrage → Modules**, partie « Extensions », et téléversez `bibliotheque-1.0.0.poly`.
2. Polymorph examine l'archive et affiche ce qu'elle demande : les droits par rôle, les données, la carte, les scripts et l'empreinte. Rien n'est encore installé.
3. Confirmez l'installation. L'extension est active aussitôt.

La tuile « Bibliothèque » apparaît sur l'accueil des utilisateurs qui ont `bibliotheque.voir`, et la carte sur les fiches des apprenants.

## 9. Livrer une nouvelle version

Ajoutez un champ, corrigez un libellé, puis passez `version` à `1.1.0` et empaquetez de nouveau. Téléversée, la nouvelle archive remplace la précédente. Les prêts déjà saisis sont conservés.

Ne retirez pas un champ dont l'établissement a besoin : ses valeurs ne s'afficheraient plus. Les règles de compatibilité sont dans [Versions et compatibilité](../versions/).

## Et ensuite

- Ajoutez un script : une [remise fratrie](https://github.com/issadicko/polymorph-docs/tree/main/exemples/remise-fratrie) ou un [SMS après un paiement](https://github.com/issadicko/polymorph-docs/tree/main/exemples/sms-paiement). Voir [Scripts et hooks](../hooks/).
- Parcourez [le manifeste](../manifeste/) clé par clé.
