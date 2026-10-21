---
title: Le code serveur
description: La classe de l'extension, son cycle de vie, ses tables, son API, ses tâches planifiées, ses commandes et ses sources de rapports.
---

Le dossier `backend/` d'une extension native suit la disposition d'un module du produit :

```
backend/
├── src/                 PolymorphExt\Infirmary\… (chargement automatique)
│   ├── Extension.php    la classe de l'extension
│   ├── Http/            contrôleurs
│   ├── Models/          modèles Eloquent
│   ├── Reports/         sources de rapports
│   └── Commands/        commandes artisan
├── database/migrations/ migrations, nommées avec l'identifiant
├── routes/api.php       routes sous /api/v1/modules/<id>/
└── lang/ar.json, en.json
```

Le code s'exécute dans le serveur de Polymorph, avec Laravel et les bibliothèques du produit. Il n'embarque **aucune dépendance** : `vendor/` est refusé.

## La classe de l'extension

Elle étend `App\Modules\Native\NativeExtension`. Identité, droits, rôles, dépendances, tuile et interface viennent du manifeste ; la classe surcharge seulement ce dont elle a besoin :

| Méthode | Inspirée de | Quand | Pour |
|---|---|---|---|
| `boot()` | WordPress, `plugins_loaded` | à chaque démarrage du serveur | écouteurs de hooks, relations ajoutées aux modèles du cœur, observateurs |
| `install()` | WordPress, `register_activation_hook` | première installation dans un établissement, après les migrations | données initiales |
| `upgrade(string $from)` | Odoo, `post-migrate` | nouvelle version, après les migrations | reprise des données selon la version d'origine |
| `uninstall()` | WordPress, `uninstall.php` | avant la purge dans un établissement | nettoyage hors des tables de l'extension |
| `schedule(ModuleSchedule $schedule)` | WP-Cron, `ir.cron` d'Odoo | au démarrage du planificateur | tâches planifiées |
| `commands()` | WP-CLI | au démarrage de la console | commandes artisan |
| `reportSources()` | rapports d'Odoo | à chaque liste de sources | sources des rapports personnalisés |
| `models()` | | au démarrage | alias des modèles pour le journal d'activité |

`install()`, `upgrade()` et `uninstall()` s'exécutent **dans la transaction** de l'installation : une exception annule tout.

```php
class Extension extends NativeExtension
{
    public function models(): array
    {
        return ['infirmary_visit' => Visit::class];
    }

    public function boot(): void
    {
        Apprenant::resolveRelationUsing('infirmaryVisits', fn (Apprenant $learner): HasMany => $learner->hasMany(Visit::class, 'learner_id'));
    }

    public function upgrade(string $from): void
    {
        if (version_compare($from, '1.1.0', '<')) {
            // reprise des données d'avant la 1.1.0
        }
    }
}
```

### Un établissement à la fois

`boot()` s'exécute au démarrage du serveur, pour **tous** les établissements. Un écouteur vérifie lui-même que l'extension est active dans l'établissement courant, avec `isActive()` :

```php
public function boot(): void
{
    app(Hooks::class)->ecouter(Hooks::PAIEMENT, function (array $context) {
        if (! $this->isActive()) {
            return;
        }
        // …
    });
}
```

Les hooks disponibles, leurs variables et ce qu'un filtre doit renvoyer sont dans le [catalogue des hooks](../../extensions/hooks/). Un écouteur PHP s'exécute après les scripts KodiScript ; pour refuser une opération, il lève une `App\Support\ErreurMetier`.

## Les tables

Les migrations s'exécutent dans le schéma de l'établissement, à l'installation puis à chaque mise à jour.

- **Chaque table commence par l'identifiant** (`infirmary_`, avec `_` à la place de `-`). L'installation compare les tables avant et après les migrations : une table sans préfixe annule l'installation entière.
- **Chaque migration porte l'identifiant dans son nom** : la table `migrations` de l'établissement ne retient que le nom du fichier.
- Une clé étrangère vers une table du cœur est permise (`apprenants`, `inscriptions`, `users`…). Choisissez `cascadeOnDelete` ou `nullOnDelete` : une suppression dans le cœur ne doit pas échouer à cause de l'extension.
- La purge exécute les `down()` : écrivez-les.

## L'API

`backend/routes/api.php` déclare des routes relatives. Le produit les place sous `/api/v1/modules/<id>/`, avec :

- la connexion de l'utilisateur (`auth:sanctum`) et son compte actif ;
- le contrôle « extension active dans l'établissement » : sinon, 404.

Chaque route ajoute la permission qu'elle demande :

```php
Route::bind('visit', fn (string $id) => Visit::query()->visibleTo(auth()->user())->findOrFail((int) $id));

Route::middleware('permission:infirmary.view')->group(function () {
    Route::get('visits', [VisitController::class, 'index']);
});
Route::middleware('permission:infirmary.manage')->group(function () {
    Route::post('visits', [VisitController::class, 'store']);
    Route::delete('visits/{visit}', [VisitController::class, 'destroy'])->whereNumber('visit');
});
```

Respectez le **périmètre** de l'utilisateur : un secrétariat rattaché à un centre ne voit que les apprenants inscrits dans ce centre (`$user->centreIds()`). L'exemple le fait avec un scope `visibleTo`.

Avec des champs aux noms anglais, donnez à `validate()` leurs libellés français en troisième argument (`['reason' => __('motif')]`), traduits dans `backend/lang/` : l'erreur dit alors « Le champ motif est obligatoire. ».

## Les tâches planifiées

```php
public function schedule(ModuleSchedule $schedule): void
{
    $schedule->task('parents-to-notify', function () {
        // s'exécute une fois par établissement où l'extension est active
    })->weekdays()->at('17:30');
}
```

La tâche est nommée `<id>:<nom>` (`infirmary:parents-to-notify`), ne se chevauche pas avec elle-même, et s'exécute dans le contexte de chaque établissement où l'extension est active. La fréquence se règle avec les méthodes du planificateur de Laravel (`dailyAt`, `hourly`, `weekdays()->at(…)`…).

## Les commandes

```php
public function commands(): array
{
    return [Summary::class]; // php artisan infirmary:summary
}
```

Préfixez leur signature par l'identifiant. Une commande qui touche aux données parcourt les établissements avec `App\Plateforme\Etablissements::pourChaque()` et vérifie que l'extension y est active.

## Les sources de rapports

Une source étend `App\Domain\Rapports\Sources\SourceRapport` : des lignes plates, en lecture seule, limitées au périmètre de l'utilisateur et aux filtres choisis. Son code commence par le préfixe de l'extension (`infirmary_visits`), sinon elle est ignorée.

```php
public function reportSources(): array
{
    return [VisitsSource::class];
}
```

La source apparaît dans les rapports personnalisés des établissements où l'extension est active, pour les utilisateurs qui ont sa permission. Voir `Reports/VisitsSource.php` dans l'exemple : `champs()`, `filtres()`, `exemple()`, `requete()` et `ligne()`.

## Les traductions du serveur

`backend/lang/ar.json` et `en.json` traduisent les textes passés à `__()` : messages de validation et d'erreur, journal d'activité, libellés des sources de rapports. Le français, écrit dans le code, est la langue de référence.

## Ce que garantit la classe de base

`NativeExtension` est un contrat : ses méthodes ne changent pas de sens au sein d'une version majeure du produit. Une nouvelle méthode à surcharger peut s'ajouter ; elle ne fait rien par défaut.
