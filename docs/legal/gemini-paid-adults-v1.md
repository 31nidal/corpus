# V1 Gemini payant et réservée aux majeurs — proposition à valider

Préparée le 21 octobre 2026 sur `chore/gemini-adults-readiness`. Cette étude et les clauses préparatoires ne constituent pas une implémentation du contrôle d’accès ni une certification de conformité. Aucun changement du backend, des fournisseurs ou de la production. Aucun contrôle d’âge, contrat de vérification ou compte payant n’est présumé actif. Aucune fusion, aucun push ni déploiement.

La demande actuelle remplace la cible précédente d’un service ouvert aux mineurs : conserver Gemini, étudier un produit destiné aux personnes de 18 ans ou plus, et soumettre les changements avant mise en production. Le choix de la méthode de vérification et son coût restent à valider. Le service peut rester gratuit pour les utilisateurs alors que l’éditeur paie l’API ; aucune CGV ni facturation utilisateur n’est nécessaire à ce seul titre.

## 1. Conditions à satisfaire

Les [conditions Gemini API](https://ai.google.dev/gemini-api/terms), effectives au 23 mars 2026 et vérifiées aujourd’hui, excluent les clients destinés aux moins de 18 ans ou susceptibles d’être utilisés par eux. Elles exigent Paid Services pour un client accessible dans l’EEE, en Suisse ou au Royaume-Uni. Pour l’API, ce statut dépend d’un projet associé à un compte de facturation actif. Une autorisation parentale ne remplace pas cette condition d’âge. L’usage pédagogique doit rester distinct du conseil médical personnalisé et de la pratique clinique. Ces conditions définissent aussi un service destiné aux développeurs pour des usages professionnels/business : vérifier l’éligibilité du projet réel, sans déduire qu’une société ou une vente aux utilisateurs serait automatiquement exigée.

Google ne prescrit pas dans ce texte une méthode unique de contrôle d’âge et n’y garantit pas qu’une simple déclaration suffise. La proposition ci-dessous est une mesure de réduction du risque à faire évaluer dans le contexte réel du produit, pas un certificat d’acceptation par Google.

## 2. Écarts constatés dans le code conservé

| Zone | État existant | Préparation nécessaire |
| --- | --- | --- |
| Application et atlas invité | Ressources et mode invité accessibles sans preuve d’âge | Contrôle de l’accès au produit, y compris accès directs aux espaces et ressources protégées |
| Inscription e-mail | Pas de contrôle de majorité ni preuve des CGU sur main | Parcours d’éligibilité et présentation des CGU avant accès aux fonctions |
| Google OAuth | Identité Google vérifiée, aucun âge établi | Même contrôle de majorité ; Google login n’est pas une preuve 18+ |
| `/api/chat` | Appel direct possible sans session de compte | Authentification/éligibilité vérifiées avant toute construction de contexte ou appel distant |
| Study/Flashcards | Autorisation par compte, sans majorité vérifiée | Vérifier l’éligibilité sur chaque action, y compris routes historiques et régénérations |
| OCR automatique | Un scan peut déclencher l’envoi du PDF dès l’import | Information préalable et contrôle serveur avant lecture/transmission |
| OCR pages manquantes | `transcribeMissingPages` transmet le buffer PDF complet | Ne jamais promettre l’envoi des seules pages manquantes dans cette version |
| Gemini | Clé/configuration sélectionne le fournisseur ; coûts estimés disponibles | Prouver projet/clé/facturation réels ; une estimation n’est pas une attestation de Paid Services |
| Publication statique | Serveur livre fichiers publics et bundles | Définir un périmètre protégé côté serveur/proxy, pas uniquement une modale React |
| Droits des personnes | Export/suppression disponibles mais couverture partielle | Compléter le traitement des demandes sans exiger une nouvelle preuve d’âge pour exercer ces droits |

Fichiers examinés : `server/api.mjs`, `server/accounts.mjs`, `server/index.mjs`, `server/ai/gemini-client.mjs`, `server/ai/pedagogy.mjs`, `server/ai/generation.mjs`, `server/study.mjs`, `server/study/ocr-pages.mjs`, `server/flashcards/handler.mjs`, `src/account/AccountPanel.tsx`.

## 3. Architecture d’accès proposée

### Périmètre et expérience

Le site doit être effectivement destiné aux adultes : communication, onboarding et accès doivent correspondre à cette cible. Ne pas conserver une offre explicitement adressée aux mineurs en ajoutant seulement un bouton 18+. Prévoir une page d’accueil publique informative, les cinq pages juridiques, l’aide et le parcours d’éligibilité. Le produit (atlas interactif inclus) est accessible après validation. Ne pas présumer que laisser le produit ouvert et bloquer seulement les boutons IA résout le critère contractuel portant sur le service.

Proposition principale : compte de produit obligatoire, puis preuve de majorité auprès d’un tiers indépendant, avec retour d’un attribut 18+ vérifiable et minimisé. Le choix du prestataire, ses contrats, pays, mécanismes et accessibilité doivent être évalués avant intégration. Ne pas collecter directement de copie d’identité, photo, date de naissance complète ou biométrie dans MyCorpus3D. Le tiers peut lui-même traiter des données d’identité : cela doit être évalué et expliqué, sans prétendre qu’aucune donnée n’est traitée.

Les [travaux CNIL sur la vérification d’âge](https://cnil.fr/fr/verification-de-lage-en-ligne-trouver-lequilibre-entre-protection-des-mineurs-et-respect-de-la-vie) éclairent la minimisation et la séparation des acteurs. Le référentiel ARCOM pour les contenus pornographiques n’est pas présenté comme applicable à l’atlas médical. Aucune reconnaissance faciale ni certification réglementaire n’est supposée obligatoire ici.

Une simple case, une date de naissance libre, un cookie localStorage, une carte bancaire ou l’identité Google ne seront pas acceptés comme preuve suffisante par défaut de cette proposition. Pas de paiement symbolique imposé pour vérifier l’âge. Prévoir une assistance accessible et un moyen de contestation auprès du contact effectif, sans permettre à un administrateur de valider l’éligibilité sans preuve autorisée.

### Autorisation serveur

Le futur service d’éligibilité doit conserver uniquement un identifiant de preuve opaque, le résultat 18+, la méthode, l’émetteur, la version de politique, les dates de vérification/expiration et la révocation ; éviter de conserver le jeton brut. Définir avant collecte la base légale et la durée de ces éléments. Ne pas les transmettre à Gemini. L’attestation de majorité n’est pas un consentement général aux traitements.

Le retour de vérification doit contrôler signature, émetteur, destinataire, seuil 18+, expiration, nonce à usage unique et liaison au compte/session. L’état OAuth/CSRF, les changements de compte, les rejeux et la révocation doivent être traités. Le frontend ne fournit jamais seul un booléen d’autorisation. Après validation, renouveler la session ; le serveur reste la source d’autorité.

Prévoir une fonction centrale `requireEligibleAccount` utilisée par les handlers d’API et une couche cohérente dans le serveur de fichiers/proxy. Une liste explicite de routes publiques évite qu’une future route soit ouverte par défaut. Les URLs directes de ressources, aliases, HEAD/ranges, navigation arrière, caches, imports et partages doivent être couverts ; une protection uniquement Vite-dev ne protège pas Railway. Les fichiers déjà téléchargés par le passé ne peuvent pas être révoqués rétroactivement.

Les comptes existants restent intacts mais doivent passer l’éligibilité avant le prochain accès au produit après mise en service. Aucune preuve ancienne n’est inventée, aucun compte ni document n’est supprimé automatiquement. Si une personne est mineure ou non vérifiée, proposer l’assistance et un canal authentifié limité à l’export/effacement et à la gestion des droits. L’accès à ces droits ne doit jamais déclencher Gemini. Aucun résultat privé de mineur ne doit être réinjecté dans une génération pendant cette transition.

### Parcours de requête attendu

1. Classer la route (public juridique, authentification/éligibilité, droits, produit).
2. Vérifier session, origine et droits sur la ressource.
3. Exiger l’éligibilité 18+ valide pour le produit ; refus avant chargement d’un PDF ou appel fournisseur.
4. Pour une génération, vérifier l’état de conformité opérationnelle du projet Gemini, quota et budget.
5. Construire un contexte minimal ; générer et valider avec les mêmes schémas/critères pédagogiques qu’actuellement.
6. Enregistrer le résultat et sa provenance. Réévaluer l’autorisation pour les travaux différés ; ne pas lancer après révocation.

## 4. Gemini payant : contrôle d’exploitation

Conserver le moteur Gemini et le modèle de production une fois identifié, les prompts, schémas, citations sources, couverture et validations. Aucune substitution locale destinée à économiser ou à contourner un défaut de conformité. Le comportement local actuel en cas d’erreur peut rester une aide explicitement annoncée, mais ne doit jamais contourner un refus d’accès ou masquer une perte d’éligibilité du projet.

Avant lancement, établir l’association entre le secret déployé, le projet Google Cloud réel, la région autorisée et les conditions contractuelles applicables. Ne pas copier la clé dans un rapport. Séparer préproduction et production, ainsi que leurs budgets et clés. Vérifier la clé restreinte/auth actuelle, rotation et accès au secret uniquement côté backend. Aucun `VITE_*` secret.

La [documentation de facturation](https://ai.google.dev/gemini-api/docs/billing) décrit l’activation d’un compte associé, le palier payant et, selon le compte, les exigences de prépaiement/crédit disponible. Vérifier dans AI Studio les états du projet et du plan effectifs ; ne pas supposer qu’une ancienne liaison bancaire suffit indéfiniment.

Un contrôle automatisable en lecture seule peut utiliser [`projects.getBillingInfo`](https://docs.cloud.google.com/billing/docs/reference/rest/v1/projects/getBillingInfo), avec permission de lecture et identité distincte du secret de génération. Compléter par l’état Gemini/AI Studio : les informations de liaison Cloud Billing ne prouvent pas, seules, que tous les prérequis d’utilisation sont remplis. Un drapeau `BILLING_APPROVED=1`, une clé valide ou le succès d’un appel ne valent pas preuve complète.

Prévoir un état serveur horodaté, lié au projet et à la version du déploiement, renouvelé périodiquement et invalidé sur changement de clé/projet ou perte de facturation. La fréquence et la tolérance de panne devront être définies avant implémentation. Si la vérification est inconnue/périmée ou le service non éligible, ne pas envoyer de nouvelles données et ne pas basculer vers un projet gratuit. Cela conserve Gemini comme moteur choisi tout en imposant les conditions d’utilisation, plutôt que de promettre une disponibilité illimitée.

Les alertes de coûts ne sont pas à elles seules un plafond de dépenses. Conserver les quotas applicatifs, limites de concurrence, taille et reprises bornées. Tester la perte de crédit, la fermeture du compte, le changement de clé et le retour à un état valide.

## 5. Protection des documents et données

Le [régime payant Gemini](https://ai.google.dev/gemini-api/terms) annonce l’absence d’utilisation des entrées/sorties pour améliorer les produits Google et renvoie à un DPA, mais conserve des traitements anti-abus et internationaux. La [documentation anti-abus](https://ai.google.dev/gemini-api/docs/usage-policies) annonce actuellement 55 jours pour prompts, contexte et résultats concernés, avec revue autorisée des contenus signalés. Ce délai est distinct des sauvegardes Railway et ne permet pas de promettre un effacement immédiat chez Google. Vérifier son applicabilité effective au contrat et aux fonctionnalités utilisés ; réviser le texte si la politique change.

Actions prévues :
- Afficher avant import/génération les destinataires et types de données envoyés ; confirmer que l’utilisateur possède les autorisations sur le support. Écarter dossiers patients, données de santé personnelles et documents confidentiels de tiers. Une simple case ne remplace pas les mesures de minimisation.
- Extraire localement les PDF texte et transmettre uniquement les passages utiles à la tâche. Ne jamais ajouter e-mail, nom de compte, historique entier, preuve d’âge ou secret au contexte IA. Les noms présents dans le document lui-même peuvent rester : ne pas annoncer une anonymisation automatique.
- Pour les scans et PDF mixtes : étape préalable annonçant explicitement l’envoi du PDF complet dans l’implémentation actuelle, y compris l’OCR automatique. Pas d’envoi silencieux avant l’action informée. Une future limitation aux seules pages utiles exige une préparation locale sûre ; elle n’est pas réputée acquise.
- Vérifier autorisation propriétaire à chaque lecture/téléchargement/régénération, limites des fichiers, noms, signature/type, volumes et quotas. Conserver les protections existantes contre données non fiables et injection d’instructions ; renforcer leur traitement sans retirer les mécanismes de validation/source.
- Aucun contenu de PDF, prompt complet, réponse brute, cookie, jeton d’âge ou clé dans les logs/erreurs. Garder des métriques minimales de tâche, temps et statut ; vérifier aussi journaux Railway et fournisseur. Les erreurs Gemini sont déjà normalisées dans le client existant.
- Documenter DPA, sous-traitants, garanties et transferts réels pour Google, Railway et le futur vérificateur d’âge. Réexaminer si une analyse d’impact est nécessaire avant toute vérification intrusive ; ne pas l’affirmer automatiquement obligatoire pour tous les modes.
- Compléter export et suppression des données Study/Flashcards/fichiers images, tester l’isolation et traiter les demandes sans exiger de nouvelle majorité. Le périmètre partiel de main ne doit pas être décrit comme exhaustif.
- Maintenir les purges générales désactivées conformément à la décision précédente. Les propositions 24/12 mois restent non appliquées ; une politique réellement justifiée demeure à arrêter avant publication. Ne pas inventer une rétention de sauvegarde.

La gratuité du site n’implique ni gratuité de Gemini ni absence de données personnelles. Une action volontaire « Générer » ne remplace pas la détermination de la base légale RGPD. L’identité du responsable, l’anonymat LCEN et le contact actif restent des sujets distincts non résolus par le passage 18+.

## 6. Changements de textes préparés

Les pages de cette branche restent des brouillons. Elles décrivent une V1 envisagée pour adultes avec Gemini payant ; elles n’affirment pas que les barrières ou la facturation sont déjà opérationnelles. Les mentions relatives aux mineurs dans les rapports précédents sont historiques et ne constituent plus la cible proposée.

Avant publication : préciser le public 18+, le contrôle retenu et ses limites, les règles de compte, l’effet sur les anciens comptes, la gratuité du service et les limites pédagogiques dans les CGU. Documenter les destinataires, données transmises, bases légales, transferts, anti-abus, preuve de majorité, conservation et droits dans la confidentialité. Informer les utilisateurs existants et recueillir l’acceptation de la nouvelle version lorsque nécessaire, séparément de la preuve de majorité ; ne pas fabriquer d’acceptation rétroactive.

## 7. Validation et maintien fonctionnel

Matrice de recette exigée avant mise en production :

| Situation | Résultat attendu |
| --- | --- |
| Visiteur sans preuve ; route API directe ; lien profond ; ressource protégée | Produit refusé côté serveur, zéro appel Gemini ; accès aux mentions et à l’aide conservé |
| Simple déclaration 18+, localStorage modifié, Google login seul | Aucun accès supplémentaire accordé |
| Retour signé invalide/expiré/mauvais destinataire/rejeu/mauvais compte | Refus ; aucun contournement admin implicite ni appel distant |
| Compte adulte avec preuve valide et projet payant vérifié | Toutes les fonctions existantes accessibles |
| Ancien compte non vérifié/mineur ; droit d’accès ou effacement | Accès limité aux droits/assistance, sans perdre les données ni appeler Gemini |
| Cloud Billing inconnu/inactif, crédits manquants, projet changé, preuve de contrôle périmée | Pas de nouvel envoi ; erreur claire ; aucun repli sur une clé gratuite |
| PDF texte, scan et PDF mixte | Envoi conforme à l’information préalable, source et qualité conservées |
| Quota, annulation, erreur fournisseur, double clic, job différé/révocation | Même robustesse, aucun appel indû, aucune duplication |

Recette qualité sur des supports synthétiques autorisés : génération de cartes depuis texte/cours/PDF/erreurs QCM ; régénération carte et note ; QCM avec distracteurs et preuves ; résumés et synthèses de révision ; OCR complet/mixte ; exports, sauvegarde, révision et FSRS ; comptes e-mail/Google ; atlas et mobile. Comparer les critères existants (couverture, source, schémas, conservation, erreurs, latence) avant/après sans affaiblir les assertions pour faire passer un contrôle. Les clients simulés testent les barrières ; une recette payante finale, bornée et autorisée, vérifiera le modèle réel avec uniquement des documents de test.

Les tests de lien/génération documentaire de cette préparation ne valident pas ces barrières futures. Aucune vérification d’identité ni appel Gemini facturé n’a été exécuté.

## 8. Décisions attendues avant implémentation complète

1. Valider le périmètre produit réservé aux 18 ans et plus, y compris fin du mode invité non vérifié et transition des comptes existants, tout en gardant les droits accessibles.
2. Valider le principe d’un tiers de preuve de majorité respectueux de la vie privée, puis sa méthode, ses contrats, son coût et son accessibilité après comparaison. Aucun prestataire choisi ni acheté ici.
3. Établir les accès de lecture et la preuve du projet Gemini payant réel, du modèle, des garanties et de l’hébergement ; arrêter budget et politique de contrôle. Aucune clé à fournir dans le chat.
4. Résoudre responsable du traitement/contact effectif, durées et procédures de droits, puis approuver les textes et la recette. La décision 18+ ne lève pas ces blocages.

Après validation : implémentation de la barrière centrale et du parcours, intégration du vérificateur et du contrôle d’exploitation, protections d’import/données, tests exhaustifs puis revue du diff. Toute fusion ou mise en production reste soumise à une validation explicite ultérieure.
