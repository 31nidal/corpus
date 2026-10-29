# Retrait temporaire de Mes cours

La rubrique est désactivée par défaut : menus ordinateur/mobile et raccourci Atlas supprimés, anciennes URL `#tab=mes-cours` redirigées vers les flashcards. Les autres espaces restent disponibles. Les flashcards liées aux documents ouvrent directement leur PDF privé, sans rouvrir la rubrique.

Aucune suppression de données ou migration : documents, questions et cartes existantes sont conservés. Les API PDF/document nécessaires aux cartes restent authentifiées et soumises aux mêmes contrôles de propriétaire.

Le code est conservé pour permettre de retravailler la rubrique ultérieurement. `VITE_MY_COURSES_ENABLED=true` est réservé à une réactivation explicite et aux tests de régression des composants conservés ; la valeur par défaut et la compilation de production désactivent la rubrique. Les tests Playwright historiques l’activent dans leur serveur de test. Un second passage CI avec `CORPUS_TEST_HIDDEN_COURSES=1` vérifie le comportement public réellement désactivé, les redirections, les quatre largeurs et la consultation du PDF depuis une carte.

Validation locale : compilation réussie ; 100 tests backend de flashcards réussis ; parcours de navigation/retrait, menu Flashcards, QCM et examens réussis ; lecture puis fermeture du PDF privé depuis une carte réussies ; 5 parcours de brouillons/édition/révision/focus réussis après extraction des styles PDF communs. Aucun changement de schéma ni suppression de document.
