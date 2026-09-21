# Flashcards : stabilisation et intégration FSRS

## Étape 0 : diagnostic du run 35587617875

Le snapshot flashcards montre la session connectée, l’onglet actif et « Chargement de vos flashcards… ». Les requêtes decks/cards/stats arrivent après le délai de l’assertion visuelle, puis réussissent en environ 8 ms. Le test utilisait l’état de navigation comme signal de disponibilité des données et rechargeait sans attendre explicitement la réponse de notation. Un sélecteur partiel « Flashcards » pouvait aussi désigner « Générer des flashcards » une fois le contenu chargé.

Correction : chargement initial immédiat (debounce conservé pour la recherche), aria-busy explicite, attente de la réponse de notation puis des statistiques restaurées, sélecteur de navigation exact. Aucun timeout augmenté.

WebGL : les traces montrent 16–33 secondes par mouvement de souris à 16 étapes, et 53 secondes pour créer un contexte après plusieurs tests lourds. Le geste utilise désormais quatre positions intermédiaires en conservant les assertions caméra, picking et résolution. Le moteur libère explicitement son contexte GPU à son démontage. La CI répartit tous les tests sur trois runners, avec un seul worker par runner ; aucun test n’est exclu.

## Architecture et périmètre de la phase 1

Le stockage et l’API sont déjà isolés dans server/flashcards. Le schéma actuel utilise CREATE TABLE IF NOT EXISTS, sans versions de migration. Le scheduler maison renvoie des noms camelCase ; la base utilise snake_case. La colonne repetitions est une série de réponses réussies, pas le nombre total de présentations. Le compteur lapses historique inclut tout Again, même sur une carte nouvelle. Ces valeurs ne sont pas équivalentes aux paramètres de mémoire FSRS.

Le frontend est piloté par FlashcardsWorkspace. Son API review reçoit uniquement les cartes dues ; les intervalles des boutons sont actuellement du texte statique. Les autres parcours (génération, CRUD, export, sources) n’ont pas besoin d’être refondus.

Bibliothèque étudiée : ts-fsrs 5.4.2, version publiée sur npm vérifiée le 21 septembre 2026, MIT, Node >=20. APIs examinées dans le paquet publié : createEmptyCard, fsrs, next, repeat, get_retrievability, State et Rating. Le projet utilise Node >=22.13.

Sources :
- https://github.com/open-spaced-repetition/ts-fsrs
- https://open-spaced-repetition.github.io/ts-fsrs/classes/FSRS.html

## Stratégie de migration proposée

- Migration additive et transactionnelle, versionnée et idempotente. Aucune suppression de carte, deck ou review log.
- Conserver les échéances, états et compteurs actuels à la migration. Conserver également un snapshot de l’ancien état pour audit.
- Rejouer les ratings datés connus avec le moteur officiel pour estimer difficulté et stabilité. Il s’agit d’une reconstruction à partir d’un historique issu d’un autre algorithme, pas de paramètres FSRS historiques exacts.
- Si l’historique est incomplet ou absent, utiliser explicitement les valeurs initiales de la bibliothèque à partir du dernier rating connu, ou Good comme hypothèse documentée si aucun rating n’existe. Ne pas convertir ease_factor en difficulty par une formule inventée.
- Conserver repetitions pour la compatibilité des statistiques historiques ; ajouter un compteur FSRS de présentations séparé.
- Stocker difficulté, stabilité, nombre de présentations FSRS et étape d’apprentissage. Réutiliser les échéances et dernières dates déjà stockées. Calculer elapsedDays et retrievability à la lecture.
- Rétention par défaut 0,9 ; configuration centralisée serveur pour une future préférence. Fuzz désactivé pour que les prévisions soient déterministes.
- Journaliser les états avant/après, les paramètres et la version du moteur sur chaque nouvelle review ; les anciens logs restent inchangés, leurs champs inconnus restent explicitement absents.
- Version de review monotone en complément de expectedDueAt, mise à jour atomique avec le log.

## Prévisions et sessions

Une prévision serveur utilise le même adaptateur que la notation. Le frontend affiche les quatre durées effectivement calculées pour la carte courante. Une fin de session est atteinte uniquement après les réponses acceptées par le serveur ; quitter ou consulter une carte n’écrit aucune review.

## Phase 2 préparée uniquement

Une future table flashcard_notes (id, user_id, contenu structuré, source) pourra être liée à flashcards par note_id nullable. Les cartes actuelles restent autonomes (note_id NULL). Les reviews restent attachées à card_id : plusieurs cartes d’un même concept doivent avoir leurs propres échéances. Aucune table de concepts ni génération multicarte n’est ajoutée dans la phase 1.

### Second passage de CI (35618664683)

Les trois scénarios initiaux passent. Le lot 2 révèle un autre test instable : il choisissait toujours l’option 2 d’une question tirée au hasard, parfois correcte. Certaines corrections QCM constituées de libellés courts ne produisaient pas non plus de carte avec l’extracteur de prose. Le test choisit désormais explicitement une réponse fausse ; le parcours QCM transmet la question et sa correction structurées et génère un brouillon unique, sans extraction heuristique ni appel IA.
