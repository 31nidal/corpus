# Audit initial — MyCorpus3D

État étudié : commit cf63e29, 20 octobre 2026. Audit du dépôt, pas une certification juridique ni un audit du compte Railway. Branche dédiée, aucun déploiement autorisé.

## Constats avant modification

| Domaine | Preuve dans le dépôt | Constat / risque |
|---|---|---|
| Compte | server/accounts.mjs, src/account | E-mail non vérifié, pseudonyme, mot de passe scrypt, récupération par code, sessions hachées 30 jours ; pas de preuve CGU. |
| Google | accounts.mjs | OAuth facultatif si configuré, PKCE/state/nonce, scopes openid/email/profile ; tokens non stockés ; aucun justificatif d’acceptation CGU. |
| Stockage | accounts.mjs, study.mjs, flashcards/schema.mjs | SQLite persistant, PDF uploads/user, images flashcard_assets ; isolation par propriétaire. Absence de purge des comptes inactifs. |
| Droits | compte export/delete | Export limité à progression/historique ; PDF supprimés avec compte mais images orphelines seulement purgées au prochain accès flashcards ; signalements sans lien compte non couverts. |
| IA | api.mjs, providers.mjs, ai/pedagogy.mjs, ollama-provider.mjs | Local, endpoint HTTP, Ollama ou Gemini selon configuration. Questions, extraits et, pour OCR, pages/PDF peuvent sortir du service. Configuration réelle, contrats, réutilisation et pays inconnus. |
| PDF | study.mjs, study/pdf-layout.mjs | PDF jusqu’à 25 Mio, jusqu’à 25 documents par défaut ; fichier, texte, pages, sections, QCM et synthèses persistants jusqu’à suppression. Copies de contenus dans cartes/historique possibles. Pas de dossier patient attendu. |
| Traceurs | accounts.mjs, account/store.ts, index.html, package.json | Session 30 jours ; état OAuth 10 minutes ; localStorage invité et thème, sessionStorage de synchronisation. Aucun SDK d’audience/publicité ou paiement trouvé. Pas de raison de simuler un consentement à des catégories absentes. Infrastructure externe non inspectée. |
| Signalements | feedback.mjs | E-mail facultatif, passage et correction ; pas de durée de purge ni rattachement compte. Contact nécessaire pour droits sur ces données. |
| Vente | recherche src/server/package | Aucun checkout, abonnement ou tarification activable trouvé. Quotas techniques ≠ vente. Pas de CGV fictives. |
| Licences | public/models/**/LICENSE.txt, public/licenses | BodyParts3D BY-SA 2.1 Japan dans fichiers, divergence page BY 4.0 déjà documentée ; HRA BY 4.0 ; terminologie Z-Anatomy BY-SA 4.0 ; polices OFL. Attributions à conserver. |
| Sécurité | security.mjs, comptes/API | CSP, contrôle origine, HttpOnly/SameSite, Secure en HTTPS, mots de passe hachés, quotas et sessions révocables. Pas de preuve de chiffrement disque/sauvegardes, procédure incidents, MFA exploitant ou tests d’intrusion. |

## Obligations et priorités

Avant ouverture commerciale : identité/contact/directeur de publication et hébergeur vérifiés ; information RGPD art. 13/14 ; registre et bases légales art. 6 ; contrats sous-traitants art. 28 et transferts chapitre V ; durées art. 5 ; processus droits art. 12–22 et incidents art. 33/34 ; sécurité art. 32. Les durées ne sont pas des valeurs légales universelles. Apprécier la nécessité d’une AIPD/DPO, les mineurs, les rôles établissement/éditeur et l’usage réel de l’IA. Ne pas qualifier automatiquement l’outil de dispositif médical ou d’IA à haut risque : examiner finalité et usages, notamment évaluation/admission institutionnelle.

L’acceptation contractuelle des CGU est distincte d’un consentement RGPD. Aucun consentement marketing ou transfert ne doit être déduit de l’inscription. Les traceurs nécessaires sont exemptés du consentement ; toute future audience non exemptée devra être bloquée avant choix, refus aussi simple qu’acceptation et retrait possible.

## Références officielles consultées

- [Mentions d’une société — Service public](https://entreprendre.service-public.gouv.fr/vosdroits/F37351) et [entrepreneur individuel](https://entreprendre.service-public.gouv.fr/vosdroits/F31228).
- [RGPD, droits et information — CNIL](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3).
- [Durées — CNIL](https://cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).
- [Cookies — CNIL](https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi).
- [Transferts — CNIL](https://www.cnil.fr/fr/transferts-de-donnees-hors-ue-le-cadre-general-prevu-par-le-rgpd).
- [Sous-traitance — CNIL](https://www.cnil.fr/fr/clauses-contractuelles-types-entre-responsable-de-traitement-et-sous-traitant).
- [Transparence IA, orientations Commission européenne](https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations). Applicabilité et calendrier à confirmer avant lancement selon rôle/fonctions, sans présumer une classification réglementaire.

## Décisions et informations requises

1. Éditeur : personne physique/EI/société, nom/dénomination, forme, capital si applicable, adresse professionnelle, SIREN/RCS/registre, TVA si applicable, téléphone, e-mail public et RGPD, directeur de publication.
2. Hébergement : cocontractant légal Railway, adresse/téléphone vérifiés sur contrat, région de calcul et volume, CDN/proxy/DNS, pays de support, sous-traitants et contrats/DPA.
3. IA : prestataires réellement activés et modèles, offres contractuelles, lieux, durées, entraînement/réutilisation, garanties transferts, accès des équipes ; documenter les flux OCR.
4. Conservation : comptes inactifs, historique des versions de notes/messages, signalements, journaux, sauvegardes (rotation, restauration et propagation effacement), archives contractuelles et demandes RGPD. Préparer une purge testée après décision.
5. Exploitation : procédure droits (réponse en principe sous un mois), incidents, accès administrateurs, sauvegardes/restauration, mesures chiffrement et gestion des clés.
6. Public : âge minimum, autorisation mineurs, usages établissements, contrats B2B, rôle RGPD, besoins AIPD/DPO ; validation du classement IA et de la finalité pédagogique.
7. Propriété : confirmer titularité/licences des textes, schémas, logo et dépendances ; vérifier la divergence BodyParts3D avant commercialisation. Ne pas supprimer les attributions existantes.
8. Vente future : offre/prix TTC/TVA/périodicité/engagement, renouvellement, résiliation en ligne, médiateur, rétractation et demande expresse d’exécution si applicable, garanties des services numériques ; CGV et paiement seulement après décision et validation juriste.

Les champs [À COMPLÉTER] doivent être renseignés et les documents relus humainement avant fusion ou publication. Le contenu technique seul ne prouve pas la conformité du service exploité.
