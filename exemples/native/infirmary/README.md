# Infirmerie — exemple d'extension native

Visites à l'infirmerie : motif, soins, orientation et parent prévenu, avec une carte sur la fiche de l'apprenant.

Cette extension sert d'exemple complet au guide [Les extensions natives](../../../src/content/docs/natives/index.md).
Elle montre chaque point d'extension. Son code est en anglais, comme celui du produit ; ses textes affichés sont en français, traduits
en arabe et en anglais.

| Apport | Fichier |
|---|---|
| Manifeste : identité, permissions, rôles, réglages, tuile, traductions | `polymorph.json` |
| Classe de l'extension : relation ajoutée au modèle Apprenant, cycle de vie, tâche planifiée (coupée par un réglage), commande, source de rapport | `backend/src/Extension.php` |
| Tables préfixées `infirmary_` | `backend/database/migrations/` |
| API sous `/api/v1/modules/infirmary` | `backend/routes/api.php`, `backend/src/Http/` |
| Source « Visites à l'infirmerie » des rapports personnalisés | `backend/src/Reports/VisitsSource.php` |
| Commande `php artisan infirmary:summary` | `backend/src/Commands/Summary.php` |
| Écrans Visites (avec le téléphone de l'infirmerie, un réglage) et Motifs, carte de la fiche apprenant | `ui/index.js` |

## Essayer en développement

Depuis la racine de ce dépôt :

```bash
node outils/polymorph-ext.mjs verifier exemples/native/infirmary
node outils/polymorph-ext.mjs empaqueter exemples/native/infirmary --sortie /tmp
```

Puis, sur un Polymorph de développement (`NATIVE_EXTENSIONS_ALLOW_UNSIGNED=true` dans `backend/.env`, accepté
seulement avec `APP_ENV=local`) :

```bash
php artisan extension:deploy /tmp/infirmary-1.0.0.poly
```

Puis, dans l'établissement : Paramétrage → Modules → Infirmerie → Installer. Le bouton Réglages saisit ensuite le téléphone de l'infirmerie et coupe, si besoin, le rappel du soir.

## Signer pour la production

```bash
node outils/polymorph-ext.mjs key generate --owner "Mon entreprise" --output ~/.polymorph/key.json
node outils/polymorph-ext.mjs sign exemples/native/infirmary --key ~/.polymorph/key.json
node outils/polymorph-ext.mjs empaqueter exemples/native/infirmary --sortie /tmp
```

L'exploitant de la plateforme ajoute la clé publique à son trousseau (`php artisan extension:key add <clé> --owner="Mon entreprise"`),
puis déploie l'archive.
