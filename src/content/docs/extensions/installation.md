---
title: Installation et cycle de vie
description: Comment un établissement examine, installe, met à jour, désactive et désinstalle une extension.
---

Une extension s'installe **établissement par établissement**. C'est l'administrateur de l'établissement qui la téléverse : la permission « Installer, activer et désactiver les modules » (`modules.gerer`) le permet. Tout se passe dans **Paramétrage → Modules**, partie « Extensions ».

Sur une plateforme qui héberge **plusieurs établissements**, c'est l'exploitant de la plateforme qui la téléverse, pour le compte de l'établissement : dans la tour de contrôle, onglet **Modules** de la fiche de l'établissement. L'examen, l'installation et la désinstallation sont les mêmes. L'établissement voit ses extensions, sans pouvoir en ajouter ni en retirer.

## 1. Examen

L'administrateur choisit l'archive `.poly`. Polymorph la contrôle entièrement, puis affiche ce qu'elle demande, sans encore rien installer :

- le nom, la version et l'éditeur ;
- les **droits ajoutés**, et les rôles qui les recevront ;
- les **données** : chaque entité et son nombre de champs ;
- les **cartes** ajoutées aux fiches ;
- les **scripts**, avec le hook de chacun ;
- l'**empreinte SHA-256** de l'archive.

Si l'archive est invalide, l'examen liste toutes les erreurs, chacune avec le chemin de la clé fautive. Ce sont les mêmes que celles de l'outil de vérification : voir [Erreurs courantes](../erreurs/).

## 2. Installation

L'administrateur confirme. L'archive est envoyée une seconde fois avec l'empreinte examinée : si le fichier a changé entre-temps, l'installation est refusée. Le serveur installe ensuite **exactement** le contenu examiné, en une seule transaction : tout ou rien.

Dès l'installation, l'extension est **active** :

- ses permissions existent, et les rôles du manifeste les ont reçues ;
- sa tuile apparaît sur l'accueil des utilisateurs autorisés, ses cartes sur les fiches ;
- ses scripts s'exécutent à chaque déclenchement de leur hook.

Les scripts apparaissent dans **Paramétrage → Automatisations**, en lecture seule, avec leur journal d'exécution.

## 3. Mise à jour

Une archive du même `id`, avec une **version plus récente**, met l'extension à jour. Une version égale ou plus ancienne est refusée.

| Élément | À la mise à jour |
|---|---|
| Enregistrements | conservés |
| Entités, champs, écrans, cartes | remplacés par ceux de la nouvelle version |
| Scripts et leur journal | remplacés |
| Permissions | celles de la nouvelle version ; celles qu'elle ne déclare plus sont supprimées |
| Droits des rôles | inchangés : une nouvelle permission n'est donnée à aucun rôle, l'établissement l'attribue lui-même |
| État | l'extension est réactivée |

Un champ retiré n'est plus affiché, mais ses valeurs restent dans les enregistrements.

## 4. Désactivation

L'administrateur peut désactiver une extension : sa tuile, ses écrans, ses cartes et ses scripts s'arrêtent, mais ses données restent. La réactiver remet tout en place.

## 5. Désinstallation

La désinstallation supprime tout ce que l'extension a apporté :

- ses enregistrements ;
- ses scripts et leur journal ;
- ses permissions ;
- son manifeste.

Avant de confirmer, l'administrateur voit combien d'enregistrements seront supprimés. Il ne reste ensuite que deux lignes du journal d'activité : l'installation et la désinstallation.

## Traçabilité

Chaque installation, mise à jour, activation, désactivation et désinstallation est inscrite au journal d'activité de l'établissement, avec son auteur et la version concernée.
