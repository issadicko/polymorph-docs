<img src="public/favicon.svg" alt="" width="72">

# Documentation de Polymorph

**Polymorph** est la plateforme qui prend la forme de votre établissement : elle gère un établissement de formation, de l'inscription à la caisse, des présences aux notes. Ce dépôt en porte la documentation publique.

Il commence par ce qu'il faut à un éditeur tiers pour étendre Polymorph :

- une **extension native** apporte du code PHP et une interface : ses tables, son API, ses écrans, ses tâches planifiées, en archive signée ;
- pour un besoin plus simple, une **extension déclarative** ajoute à un établissement ses propres données, écrans, cartes et scripts, sans code compilé.

Les autres guides du produit le rejoindront.

Le site se lit sur **https://issadicko.github.io/polymorph-docs/**.

## Contenu

| Dossier | Contenu |
|---|---|
| [`src/content/docs`](src/content/docs) | le site de documentation (Astro Starlight), en français ; accueil en arabe et en anglais |
| [`exemples`](exemples) | une extension native complète, [Infirmerie](exemples/native/infirmary), et quatre extensions déclaratives (Cantine, Bibliothèque, Remise fratrie, SMS de paiement) |
| [`modele`](modele) | un point de départ pour une nouvelle extension |
| [`outils`](outils) | `polymorph-ext`, qui vérifie, empaquette et signe une extension sans serveur Polymorph |
| [`contrats`](contrats) | les schémas du manifeste (déclaratif et natif) et le catalogue des hooks, publiés par le produit |

## Installer l'outil

Il faut Node.js 22 ou plus récent.

```bash
git clone https://github.com/issadicko/polymorph-docs.git
cd polymorph-docs
npm install
```

## Écrire une extension native

```bash
cp -r exemples/native/infirmary ../mon-extension     # partir de l'exemple, puis changer son identifiant
node outils/polymorph-ext.mjs key generate --owner "Mon entreprise" --output ~/.polymorph/key.json
npm run verifier -- ../mon-extension                 # contrôler comme le fera le déploiement
npm run sign -- ../mon-extension --key ~/.polymorph/key.json
npm run empaqueter -- ../mon-extension --sortie livraisons
```

L'exploitant de la plateforme ajoute votre clé publique à son trousseau, puis déploie l'archive ; chaque établissement l'installe ensuite comme un module. Le guide commence par [Les extensions natives](src/content/docs/natives/index.md), puis [Votre première extension native](src/content/docs/natives/premiere-extension.md).

## Écrire une extension déclarative

```bash
cp -r modele ../mon-extension            # partir du modèle
npm run verifier -- ../mon-extension     # contrôler comme le fera l'installation
npm run empaqueter -- ../mon-extension --sortie livraisons
```

L'archive `.poly` produite s'installe dans Polymorph, par l'administrateur de l'établissement, dans Paramétrage → Modules. Le guide complet commence par [Les extensions déclaratives](src/content/docs/extensions/index.md), puis [Votre première extension déclarative](src/content/docs/extensions/premiere-extension.md).

## Lire le site en local

```bash
npm run dev       # http://localhost:4321/polymorph-docs/
npm run build     # site statique dans dist/
```

## Contribuer

Corrections et compléments sont les bienvenus, par issue ou par pull request. Avant de proposer une modification :

```bash
npm test          # tests de l'outil
npm run build     # le site se construit
```

Les fichiers de `contrats` viennent du produit : ils ne se modifient pas à la main.

Le site est servi sous `/polymorph-docs/` (GitHub Pages) : dans les pages, un lien vers une autre page est relatif (`[Le manifeste](../manifeste/)`), jamais absolu (`/extensions/manifeste/`).

## Licences

- Documentation (`src/content/docs`) : [CC BY 4.0](LICENSE-DOCS.md).
- Exemples, modèle, outil et configuration du site : [MIT](LICENSE). Vous pouvez reprendre librement le code des exemples dans vos extensions.
- Le nom et le logo de Polymorph ne sont couverts par aucune de ces licences.
