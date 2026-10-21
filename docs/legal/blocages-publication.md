# Publication des pages — décision en attente

Actualisation : voir [les faits techniques vérifiés et les quatre dernières réponses attendues](v1-decisions.md). Cette synthèse réduit les questions restantes et remplace les demandes déjà résolues techniquement.

État du 21 octobre 2026 : MyCorpus3D est déjà public, indépendant, gratuit et en développement, sans paiement ni abonnement (confirmation de l’éditeur). La branche `chore/legal-readiness` prépare les changements ; elle ne doit pas être fusionnée/déployée avec les documents incomplets. La gratuité ne supprime pas l’information due aux utilisateurs actuels.

## Éléments bloquants à fournir ou décider

1. **Responsable et publication** : identité réelle du responsable du projet et du traitement des données, coordonnées de contact effectives pour le public et les droits RGPD. Déterminer le régime de l’édition (professionnelle ou non) et les coordonnées devant figurer publiquement. « Projet indépendant » n’est pas une qualification juridique suffisante ; ne pas supposer qu’une société est nécessaire ni qu’un pseudonyme suffit.
2. **Hébergeur réel** : entité contractuelle Railway, adresse et téléphone vérifiés, région du service et du volume, éventuels intermédiaires/CDN. La marque Railway seule est insuffisante pour finaliser l’information.
3. **Destinataires et IA actifs en production** : Google OAuth activé ou non ; fournisseurs de dialogue, génération et OCR réellement utilisés ; données envoyées, pays, accès, conservation et réutilisation éventuelle. Vérifier contrats de sous-traitance et garanties des transferts applicables. Ne fournir aucune clé secrète.
4. **Conservation et effacement** : politique justifiée pour comptes inactifs, historique, documents, signalements, journaux et sauvegardes ; modalités de purge/restauration correspondantes. Le code conserve actuellement beaucoup de données jusqu’à suppression manuelle ; cela n’établit pas une durée justifiée pour chaque finalité.
5. **Conditions d’utilisation finales** : décider du public et du traitement des mineurs, confirmer les bases légales et l’information, valider la version des CGU et organiser l’information des comptes existants. Aucun ancien compte ne recevra d’acceptation rétroactive.
6. **Vérification de l’exploitation** : confirmer l’inventaire réel des cookies et scripts en production, les droits sur les contenus publiés et les attributions, ainsi que la correspondance entre les textes et les opérations de sécurité/droits effectivement assurées.

## Ce qui n’est pas exigé artificiellement

Aucune création de société, immatriculation, TVA, capital, CGV, tarification ou paiement n’est demandée par le seul fait que cette version est gratuite. Les mentions professionnelles dépendront du statut et de l’activité réels. Une future offre payante nécessiterait un dossier distinct ; ce n’est pas le périmètre actuel.

## Ordre de finalisation avant fusion

Compléter les points ci-dessus, adapter les textes et enlever les champs de préparation, faire relire les choix juridiques et vérifier les contrats. Régénérer les pages et leur version, exécuter les contrôles et examiner le diff vers main. Autoriser ensuite explicitement la fusion/publication. Les pages préparatoires restent uniquement sur la branche ; aucun push vers main ni déploiement dans cette mission.

Sources officielles consultées : [CNIL, information des personnes](https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence), [CNIL, identification des rôles](https://www.cnil.fr/fr/rgpd-comment-bien-identifier-son-role), [Service public, mentions des sites professionnels](https://entreprendre.service-public.gouv.fr/vosdroits/F37351). Le régime exact de l’éditeur indépendant doit être vérifié, sans déduire son statut de la gratuité.

## Vérification de cette adaptation

Le 21 octobre 2026 : 11 tests Node de comptes et 13 tests navigateur réussis, couvrant inscription/connexion, preuve des CGU, flashcards et révision, examen QCM, atlas mobile, footer, cookies et pages publiques à 320/375/768/1440 px. Build, contrôle des pages générées et `git diff --check` réussis. Design inchangé. Ces contrôles locaux ne valident pas les faits contractuels ou les configurations de production manquants.
