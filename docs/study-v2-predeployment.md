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

Résultat final local : **34 parcours Chromium et les mêmes 34 parcours WebKit verts, sans retry**, y compris le volet textuel des scans et les cinq retours de focus initialement en échec. Axe-core 4.14.0 : aucune violation grave/critique sur les six états contrôlés par moteur (bibliothèque, lecteur, édition de fiche, chacun en clair et sombre). Build/TypeScript et **280 tests backend verts** : Study 134, flashcards 111, catalogue 6, comptes 7, progression 2, taxonomie 11, qualité catalogue 6, feedback 2, sécurité 1. Les tests automatisés ordinaires restent sans appel payant. Aucun nouveau schéma ni migration.

## Vérifications natives en attente

- Safari réel : WebDriver refuse la session car « Autoriser l’automatisation à distance » est désactivé. Ce réglage n’a pas été modifié automatiquement.
- VoiceOver réel : macOS indique que l’accès aux éléments d’interface est désactivé. Aucun essai d’écoute ou navigation VoiceOver n’est déclaré validé.

Pour l’essai manuel, utiliser un compte de test et le PDF synthétique : activer VoiceOver, naviguer par titres/régions et contrôler l’annonce des boutons d’import, du consentement OCR et des états de chargement ; ouvrir un cours, lire le texte de la page et changer de page au clavier ; sur un scan transcrit, développer le texte extrait et vérifier les plages de pages ; ouvrir une fiche, modifier puis enregistrer un point ; lire les propositions et explications d’un QCM ; poser une question documentaire et suivre une citation ; ouvrir une preuve et fermer par Échap ; accepter une flashcard, la réviser et revenir au lien d’origine. Vérifier les annonces sans doublon dans la révision, la visibilité du focus et l’absence de piège clavier. Refaire le lecteur et la révision à 390 px dans Safari.

La demande d’accès pour ces contrôles natifs a été présentée à l’utilisateur. La fusion et le déploiement restent suspendus tant que cette condition préalable n’est pas résolue ; l’autorisation de fusion/déploiement est conservée et ne devra pas être redemandée.
