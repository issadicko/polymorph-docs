# Contrats de Polymorph

Les interfaces sur lesquelles une extension s'appuie. Elles ne changent pas de façon incompatible au sein d'une même version majeure du produit (voir [Versions et compatibilité](../src/content/docs/extensions/versions.md)).

| Fichier | Contrat |
|---|---|
| [`polymorph.schema.json`](polymorph.schema.json) | le manifeste d'une extension déclarative (`format` 1), en JSON Schema 2020-12 |
| [`hooks.json`](hooks.json) | les hooks : sorte, variables et leurs champs, fonctions du produit, limites, version de KodiScript |
| [`polymorph-native.schema.json`](polymorph-native.schema.json) | le manifeste d'une extension native (`format` 1, `"type": "native"`), en JSON Schema 2020-12 |

Ces fichiers sont produits par Polymorph à partir de son code, et copiés ici à chaque version du produit. Ne les modifiez pas à la main : l'outil de vérification et le catalogue des hooks du site les lisent tels quels.

Version décrite : **Polymorph 1.0.0** (champ `version` de `hooks.json`).

Pour la complétion dans votre éditeur, déclarez le schéma en tête de votre manifeste :

```json
{ "$schema": "https://raw.githubusercontent.com/issadicko/polymorph-docs/main/contrats/polymorph.schema.json" }
```
