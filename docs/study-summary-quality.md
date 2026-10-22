# Mes cours : plan et résumé bref

Préparation locale, aucun déploiement. Le moteur Gemini et le menu Flashcards existants restent conservés.

## Changement

Le traitement existant analyse les sections par blocs avec sources et contrôles de qualité. Pour une synthèse demandée depuis le parcours des supports, une étape finale Gemini reçoit une représentation condensée de chaque section représentée et propose un résumé global de 900 caractères maximum. Les extraits sont validés contre le texte original, les coûts de cet appel sont comptabilisés. Le modèle utilisé reste celui configuré dans `GEMINI_MODEL`, sans changement de modèle pour réduire artificiellement la qualité.

La prévisualisation affiche « En bref », un plan numéroté et les points détaillés avec preuves. Le plan est aussi visible après sauvegarde. Le résumé bref est maintenant conservé dans l’aperçu et le stockage ; l’ancien code le remplaçait par « Synthèse relue — titre ». Les anciens supports restent compatibles.

Après modification/suppression des points, le résumé bref est retiré de la prévisualisation et n’est pas enregistré comme encore valide ; une nouvelle génération permet de le recalculer. Le serveur fait cette vérification lui-même. Aucun texte global soumis par le client ne fait autorité.

Le corps du PDF n’est jamais tronqué silencieusement pour entrer dans les limites : les limites existantes (500 000 caractères, 32 blocs) restent explicites. L’étape globale ajoute au maximum un appel et refuse de dépasser 64 000 caractères de représentation condensée. En cas de limite, erreur ou résumé non sourcé, les chapitres validés restent disponibles et une alerte signale l’absence du résumé bref. Les sections absentes restent indiquées ; ni le compteur ni une citation ne garantissent une couverture de toutes les notions ou l’exactitude médicale.

## Vérification

Les tests couvrent un cours synthétique de 24 sections et plus de 100 000 caractères jusqu’à sa dernière section, le refus d’un résumé global inventé, la sauvegarde et la relecture en base, l’invalidation après édition, ainsi que les requêtes du vrai client HTTP vers l’endpoint Gemini avec un transport simulé. Les appels d’analyse puis de synthèse globale sont tous deux vérifiés, ainsi que le modèle et la comptabilisation de consommation.

Les parcours navigateur couvrent import PDF → extraction → synthèse → QCM → export → suppression, la prévisualisation mobile avec résumé/plan/preuves et le menu Flashcards. Les tests ne changent pas de fournisseur de production et n’envoient aucun document personnel.

Un transport simulé ne prouve pas qu’une clé de production est valide ni que Cloud Billing est actif. La disponibilité du vrai projet Gemini reste non confirmée faute d’accès en lecture à sa configuration. Aucun appel facturé n’a été effectué. Une recette réelle, après confirmation du projet payant et de ses conditions d’utilisation, doit utiliser des documents synthétiques autorisés et vérifier le modèle, la provenance Gemini, la couverture, la qualité humaine et les coûts. Les contrôles d’accès/conformité encore manquants de la branche restent bloquants pour sa publication.

Résultats de cette préparation : 51 tests Node réussis ; 3 cas navigateur distincts réussis, avec relance ciblée du cas de modification ; compilation réussie (avertissement existant sur les gros bundles). `git diff --check` réussi.
