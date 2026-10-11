# Corrections génération et PDF — 11 octobre 2026

## Problèmes reproduits et corrections

- Le filtre grammatical IA refusait « de la » comme « de Le ». Les cartes sur le bilan net de la glycolyse et la dérivée de f(x)=x² étaient perdues. Le test utilise les sorties exactes observées.
- « le produit … » ne correspondait pas littéralement à « au produit … ». Une correction déterministe retire seulement l’article et conserve une sous-chaîne exacte de la preuve, sans réécrire le fait.
- Le résumé était un assemblage de citations ; il devient une synthèse reformulée et catégorisée avec preuves séparées, quantités contrôlées et édition avant validation.
- Les questions sans sujet, réponses coupées, clozes entièrement masquées et doublons d’un même fait sont contrôlés. Une seule réparation Gemini, jusqu’à 8 propositions, est autorisée ; les propositions corrigées passent les mêmes validations. Une panne de cette réparation ne supprime pas les cartes déjà validées.
- L’import utilise PDF.js déjà installé : positions des textes, ordre des colonnes, paragraphes, Unicode et cellules de tableaux. Le parseur natif reste la compatibilité des PDF particuliers, avec avertissement. Les titres sont conservés dans les sections.
- Pages et avertissements sont persistés sous propriété utilisateur, avec cascades document/compte. Les preuves sont recherchées sur la page exacte ; les anciennes données conservent leur page de section. Aucun historique FSRS modifié.
- Les sections peuvent être ouvertes entièrement. Les pages vides et reconstructions incertaines sont signalées. Un OCR explicite des pages vides d’un PDF mixte conserve le texte déjà lisible (40 pages / 10 Mo). Un échec intégral rembourse le quota mensuel.
- La prévisualisation est une modale autonome rendue dans le body, avec fond inerte, focus restauré et styles disponibles sans ouvrir Flashcards.
- L’export PDF imprime une copie dédiée du cours ou de la synthèse : A4, une colonne, couleurs claires, tableaux adaptables et interface exclue. Les longs paragraphes se paginent sans imposer une page entière par section.
- Le modèle par défaut et l’exemple de configuration utilisent 3.5 Flash-Lite, car la clé locale reçoit 404 en génération pour 2.5. La clé reste hors du dépôt.

## Évaluation réelle limitée

Les six textes synthétiques ci-dessous ont été soumis à Gemini 3.5 Flash-Lite. Les mêmes réponses réelles ont été revalidées localement après découverte du filtre fautif, sans repayer des appels identiques. Les comptages ne mesurent pas à eux seuls la qualité. Les 21 cartes retenues ont été relues pour fidélité à ces passages, contexte, unités et doublons ; aucune certification médicale. Le moteur local a été exécuté sur les mêmes textes.

| Matière | Cartes locales | Gemini retenues | Points de synthèse |
|---|---:|---:|---:|
| Anatomie | 3 | 3 | 3 |
| Physiologie | 2 | 2 | 2 |
| Biochimie | 0 | 3 | 2 |
| Pharmacologie | 2 | 5 | 2 |
| Mathématiques | 3 | 4 | 3 |
| Informatique | 2 | 4 | 3 |

Exemples récupérés : « Quel est le bilan net en ATP de la glycolyse par molécule de glucose ? » → « un bilan net de 2 ATP » ; « Quelle est la dérivée de la fonction f(x) = x² pour une fonction f dérivable ? » → « f′(x) = 2x ».

Les types bidirectionnels ne sont pas forcés sur ce corpus sans synonymes explicites. La couverture des notions peut varier entre appels ; l’utilisateur peut compléter ou régénérer une carte.

## Quatre PDF universitaires

| Document | Pages avant / après | Caractères avant / après | Résultat |
|---|---:|---:|---|
| cardiologie-college.pdf | 125 / 125 | 238149 / 234795 | Lisible ; 0 avertissements |
| cardiologie-uness.pdf | 18 / 18 | 28999 / 27800 | Lisible ; 0 avertissements |
| pharmacologie-lyon.pdf | 70 / 70 | 23971 / 23990 | Lisible ; 53 avertissements |
| physiologie-grenoble.pdf | 29 / 29 | 6744 / 6882 | Lisible ; 16 avertissements |

Le nombre de caractères change avec les espacements et la reconstruction ; ce n’est pas une preuve d’absence de perte. Les avertissements du PDF de pharmacologie et de physiologie concernent surtout des pages sans texte sélectionnable. Le PDF de 70 pages dépasse la limite OCR et doit être scindé pour transcription. Les fichiers universitaires restent locaux, sans envoi à Gemini dans cette validation.

## Validation et limites

- Build TypeScript/Vite : vert ; Study 56/56, flashcards 109/109, catalogue 6/6 ; comptes, sécurité, feedback, progression, taxonomie et qualité du catalogue également verts.
- Playwright ciblé : 8 parcours verts, puis 2 revérifications après correction visuelle de la modale ; import → brouillons → édition → acceptation → FSRS, prévisualisation de synthèse, lecture complète et impression PDF réextraite. Vue 390 px sans débordement.
- Captures de validation générées localement, non versionnées. Résultats détaillés : [JSON du benchmark](quality/generation-pdf-2026-10-11.json).
- Non vérifiés manuellement : Safari/iPhone, lecteur d’écran, PDF précis de l’utilisateur non fourni, mise en page identique au document original pour toutes les colonnes/tableaux, toutes les pages des 4 documents.
- Une preuve verbatim et un contrôle de nombres ne certifient pas la sémantique ou la validité médicale. La relecture demeure nécessaire. Les OCR incertains restent signalés.
- Les cours déjà importés ne sont pas réécrits automatiquement : réimporter le PDF pour bénéficier du nouvel extracteur sans perdre les brouillons ou cartes existants.
- Activation Railway : GEMINI_API_KEY côté serveur, GEMINI_MODEL=gemini-3.5-flash-lite, AI_GENERATION_PROVIDER=gemini. Sans clé, le moteur local est annoncé.
