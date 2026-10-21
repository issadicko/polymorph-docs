---
title: Votre première extension native
description: Construire l'extension Infirmerie, du manifeste au déploiement, étape par étape.
---

Ce guide construit **Infirmerie**, une extension qui enregistre les visites des apprenants à l'infirmerie. À la fin, l'établissement aura :

- une tuile « Infirmerie » sur son accueil, avec la liste des visites et leur saisie ;
- une carte « Infirmerie » sur la fiche de chaque apprenant ;
- une source « Visites à l'infirmerie » dans ses rapports personnalisés ;
- un rappel, chaque soir, des visites dont le parent n'a pas été prévenu.

Le résultat complet est dans [`exemples/native/infirmary`](https://github.com/issadicko/polymorph-docs/tree/main/exemples/native/infirmary).

## Ce qu'il vous faut

- Un Polymorph de développement : le dépôt du produit, avec `APP_ENV=local`.
- Pour essayer sans signer : `NATIVE_EXTENSIONS_ALLOW_UNSIGNED=true` dans `backend/.env`. Ce réglage n'a d'effet qu'en développement.
- Node 22 et ce dépôt de documentation, pour l'outil `polymorph-ext` (facultatif : les commandes `php artisan` du produit font la même chose).

## 1. Le manifeste

Créez un dossier `infirmary/` et son `polymorph.json` :

```json
{
  "$schema": "https://raw.githubusercontent.com/issadicko/polymorph-docs/main/contrats/polymorph-native.schema.json",
  "format": 1,
  "type": "native",
  "id": "infirmary",
  "version": "1.0.0",
  "name": "Infirmerie",
  "description": "Visites à l'infirmerie : motif, soins, orientation et parent prévenu.",
  "publisher": "Mon entreprise",
  "compatibility": { "polymorph": "^1.0", "php": ">=8.4" },
  "permissions": {
    "infirmary.view": "Consulter les visites à l'infirmerie",
    "infirmary.manage": "Enregistrer et modifier les visites à l'infirmerie"
  },
  "roles": { "DIRECTION": ["infirmary.view"], "SECRETARIAT": ["infirmary.view", "infirmary.manage"] },
  "backend": { "class": "PolymorphExt\\Infirmary\\Extension" },
  "ui": { "module": "ui/index.js", "sdk": "^1.0" },
  "application": {
    "name": "Infirmerie",
    "tint": { "tile": "#fde4e4", "plate": "#e5484d", "edge": "#b8323a", "detail": "#8f1f27" },
    "screens": [{ "label": "Visites", "icon": "pi-heart", "path": "" }]
  }
}
```

`id` est le préfixe de tout ce que l'extension crée : permissions, tables, migrations, sources de rapports, éléments d'interface. Les clés du manifeste sont en anglais ; les textes affichés (`name`, `description`, libellés des permissions et des écrans) sont en français, et se traduisent dans `translations`. Chaque clé est décrite dans [Le manifeste natif](../manifeste/).

## 2. La classe de l'extension

`backend/src/Extension.php` étend la classe de base du produit. Identité, droits et tuile viennent du manifeste ; la classe n'ajoute que ce qui demande du code :

```php
<?php

namespace PolymorphExt\Infirmary;

use App\Modules\Native\NativeExtension;
use Illuminate\Support\Facades\DB;

class Extension extends NativeExtension
{
    /** First install in an établissement, after the migrations. */
    public function install(): void
    {
        foreach (['Maux de tête', 'Fièvre', 'Blessure légère'] as $position => $label) {
            DB::table('infirmary_reasons')->insert(['label' => $label, 'position' => $position, 'created_at' => now(), 'updated_at' => now()]);
        }
    }
}
```

## 3. Les tables

Une migration par fichier de `backend/database/migrations/`, dont le nom contient l'identifiant. Chaque table commence par `infirmary_` :

```php
// backend/database/migrations/2026_11_01_000000_create_infirmary_tables.php
Schema::create('infirmary_visits', function (Blueprint $table) {
    $table->id();
    $table->foreignId('learner_id')->constrained('apprenants')->cascadeOnDelete();
    $table->dateTime('occurred_at');
    $table->string('reason', 160);
    $table->boolean('parent_informed')->default(false);
    $table->timestamps();
});

Schema::create('infirmary_reasons', function (Blueprint $table) {
    $table->id();
    $table->string('label', 160)->unique();
    $table->unsignedSmallInteger('position')->default(0);
    $table->timestamps();
});
```

## 4. L'API

`backend/routes/api.php` déclare des routes **relatives** : le produit les place sous `/api/v1/modules/infirmary/`, derrière la connexion et le contrôle « extension active dans l'établissement ». Chaque route demande en plus une permission de l'extension :

```php
Route::middleware('permission:infirmary.view')->group(function () {
    Route::get('visits', [VisitController::class, 'index']);
});
Route::middleware('permission:infirmary.manage')->group(function () {
    Route::post('visits', [VisitController::class, 'store']);
});
```

Les contrôleurs sont des contrôleurs Laravel ordinaires, dans `backend/src/Http/`.

## 5. L'interface

`ui/index.js` est un module ES, sans compilation. Il exporte `activate(polymorph)`, que le produit appelle une fois avec le SDK. Il y définit des éléments personnalisés et les inscrit :

```js
class Visits extends HTMLElement {
  set polymorph(sdk) {
    this.sdk = sdk;
    this.load();
  }

  async load() {
    const visits = await this.sdk.api.get('visits');
    this.innerHTML = `
      <div class="pm-screen">
        <header class="pm-header"><h1 class="pm-title">${this.sdk.t('Visites')}</h1></header>
        <section class="pm-card">${visits.length} visite(s)</section>
      </div>`;
  }
}

export function activate(polymorph) {
  customElements.define('infirmary-visits', Visits);
  polymorph.screen('', 'infirmary-visits'); // /modules/infirmary
}
```

Les classes `pm-*` donnent aux éléments l'apparence du produit, en clair comme en sombre. Tout le SDK est dans [L'interface et le SDK](../interface/).

:::caution[Échappez les données]
Un texte venu de l'API entre dans le HTML **échappé** : l'exemple complet a une fonction `escape()` pour cela. Sans elle, un motif saisi comme `<img onerror=…>` s'exécuterait chez chaque utilisateur.
:::

## 6. Vérifier et empaqueter

```bash
node outils/polymorph-ext.mjs verifier infirmary
node outils/polymorph-ext.mjs empaqueter infirmary --sortie dist
```

ou, depuis le produit :

```bash
php artisan extension:empaqueter ../infirmary --sortie=/tmp
```

## 7. Déployer, puis installer

En développement, avec `NATIVE_EXTENSIONS_ALLOW_UNSIGNED=true` :

```bash
php artisan extension:deploy /tmp/infirmary-1.0.0.poly
```

Puis, dans l'établissement : **Paramétrage → Modules → Infirmerie → Installer**. La tuile apparaît sur l'accueil des utilisateurs qui ont `infirmary.view`.

Pour livrer à une plateforme réelle, signez d'abord : [Signer, livrer, déployer](../livrer/).
