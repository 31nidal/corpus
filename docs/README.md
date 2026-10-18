# Documentation MyCorpus3D

Le [README principal](../README.md) décrit la version actuelle et son démarrage. Cet index distingue les guides de fonctionnement des audits et des documents historiques.

## Guides de fonctionnement

| Domaine | Documentation |
| --- | --- |
| Architecture | [Responsabilités et contrats de compatibilité](architecture.md) |
| Backend | [Configuration, comptes et API](../server/README.md) |
| Tests | [Commandes et couverture](../TESTS.md) |
| Atlas | [Navigation, exercices, références détaillées et limites](atlas/implementation.md) |
| Données anatomiques | [Ressources, licences et identifiants](reference-bodies.md) |
| Flashcards | [FSRS et contrats des cartes](flashcards-fsrs.md) |
| Brouillons de cartes | [Relecture et acceptation](flashcard-draft-review.md) |
| Tableau de bord | [Suivi et sessions](student-dashboard-p0.md) |
| Supports de cours | [Fournisseurs locaux et Ollama](study-ollama.md) |
| Génération optionnelle | [Intégration Gemini](gemini-integration.md) |
| Export PDF | [Téléchargement et pagination](direct-pdf-export.md) |
| Interface | [Système visuel](visual-system.md) |

## Audits et inventaires

- [Audit préalable de l’atlas](atlas/audit-refonte.md) : état observé avant la refonte ; les extensions réalisées sont documentées dans le guide d’implémentation.
- [Inventaire anatomique reproductible](atlas/coverage.json) : nombres de maillages par filtre de navigation, sans prétention d’exhaustivité scientifique.
- [Qualité de génération et extraction PDF](generation-pdf-quality.md).
- [Qualité des flashcards locales](local-flashcard-quality.md).
- [Revue pédagogique des flashcards](flashcard-quality-review.md).
- [Notices tierces](../THIRD_PARTY_NOTICES.md).

## Documents historiques

Ces documents gardent le contexte des étapes précédentes. Leurs chiffres et descriptions ne doivent pas être utilisés comme inventaire actuel sans vérifier le code et les manifestes.

- [Bibliothèque et entraînement — septembre 2026](campus-library.md).
- [Construction de la taxonomie](../walkthrough.md).
- [Stabilisation initiale de l’atlas](atlas-stabilization.md).
- [Évolution de l’interface produit](product-ux.md).
- [Audits de qualité datés](quality/).

Pour mettre à jour un guide, vérifier ses commandes et liens relatifs, puis confronter ses chiffres aux fichiers versionnés. Les données médicales et les licences exigent une vérification de leurs sources, au-delà des tests techniques.
