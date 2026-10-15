# Study 2.0 — contrôles avant fusion et déploiement

Contrôles du 15 octobre 2026, à la demande explicite de fusion et de déploiement, conditionnée à la vérification OCR/Safari/lecteur d’écran. Aucun de ces contrôles n’active automatiquement Study 2.0 ni ne vaut validation médicale.

## OCR réel

Commande explicite : `node --env-file-if-exists=.env scripts/verify-study-v2-ocr.mjs --live`.
Le script refuse de partir sans `--live`, utilise une base SQLite en mémoire et un PDF synthétique : une page native et une page image comprenant des accents, une négation, des unités et un tableau. Aucun PDF utilisateur ni donnée de compte réelle n’est transmis. Un seul appel HTTP est permis, retries compris, avec une sortie plafonnée à 2 048 tokens ; aucune dépendance d’exécution ajoutée.

Résultat : succès, 1 requête, 1 156 tokens d’entrée / 198 de sortie, coût estimé 0,0008418 USD. Le worker réel extrait les pages, le pipeline applique le consentement et le quota, puis enregistre les sources. La page native reste identique ; `5 mL/min`, `non 50 mL/min`, `140`, `mmol/L`, `mg/min` et `mg/mL` sont conservés. Les lignes Sodium/Glucose gardent leurs colonnes séparées par `|`. Le fichier original et les clés étrangères sont intacts. Rapport local : fichier `study-v2-live-ocr-result.json` dans le dossier temporaire système.

Ce document propre et synthétique ne démontre pas la fidélité sur écriture manuscrite, photo floue, tableaux fusionnés ou formules complexes. Les contrôles simulés de quota, refus, interruption et absence de consentement restent complémentaires.

## Safari et accessibilité

La première exécution WebKit a trouvé cinq échecs de retour du focus, touchant les cartes basic/cloze/typed et la fermeture du parcours visuel. Safari ne donne pas forcément le focus au contrôle cliqué avec un pointeur : les déclencheurs sont désormais explicitement mémorisés via leur focus ; la création visuelle garde le déclencheur original pendant la transition recadrage/masque. Les tests existants restent inchangés.

L’audit axe a trouvé une zone PDF défilable inaccessible au clavier. Elle reçoit maintenant un nom accessible et `tabIndex=0`, avec un contour visible. Les champs multilignes ont aussi le contour de focus explicite de Study 2.0.

Sur un PDF image, le texte OCR enregistré n’était pas proposé dans le lecteur original. Un volet textuel accessible expose désormais les sections extraites associées à la page, seulement si celle-ci n’a pas de texte natif. Il indique les plages de pages, conserve le texte et les unités, et rappelle les limites de transcription. Aucun nouvel appel IA, nouveau viewer, nouvelle route ou réécriture du PDF. Le contrat UI est vérifié avec un vrai PDF image et une réponse de transcription contrôlée ; le traitement OCR/persistance réel a été vérifié séparément ci-dessus.

Configuration reproductible : `npx playwright test --config=playwright.study-v2.webkit.config.ts` (WebKit, comptes et stockage temporaires, moteur pédagogique local, aucun appel Gemini implicite). WebKit n’est pas le Safari installé : il s’agit du moteur Playwright 26.6, distinct de Safari 18.5 présent sur ce Mac.

Les deux nouveaux tests `study-v2-accessibility.spec.ts` vérifient les noms, l’import au clavier, le consentement initial désactivé, le texte PDF dans l’arbre accessible, la région défilable, les pages et l’édition des fiches, en clair et sombre. Pour l’audit supplémentaire, `STUDY_AXE_SCRIPT` désigne un `axe.min.js` téléchargé séparément dans un dossier temporaire ; aucune dépendance axe n’est embarquée. Des contrôles lancés pendant le changement de thème ont donné des valeurs de contraste transitoires : l’audit final utilise deux pages stables distinctes et respecte la préférence de réduction des animations. L’audit automatise des règles WCAG, il ne simule pas une écoute VoiceOver.

Résultat final local : **35 parcours Chromium et les mêmes 35 parcours WebKit verts, sans retry**, y compris le volet textuel des scans et les cinq retours de focus initialement en échec. Axe-core 4.14.0 : aucune violation grave/critique sur les six états contrôlés par moteur (bibliothèque, lecteur, édition de fiche, chacun en clair et sombre). Build/TypeScript et **280 tests backend verts** : Study 134, flashcards 111, catalogue 6, comptes 7, progression 2, taxonomie 11, qualité catalogue 6, feedback 2, sécurité 1. Les tests automatisés ordinaires restent sans appel payant. Aucun nouveau schéma ni migration.

## Safari 18.5 réel et VoiceOver

Après activation des accès par l’utilisateur, le contrôle natif a révélé une incompatibilité du build PDF.js standard avec Safari 18.5 sur macOS 15.5 : `Map.getOrInsertComputed`, `Math.sumPrecise` et l’itération asynchrone de `ReadableStream` sont absents. Le lecteur et le recadrage partagent désormais le build officiel compatible (`legacy`) et son worker, déjà présents dans la dépendance installée. La lecture du texte utilise un lecteur de flux public lorsque l’itération asynchrone manque, sans modifier globalement les prototypes. Un test masque explicitement ces trois API et vérifie les deux pages du lecteur, puis le canvas de recadrage et le retour du focus. Il passe sur Chromium et WebKit.

Safari natif : import réel du PDF synthétique à deux pages, rendu et texte sélectionnable, pagination, génération locale d’une fiche, modification et sauvegarde validés. À 390 px réels, le lecteur et la révision FSRS ne débordent pas horizontalement. Affichage de la réponse, notation « Correct », incrément unique de version et conservation de l’historique au rechargement vérifiés. Comptes et stockage temporaires, aucun document utilisateur ni appel Gemini supplémentaire.

VoiceOver réel : annonce du texte de la deuxième page, des boutons de navigation du cours et des champs de fiche constatée. Le test FSRS cible les boutons par focus clavier, déplace le curseur VoiceOver sur ce focus, contrôle les annonces « Afficher la réponse bouton » et « Correct 10 min bouton », puis les active avec l’action VoiceOver ; la session se termine. Les premiers essais de navigation ont été interrompus par des changements de fenêtre ou par le script qui réutilisait une session terminée ; ils ne sont pas comptés comme réussis. Ce contrôle ciblé ne vaut pas validation exhaustive par une personne utilisant quotidiennement un lecteur d’écran. L’autorisation AppleScript temporaire de VoiceOver est révoquée après l’essai.

Captures locales du navigateur, sans interface du bureau : `/private/tmp/study-v2-safari-reader-desktop.png`, `/private/tmp/study-v2-safari-reader-mobile.png`, `/private/tmp/study-v2-safari-fsrs-mobile.png`. Rapports locaux : `/private/tmp/study-v2-native-result.json`, `/private/tmp/study-v2-native-fsrs-result.json`, `/private/tmp/study-v2-voiceover-fsrs-result.json`. Ces fichiers de test synthétiques ne sont pas versionnés.

Build/TypeScript vert. Bundle principal : 760,52 ko (gzip 189,71 ko), inchangé à l’arrondi par rapport au dernier contrôle. Le worker PDF compatible chargé à la demande passe de 1 265 413 à 1 317 034 octets (+51 621 octets), sans nouvelle dépendance. L’avertissement Vite sur les gros chunks reste présent.

## Limites et intégration

Restent à vérifier manuellement : Safari sur un véritable iPhone, gestes tactiles, navigation exhaustive VoiceOver par titres/régions, QCM et assistant documentaire avec lecteur d’écran, ainsi que lecteurs d’écran autres que VoiceOver. Les audits axe et les tests clavier ne remplacent pas ces contrôles. Les limites OCR complexes et pédagogiques du rapport principal restent ouvertes.

La fusion et le déploiement sont autorisés par l’utilisateur. La PR finale doit intégrer la pile #15–#22 et ses corrections en un seul commit de fusion sur `main`, après CI complète verte sur cette base, pour éviter des déploiements intermédiaires incomplets. Les commits des branches sont conservés ; aucune fusion forcée, aucun contournement de check, aucune suppression de branche avant confirmation du déploiement. L’état distant réel de chaque PR et de la production doit ensuite être vérifié.
