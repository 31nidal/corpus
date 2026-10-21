# Intégration juridique isolée depuis main

Branche : `chore/legal-publication`, créée depuis `origin/main` (`cf63e29`).

## Périmètre

Cinq pages statiques, styles et préférences invitées, footer de l’application, générateur, version documentaire et contrôles. Aucun changement des serveurs comptes/Flashcards/Study/OCR, des fournisseurs, de la configuration Vite de production, des modèles ou des éditeurs de cartes. Aucun mécanisme de purge ou de désactivation Gemini n’est repris. La prévisualisation antérieure reste indépendante.

Les textes ne prétendent plus que main collecte une preuve d’acceptation versionnée, exporte toutes les données Study/Flashcards ou efface tous les fichiers images : ces améliorations de l’autre branche ne sont pas intégrées ici. Les durées 24/12 mois restent des propositions non appliquées. Le nettoyage existant des brouillons rejetés n’est pas modifié.

## État réel observé le 21 octobre 2026

Sans compte, sans génération et sans secrets :
- `https://mycorpus3d.com/api/status` : 200, dialogue « local / Ressources locales ».
- `/api/account/session` : 200, comptes et Google disponibles.
- `/api/flashcards/generation-status` et `/api/study/generation-status` : 401. Cela ne prouve ni le fournisseur ni le modèle de ces fonctions.

Dans main, `server/api.mjs` compose toujours `createProvider`, `createGeminiPedagogy` et `createStudyProvider`. Gemini est sélectionnable par clé/configuration ; la génération, les régénérations et l’OCR peuvent lui transmettre des données. Les appels serveur ne sont pas exclusivement visibles depuis le navigateur. Le modèle par défaut du code, et la présence d’un modèle dans un `.env` local, ne prouvent pas la configuration de production. Aucun statut gratuit/payant n’est déduit d’une clé ou de compteurs d’usage.

Les données potentiellement transmises comprennent les consignes et contextes, extraits de cours, textes de cartes, corrections et, pour l’OCR, les PDF/pages nécessaires. Aucun secret ou document utilisateur n’a été utilisé pour cette vérification.

## Blocage Gemini et mineurs

[Conditions Gemini API](https://ai.google.dev/gemini-api/terms), version effective du 23 mars 2026, vérifiée le 21 octobre : les API Clients dirigés vers ou susceptibles d’être utilisés par des moins de 18 ans sont interdits. Le site reste ouvert aux mineurs sur décision de l’éditeur. Un consentement parental ou une déclaration dans les CGU ne résout pas cette incompatibilité. Le passage au payant ne résout pas la question d’âge.

Les mêmes conditions exigent Paid Services pour rendre le client disponible dans l’EEE, en Suisse et au Royaume-Uni. Pour l’API, Paid Services implique un projet associé à une facturation Cloud active. Les conditions payantes excluent l’amélioration des produits à partir des entrées/sorties mais prévoient des journaux anti-abus et des traitements internationaux. L’exception EEE/Suisse/Royaume-Uni sur le traitement des données des services gratuits ne supprime pas les restrictions d’accès ni l’obligation de service payant.

Avant publication, il faut une solution contractuelle et technique compatible, étayée par des justificatifs applicables à la configuration réelle. Cette branche n’impose ni majorité générale du site, ni blocage de fonctionnalité, ni changement de fournisseur. Ces choix nécessitent une décision et une mise en œuvre distinctes ; aucune option n’est présumée juridiquement suffisante.

La [CNIL](https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans) distingue le consentement aux traitements et la capacité de conclure un contrat. En France, pour les traitements en ligne concernés reposant sur le consentement, avant 15 ans les accords légalement requis de l’enfant et du titulaire de l’autorité parentale doivent être obtenus. Ce seuil n’est ni une autorisation générale d’utiliser Gemini ni une interdiction générale d’accès au site. L’information doit être compréhensible par les mineurs ; les bases légales et procédures doivent correspondre aux traitements réels.

## Derniers éléments nécessaires

1. **Éditeur et contact** : identité réelle du responsable, coordonnées applicables au régime d’édition retenu, adresse public/RGPD créée et surveillée. Le régime non professionnel peut permettre certaines modalités d’identification spécifiques ; ne pas inventer une société ni exiger automatiquement l’affichage d’une adresse personnelle sans examen du régime. L’information RGPD sur le responsable reste à établir.
2. **Production** : prestataires et modèle actifs pour chaque génération, facturation Cloud, contrats et garanties de transfert ; région Railway du service et du volume, sauvegardes (existence/rotation/effacement et restauration), autres intermédiaires et journaux. Sans fournir de clé.
3. **Décisions opérationnelles** : résolution de l’incompatibilité mineurs/Gemini, durées justifiées et réellement applicables (pas de fausse promesse de 24/12 mois), gestion des demandes complémentaires d’export/effacement, information/acceptation éventuelle des CGU pour les comptes nouveaux et existants.
4. **Droits** : confirmer les droits sur le logo et les contenus propres, ainsi que la provenance exacte des SVG pédagogiques. Les attributions ouvertes documentées sont conservées. Une citation ne prouve pas une permission.
5. **Contrôle final de l’exploitation** : cookies/scripts réellement injectés en production, localisation/transferts, correspondance des procédures avec les textes.

`publication-status.json` distingue les faits non vérifiés. `npm run legal:publication-check` échoue tant que les documents sont préparatoires ou que les justifications manquent. Ne pas marquer un point vérifié pour contourner un obstacle contractuel. Le build réussi n’est pas une autorisation de publication.

## Publication différée

Aucune fusion, aucun push de main et aucun déploiement de cette branche tant que les points bloquants ne sont pas résolus. Après résolution : adapter les textes, retirer les marqueurs de préparation, vérifier la version et les preuves documentaires, relancer tests/build/contrôle, examiner le diff depuis main actualisé, puis fusionner sans force-push. Vérifier ensuite le commit GitHub, la CI, le déploiement Railway et les cinq URLs publiques. Aucun succès de CI ou de déploiement n’est présumé.

## Vérifications exécutées

- 108 tests Node réussis : comptes 8, génération/Study/Gemini/OCR avec clients simulés 97, sécurité HTTP 1, liens et blocage de publication 2. Aucun appel réel de génération en production.
- 18 cas navigateur distincts validés : 15 dans la première campagne, puis le test Google corrigé pour le nouveau titre, l’atlas à 320 px et l’examen QCM. La première campagne avait un échec dû à l’attente de l’ancien titre de confidentialité ; le test et la section explicite Google sont adaptés, puis le cas a été relancé avec succès.
- Pages juridiques à 320/375/768/1440 px, ancres et fichiers de licences, cinq liens du footer, préférences invitées ciblées/annulables.
- Inscription/connexion/export/isolation, cartes manuelles et génération de brouillons, révision persistante, Cloze/Typed/Bidirectionnel, import PDF/extraction/synthèse/QCM/export/suppression, prévisualisation Gemini simulée, atlas et examen.
- `npm run build`, `npm run legal:check` et `git diff --check` réussis ; avertissement existant sur les bundles supérieurs à 500 ko. Aucun script lint disponible.
- `npm run legal:publication-check` : refus attendu (documents préparatoires et faits non vérifiés).
- Aucun diff du backend, des fournisseurs, de la configuration Vite de production, ou des composants comptes/Study/Flashcards par rapport à main.
- Les tests utilisent une base temporaire et une configuration de lancement temporaire, sans `.env` de production. Les identifiants Google de test sont fictifs. Les fichiers temporaires de lancement ne font pas partie du commit.

Aucune CI distante ni aucun déploiement ne sont présentés comme vérifiés : cette branche demeure locale jusqu’à la résolution des blocages de publication.
