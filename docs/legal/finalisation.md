# Préparation juridique — intégration et finalisation

État actuel de la branche : [V1 sans génération externe, limites du moteur intégré et purges désactivées](gemini-off-v1.md). Les bilans de conservation et de configuration IA ci-dessous sont historiques.

Dernière vérification : [accès de production, droits, Gemini et maintenance de conservation](verification-production-et-droits.md). Cette mise à jour remplace les points déclarés non implémentés dans le bilan initial ci-dessous.

Branche : `chore/legal-readiness`. Ni fusion dans main ni déploiement. Le 21 octobre 2026, l’éditeur confirme que mycorpus3d.com est déjà public, indépendant, gratuit et en développement, sans paiement ni abonnement. Les textes sont adaptés à cette version actuelle, sans supposer l’existence ou la nécessité d’une société. Les renseignements réels manquants restent à compléter. Voir la [liste actuelle des blocages de publication](blocages-publication.md).

## Livré techniquement

- Cinq pages statiques publiques sans connexion, avec sommaire, date, liens entre documents et styles mobiles : mentions légales, confidentialité, CGU, cookies, propriété intellectuelle. Les champs inconnus restent visibles. Pas de CGV puisque le code n’expose pas de vente.
- Footer juridique commun à l’application, y compris en mode invité. Pages indépendantes du chargement 3D/du compte.
- Inscription e-mail : case obligatoire non cochée et contrôle serveur booléen/version. Insertion transactionnelle du compte et de la preuve (`account_terms_acceptances`).
- Google : étape explicite avant redirection ; version/date liées à l’état OAuth. La preuve est créée avec un nouveau compte ou à la suite d’une nouvelle acceptation explicite lors du parcours Google. La liaison d’un compte existant conserve le parcours sécurisé ; aucun ancien compte ne reçoit une acceptation fabriquée.
- Export du compte élargi aux données Study (texte/pages/sections/synthèses/questions), cartes/notes/images/révisions/brouillons et preuve CGU. Filtrage par propriétaire. Les fichiers originaux restent téléchargeables séparément via des liens authentifiés ; le JSON ne contient ni mots de passe ni jetons de session.
- Suppression : PDF et images du propriétaire supprimés immédiatement du stockage actif ; cascade SQLite conservée, nettoyage de la file locale du compte supprimé. La restauration des sauvegardes reste une obligation opérationnelle à définir.
- Cookies : inventaire réel, vérification des préférences sans faux consentement. Aucun outil facultatif trouvé ; pas de bannière artificielle. Effacement des données invitées avec confirmation, sans toucher aux autres clés ni à la file de synchronisation d’un compte.
- Information IA aux points d’entrée du dialogue, de Mes cours et des cartes : erreurs possibles, vérification des sources, exclusion des données de patients, lien vers l’information sur les destinataires.
- Aucune licence, attribution, donnée anatomique ou source originale supprimée.

## Obligations restant ouvertes

Les pages préparatoires ne doivent pas être publiées tant que les champs et l’exploitation ne sont pas validés. Ces points concernent aussi le service gratuit déjà accessible ; ils ne sont pas reportés à une future commercialisation. La liste détaillée des renseignements attendus figure dans [l’audit initial](audit-initial.md#décisions-et-informations-requises).

| À décider/vérifier | Pourquoi ce n’est pas finalisé dans le code |
|---|---|
| Responsable, contact, publication et hébergeur | Identité et coordonnées réelles à vérifier avant publication. Le régime professionnel/non professionnel doit être déterminé ; SIREN, TVA et capital ne sont pas automatiquement requis pour ce projet. |
| Prestataires IA/Google/Railway et transferts | La configuration et les contrats réels ne se déduisent pas du dépôt. Pas de promesse de stockage UE ni de non-entraînement inventée. |
| Durées des comptes inactifs, historiques, signalements, logs et sauvegardes | Pas de durée universelle ; arbitrage proportionné puis purge et tests à prévoir. Le délai actuel jusqu’à suppression ne vaut pas justification de conservation indéfinie. |
| Contact droits et traitement des signalements anonymes | Export/effacement self-service couverts, mais le contact RGPD doit fonctionner pour rectification/opposition/limitation et signalements hors compte. |
| Preuve contractuelle après effacement | La preuve courante est liée au compte et supprimée avec lui. Si une conservation probatoire distincte est justifiée, définir base, durée et accès avant toute archive séparée. |
| Anciens comptes et nouvelles CGU | Pas d’acceptation rétroactive ; prévoir notification et, selon la modification, nouveau recueil explicite avant application. |
| Mineurs, établissements, DPO/AIPD et rôle IA | Décision et analyse juridiques selon le public, les rôles et l’usage réel ; ne pas utiliser les scores pour admission/certification sans réévaluation. |
| Sécurité exploitée | Vérifier HTTPS, chiffrement, accès admins, volumes, sauvegardes, restauration, incidents et contrats ; les tests locaux ne prouvent pas ces mesures. |
| Vente future | CGV, prix, garanties numériques, médiation, rétractation, résiliation et information précontractuelle à définir avant ajout du paiement. |
| Droits des contenus | Vérifier titularité des textes/logo/schémas, conditions des supports importés et divergence de licence BodyParts3D avec le fournisseur/juriste. |

Un juriste doit relire les CGU, les bases légales, le régime mineurs/établissements, les contrats/transferts, la propriété. Un éventuel modèle de vente serait un dossier ultérieur, hors du périmètre gratuit actuel. L’exploitant doit vérifier les faits et les procédures ; la rédaction ne remplace pas ces vérifications.

## Maintenance des documents

Le contenu source est `scripts/build-legal-pages.mjs`. Régénérer avec `npm run legal:build` et contrôler avec `npm run legal:check`. Les HTML versionnés fonctionnent même sans JavaScript (sauf les boutons de gestion locale). Modifier la version dans `shared/legal.mjs` lors d’une évolution substantielle des CGU, conserver le document correspondant dans Git et organiser une nouvelle acceptation si nécessaire. Ne jamais préremplir les preuves existantes.

## Vérifications

- 229 tests Node réussis : comptes (11), flashcards (100), étude/IA/PDF (68), anatomie (22), progression (2), taxonomie (11), catalogue (6), qualité des cours (6), signalements (2), sécurité (1).
- 15 tests navigateur réussis sur serveur isolé : 11 cas juridiques/comptes/cours et quatre régressions complémentaires. Première campagne : 11 tests réussis (pages publiques aux quatre largeurs, footer, préférences, CGU, comptes/Google, menu cartes, import/extraction/synthèse/QCM/export/suppression de PDF).
- Campagne complémentaire : atlas 320/1440 px, création et révision persistante de cartes classiques, examen QCM avec rechargement et score exact : quatre tests réussis.
- `npm run legal:check`, `npm run audit:anatomy`, `npm run build` et `git diff --check` réussis. Aucun lint configuré dans ce dépôt. Avertissement historique sur la taille de certains bundles.
- Le premier diagnostic navigateur utilisait le serveur de développement déjà ouvert et configuré avec Gemini, alors que le test de synthèse attendait le générateur local. Le port de test est désormais configurable (`PLAYWRIGHT_PORT=5175`) pour lancer un serveur local déterministe sans toucher à la session de développement. L’assertion historique du titre de confidentialité a été adaptée au nouveau document.

Aucun déploiement de production n’est inclus dans ces vérifications.

## Fichiers créés et modifiés

Créés :

- `docs/legal/audit-initial.md`
- `docs/legal/finalisation.md`
- `public/cgu.html`
- `public/cookies.html`
- `public/legal-preferences.js`
- `public/legal.css`
- `public/mentions-legales.html`
- `public/propriete-intellectuelle.html`
- `scripts/build-legal-pages.mjs`
- `server/account-data.mjs`
- `shared/legal.d.mts`
- `shared/legal.mjs`
- `src/LegalFooter.tsx`
- `src/legalFooter.css`
- `tests/legal.spec.ts`

Modifiés :

- `README.md`
- `TESTS.md`
- `package.json`
- `playwright.config.ts`
- `public/confidentialite.html`
- `server/accounts.mjs`
- `src/App.tsx`
- `src/ChatAssistant.tsx`
- `src/account/AccountPanel.tsx`
- `src/flashcards/FlashcardsWorkspace.tsx`
- `src/study/MyCoursesWorkspace.tsx`
- `tests/accounts.spec.ts`
- `tests/accounts.test.mjs`
- `tests/atlas-brain-heart.spec.ts`
- `tests/atlas-interface.spec.ts`
- `tests/flashcard-draft-api.test.mjs`
- `tests/flashcard-draft-review.spec.ts`
- `tests/flashcard-generation-notes.test.mjs`
- `tests/flashcard-image-occlusion.test.mjs`
- `tests/flashcard-notes.test.mjs`
- `tests/flashcards.spec.ts`
- `tests/flashcards.test.mjs`
- `tests/gemini-integration.test.mjs`
- `tests/my-courses.spec.ts`
- `tests/pdf-and-summary-quality.spec.ts`
- `tests/product-ux.spec.ts`
- `tests/study.test.mjs`
