# Study 2.0 — plan de migration et contrats

## Déploiement par PR

1. **Audit/conception** : état de référence et risques. Aucun changement d’exécution.
2. **Données/pipeline** : tables complémentaires versionnées, bibliothèque, sources et tâches persistantes. Conservation immédiate du PDF original, traitement asynchrone récupérable, état détaillé et aucune suppression d’anciens supports.
3. **Bibliothèque/lecteur** : matières et chapitres, recherche titres/contenu, récents, renommer/déplacer/archiver/restaurer ; PDF original avec text layer, sommaire, pages et position synchronisée. Opt-in V2 et retour à l’ancienne interface.
4. **Fiches** : plusieurs supports par document, trois niveaux de détail, sélection vérifiée, brouillon éditable avant/après sauvegarde, références et export PDF existant. Génération par sections, couverture honnête.
5. **QCM** : séries persistantes, options/difficulté/format, chaque proposition avec justification et preuve, brouillon/validé/rejeté, édition et régénération ciblée. Entraînement immédiat/différé, historique par compte. Les contrôles ne prétendent pas certifier la médecine.
6. **Assistant** : contexte possédé et sélectionné, sources cliquables, refus explicite si le cours ne répond pas, quotas existants, aucune connaissance externe par défaut ni retry payant aveugle.
7. **Flashcards** : réutilisation du moteur et de la Révision existants, scopes document/chapitre/passage vérifiés ; tests d’intégrité et FSRS. Pas de nouveaux decks/schedulers parallèles.
8. **Validation/activation** : corpus de référence, tests d’interruption/longs documents/mobiles, benchmark pédagogique, mesures de performance, comparaison avant/après puis activation progressive. Suppression du code historique seulement après adoption vérifiée et décision explicite ultérieure.

Chaque lot dispose de commits distincts, tests et rapport de limites. Les PR suivent cet ordre sans fusion automatique de Study V2. La production conserve l’ancien parcours pendant la validation.

## Données et rétrocompatibilité

Ne pas renommer, supprimer ou recréer study_documents, study_sections, study_pdf_pages, study_questions, study_summaries ou les tables flashcards. Ajouter un journal `study_v2_migrations` et des tables complémentaires : dossiers, métadonnées documentaires, tâches, versions/sources, fiches, séries/questions, entraînements, conversations. Les migrations sont transactionnelles, idempotentes et vérifiées avec foreign_key_check/integrity_check.

Les documents historiques sans métadonnées apparaissent « Non classés ». Les supports historiques sont importés par identifiant stable et INSERT OR IGNORE ; ne jamais remplacer une version V2 éditée par le contenu historique. Les notes acceptées et leurs logs restent identiques octet pour octet. L’archive est réversible et ne touche ni PDF ni cartes ; la suppression définitive garde les contrats actuels et exige une action explicite.

Un retraitement ne remplace pas silencieusement une source déjà citée. Les versions distinguent original, extraction et édition. Les coordonnées sont facultatives et ne sont publiées que lorsque les bounds PDF sont fiables. Aucun bloc texte synthétique n’est présenté comme un original.

## Traitements et erreurs

Stocker le PDF validé avant l’extraction et enregistrer son hash. États V2 : imported / processing / ready / partial / needs_attention / failed. Journaliser étape, tentative, diagnostic et lease ; tâches natives récupérables après redémarrage, worker borné et limites de fichiers/pages/dimensions.

OCR explicitement demandé par l’utilisateur ; pas de transmission implicite du PDF à Google. Les pages lisibles restent inchangées. Quota/budget et limites OCR existants ; un échec OCR conserve le PDF et permet de consulter/reprendre/scinder. Un appel IA interrompu de facturation incertaine est signalé et exige une reprise explicite, pas un retry automatique au redémarrage.

L’idempotence s’appuie sur le propriétaire, le document et l’identifiant de demande. Aucune transaction SQLite n’attend le réseau. Sauvegarde d’un support et sélection sont contrôlées côté serveur contre la version possédée ; conflit 409 si l’édition est périmée.

## Contrats et navigation

Nouveau namespace `/api/study/v2/`, mêmes sessions/contrôle d’origine/CSP, 404 pour données d’autrui. Chaque ressource vérifie propriétaire et parent ; une sélection du client est une position ou un extrait à retrouver dans la base, jamais une nouvelle vérité médicale.

`#tab=mes-cours&doc=…&section=…` demeure valide. L’entrée charge soit l’ancien workspace soit V2 via une préférence progressive ; conserver tab/doc/section lors du changement et au retour navigateur. Position stockée par compte/document, pas dans un store commun à tous les comptes.

Composants : Library, ImportPanel, DocumentWorkspace, PdfReader, Outline, SelectionActions, NotesWorkspace, QuizWorkspace, TrainingWorkspace, DocumentAssistant. Hooks réseau annulables et composant remonté à chaque changement de compte. Un seul panneau contextuel actif, focus visible et messages français accessibles.

## Conditions de passage

- Toutes les suites existantes restent vertes ; E2E historique testé avec V2 désactivé.
- DB de référence : compte/document/notes/review_logs inchangés après migration, répétition et retour à l’ancien parcours.
- Chaque nouveau endpoint : propriété/CSRF/validation/idempotence/pagination bornée, pas de clé côté client.
- Cas PDF : texte, scan, mixte, tableaux, plusieurs chapitres, long, caractères scientifiques, compression, illisible. Résultats source attendus, pas seulement comptage de cartes.
- Génération : contenu insuffisant, erreur/quota/interruption, révision/édition, sources absentes, QCM single/multi et ambiguïté, assistant hors-document.
- Parcours desktop et 390 px après stabilisation ; Safari/iPhone et lecteur d’écran explicitement marqués non vérifiés jusqu’à preuve manuelle.
- Avant production : sauvegarde volume vérifiée, CI de chaque intégration verte, activation opt-in, rollback d’interface possible. Aucune migration destructive ni fusion automatique.
