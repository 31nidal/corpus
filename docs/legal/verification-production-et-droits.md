# Vérification V1 : accès, IA, droits et conservation

État du 21 octobre 2026. Projet personnel d’un particulier, gratuit, sans société ni vente. Aucun push, fusion ou déploiement autorisé. Les contacts restent vides tant que l’adresse dédiée n’existe pas.

## Accès réellement vérifiés

- Pas de CLI Railway ou gcloud, de jeton Railway dans l’environnement, de configuration ~/.railway/config.json ni d’identifiants Google Cloud applicatifs locaux. Les valeurs des secrets n’ont pas été affichées.
- Un plugin Railway a été trouvé mais n’est pas installé/connecté. Son installation et sa connexion restent nécessaires pour tenter une lecture du projet, du volume, de sa région, des sauvegardes et des variables autorisées. Aucune région n’est déduite d’un domaine, d’une adresse IP ou de l’adresse du fournisseur.
- Le projet documente Railway et un volume ; SQLite et les fichiers uploads/flashcard_assets sont vérifiés dans le code. La configuration réelle des sauvegardes reste inconnue. Leur absence dans le dépôt ne prouve pas leur absence dans Railway.
- Lecture publique sans compte : /api/status annonce Ressources locales pour le dialogue ; /api/account/session annonce les comptes et Google disponibles. Les endpoints de génération Study/cartes répondent 401 sans connexion. Aucun compte n’a été créé et aucune génération n’a été lancée en production.
- Gemini et gemini-3.5-flash-lite sont configurés localement. L’API publique ne prouve ni ce fournisseur/modèle pour les générations de production, ni le rattachement à Cloud Billing. Un coût estimé ou un quota dans le code ne constitue pas une preuve de facturation. La clé API n’est ni une preuve de l’offre ni un accès au compte de facturation.

## Conséquences Gemini à vérifier avant activation

Les [conditions Google](https://ai.google.dev/gemini-api/terms), effectives le 23 mars 2026, prévoient réutilisation et revue humaine pour Unpaid, avec exception EEE/Suisse/Royaume-Uni appliquant le traitement Paid. Elles exigent Paid pour les API clients disponibles dans ces régions et excluent les clients susceptibles d’accès par des moins de 18 ans. Paid exclut l’amélioration par prompts/réponses, sans supprimer les journaux anti-abus ni les transferts possibles. Ne pas promettre « gratuit donc entraînement » ou « payant donc aucune conservation ».

La [documentation de facturation](https://ai.google.dev/gemini-api/docs/billing) rattache le régime API au projet et à son compte Cloud Billing actif. L’offre de ce projet doit être vérifiée dans AI Studio/Cloud Billing avec le pays et les conditions contractuelles applicables. Aucune collecte facultative de consentement ne remplace un contrat fournisseur compatible ; l’accord parental n’écarte pas une restriction fournisseur.

Pour garder l’accueil des mineurs décidé par l’éditeur : option préparée la plus simple, génération locale (`AI_GENERATION_PROVIDER=local`, pas d’upstream distant), ou prestataire/contrat compatible à examiner. Ne pas ajouter artificiellement une interdiction d’accès au site à tous les mineurs. Le contrôle `legal:publication-check` refuse actuellement une configuration Gemini sélectionnée pour ce public et les documents incomplets. Il n’a pas modifié la configuration de production.

## Droits : vérifié / à confirmer

| Ressource | Preuves et contrôle | Limite |
|---|---|---|
| GLB BodyParts3D | Notices modèles, provenance JSON et en-têtes sources BY-SA 2.1 Japan conservés | Divergence avec la page actuelle BY 4.0 documentée ; ne pas remplacer rétroactivement les conditions des fichiers. |
| Aperçus PNG des cours | Neuf rendus anatomiques, pipeline tests/campus-thumbnails.mjs, notice public/course-previews/LICENSE.txt | Dérivés BY-SA 2.1 Japan ; lien ajouté dans la propriété intellectuelle. |
| Références HRA | Notices régionales/détaillées et provenances BY 4.0 ; sous-ensembles, adaptations et exclusions documentés | Pas de certification médicale ni droit exclusif revendiqué. |
| Terminologie | Notice Z-Anatomy et adaptations BY-SA 4.0 | Conserver attribution et partage selon la notice. |
| Poumon/cerveau SVG | Références Commons [poumon](https://commons.wikimedia.org/wiki/File:Lungs_diagram_detailed.svg), [cerveau](https://commons.wikimedia.org/wiki/File:Brain_human_lateral_view.svg) : Patrick J. Lynch et C. Carl Jaffe, CC BY 2.5 vérifiés | Métadonnées locales ≠ preuve de filiation du tracé. Crédits conservés, sources désormais liées et incertitude indiquée. |
| Schémas vectoriels propres | Dessins et données présents dans MedicalDrawings.tsx, medicalPlates.ts, CourseDiagram.tsx et diagrams.ts | L’ancien lien mycorpus.med et « Propriétaire / Libre » ne prouvaient aucun droit : retirés au profit du dossier de propriété et d’une titularité à confirmer. |
| Textes pédagogiques | Références dans le catalogue, contenus TypeScript et supports ; pas de collecte de données de patient prévue | Une référence scientifique ne vaut pas licence de reproduction. Impossible de certifier l’originalité de tous les textes par lecture des métadonnées : provenance rédactionnelle/IA et autorisations à confirmer personnellement. |
| Logo/favicons | Fichiers locaux et master de marque | Auteur, outil de création et droits non établis par les fichiers ; confirmation nécessaire. |
| Polices / logiciels directs | Polices OFL conservées. React, Three, FSRS, jsPDF MIT ; Lucide ISC ; pdfjs-dist et google-auth-library Apache-2.0 selon paquets installés | Contrôle des dépendances directes, pas une certification exhaustive des dépendances transitives. |

Aucun modèle ni attribution tierce supprimé. Les crédits n’attribuent plus une licence indéfinie aux illustrations propres. L’éditeur doit confirmer la provenance des créations propres ; les sources tierces déjà vérifiées ne lui sont pas redemandées.

## Conservation implémentée sur la branche, non activée en production

Justification : 24 mois permet l’usage sur plusieurs années universitaires sans conserver indéfiniment les comptes abandonnés ; 12 mois limite les versions détaillées au cycle pédagogique annuel et les signalements au suivi de leur clôture. Ces durées sont des choix proportionnés de V1, pas des prescriptions universelles.

- Activité horodatée des comptes authentifiés sur comptes, Study et cartes, sans inventer d’historique antérieur. Les comptes existants partent de leur première observation. Les changements de valeurs du chat sont horodatés pour sa purge ; les notes actuelles restent conservées avec le compte.
- Après 23 mois sans activité, liste de préavis à remettre. Suppression après 24 mois ET 30 jours révolus depuis un préavis effectivement remis et enregistré. Reprise d’activité : préavis annulé. Aucun e-mail n’est envoyé par ce travail ; il faut organiser la remise réelle avant de marquer sa livraison. Un simple envoi en file ne vaut pas preuve de remise.
- Purge des historiques détaillés, logs de révision et anciennes scènes retirées au-delà de 12 mois ; état FSRS actuel et notes courantes préservés. Signalements clôturés : 12 mois depuis la clôture connue. Si la clôture ancienne n’est pas datée, début à l’observation et non à une date inventée. Les signalements ouverts requièrent un suivi humain de clôture, pas une conservation indéfinie par défaut.
- Fichiers des comptes supprimés effacés par la même procédure propriétaire que la suppression manuelle. Les copies de sauvegarde ne sont pas touchées : rotation et réapplication des suppressions après restauration restent à organiser et tester avec Railway. Les opérations SQL sont transactionnelles ; les suppressions de fichiers ne sont pas annulables par rollback SQLite en cas de panne, comme pour la suppression manuelle. Tester la reprise/restauration avant activation.

### Commandes d’exploitation (jamais exécutées en production ici)

`npm run privacy:retention` : aperçu sans effacement de contenu. Il peut créer la métadonnée technique de première observation dans la base visée. Les identifiants de comptes du rapport restent réservés à l’exploitant.

`RETENTION_POLICY_APPROVED=1 npm run privacy:retention -- --apply` : application après validation, information des utilisateurs et préparation opérationnelle.

`RETENTION_POLICY_APPROVED=1 npm run privacy:retention -- --apply --notice-delivered ID` : enregistrer uniquement un préavis réellement remis ; ne jamais simuler la livraison. Attention : --apply applique aussi les purges éligibles.

`RETENTION_POLICY_APPROVED=1 npm run privacy:retention -- --apply --close-report ID` : clôture datée d’un signalement réellement traité, puis maintenance.

Le serveur de production préparé exécute la maintenance au démarrage puis toutes les 24 h seulement si RETENTION_POLICY_APPROVED=1. Au redémarrage, les comptes restent protégés par leur date observée et le préavis requis. L’absence d’une adresse de contact ou de mécanisme de remise n’est pas masquée par une acceptation automatique. Sans le flag, aucun effacement automatique de cette politique n’est activé. Les tests utilisent des bases temporaires.

## Dernières réponses personnelles attendues

1. Nom/prénom du responsable de publication et du traitement, coordonnées adaptées au régime particulier et adresse dédiée une fois créée ; aucun contact fictif.
2. Installer/connecter Railway, ou fournir uniquement région/volume et configuration des sauvegardes ; donner les informations non secrètes du projet IA de production (modèle, offre, Cloud Billing actif et pays associé), sans clé ni mot de passe.
3. Choisir le mode IA compatible avec les mineurs : local pour cette V1, autre fournisseur à examiner, ou contrat particulier documenté. L’offre payante seule ne résout pas la restriction d’âge de Gemini.
4. Confirmer la provenance/autorisation des textes, schémas propres et logo ; organiser la remise des préavis et la clôture des signalements avant activation de la maintenance. Les principes 24/12 mois et l’accueil des mineurs sont déjà retenus et ne sont pas redemandés.

## Validation locale

- 235 tests Node réussis : 229 tests existants (comptes, étude, cartes, anatomie, progression, catalogue, taxonomie, qualité, signalements, sécurité) et six tests de conservation. Les tests vérifient aperçu sans effacement, frontières calendaires, préavis réel, annulation après reprise, isolation des fichiers, conservation des notes/état FSRS, anciennes clôtures inconnues, base de signalements sans compte et maintenance désactivée par défaut.
- 14 tests navigateur réussis : inscription/connexion, Google, cartes et révision, QCM, atlas mobile, documents publics à 320/375/768/1440 px, liens, préférences et schéma interactif.
- Build, contrôle de génération des pages, audit anatomique et diff sans erreurs. Aucun lint configuré ; avertissement historique de taille des bundles.
- `legal:publication-check` refuse volontairement la publication actuelle (documents incomplets et Gemini localement sélectionné pour un site ouvert aux mineurs). C’est le résultat attendu du garde-fou, pas une validation juridique globale.

Fichiers techniques ajoutés : server/retention.mjs, server/retention-startup.mjs, scripts/privacy-retention.mjs, scripts/check-legal-publication.mjs, tests/privacy-retention.test.mjs. Intégrations ciblées : comptes, authentification Study/cartes, export de données, démarrage serveur, scripts npm, exemple de configuration. Pages et crédits modifiés via leurs sources existantes ; aucun modèle anatomique modifié.
