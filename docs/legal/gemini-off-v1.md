# V1 sans Gemini : préparation et impact

Travail uniquement sur chore/legal-readiness. Aucun push, fusion ou déploiement. La configuration et le comportement actuels du site public ne sont pas modifiés par ce travail.

## Décision technique préparée

L’API publique construit désormais les services Study, flashcards et dialogue avec des fournisseurs de génération nuls. Aucun client Gemini, HTTP générique ou Ollama n’est construit à ce point d’entrée. Ce choix est fixé dans le code de la V1, pas dans une variable réactivable par une ancienne clé. Les paramètres envoyés par les utilisateurs ne choisissent pas un fournisseur.

`shared/v1-policy.mjs` décrit ce choix : génération par règles intégrées, génération externe désactivée, conservation automatique désactivée. `server/api.mjs` ne sélectionne plus les anciennes fabriques de fournisseurs. Les adaptateurs historiques restent présents pour leurs tests isolés avec clients factices ; ils ne sont pas des routes exposées par cette V1. Les serveurs Vite, preview et production utilisent la même composition d’API.

## Inventaire des voies examinées

| Voie utilisateur | Point de contrôle / résultat préparé |
|---|---|
| Dialogue /api/chat | Réponses des ressources intégrées et commandes anatomiques ; aucun upstream HTTP. |
| Résumés, fiches et QCM Study, anciens endpoints et /supports | Moteur de règles ; aperçu et validation existants conservés. Aucun fournisseur distant ni fallback distant. |
| Flashcards depuis texte, catalogue, document et erreur QCM | Extraction locale de notes/cartes ; sources et aperçu conservés. |
| Génération de brouillons depuis Mes cours | Générateur intégré du dépôt ; aucune sélection Gemini par la clé ou les paramètres. |
| Régénération d’une proposition ou d’un brouillon via API | Réponse explicite d’indisponibilité, modification manuelle conservée. Les boutons IA sont déjà conditionnés au fournisseur et ne sont plus proposés pour un nouveau parcours local. |
| PDF scanné, demande OCR et pages manquantes | Aucun appel OCR distant. PDF sans texte refusé ; pages scannées non transcrites. L’utilisateur doit fournir un document avec texte. |
| Paramètres hérités Gemini, modèle invalide, URL de passerelle Google ou Ollama | Ignorés par la sélection d’API V1, sans construction préalable d’un client ni tentative puis fallback. |
| Google OAuth et Railway | Restent nécessaires à leurs fonctions respectives ; la désactivation vise la génération, pas l’authentification Google ou l’hébergement. |

Un test d’API remplace fetch par un piège qui compte toute tentative de génération réseau avant de lever une erreur. Même un appel externe attrapé puis masqué par un fallback ferait échouer ce test. Le parcours couvre conversation, génération Study, /supports, quatre sources de cartes, brouillons, régénérations, scan et helper OCR partiel, avec de fausses configurations hostiles. Il ne vérifie ni ne change des comptes utilisateurs de production.

## Capacités mesurées du moteur intégré

L’évaluation est reproductible avec `npm run evaluate:local`. Les sorties, exemples et critères sont enregistrés dans [local-v1-evaluation.json](local-v1-evaluation.json). Corpus de neuf cas synthétiques du dépôt, pas une validation clinique ni une comparaison directe avec Gemini réel. Aucun modèle externe n’a été appelé pour l’évaluation.

| Cas (demande de cinq éléments) | Cartes produites | QCM produits |
|---|---:|---:|
| Anatomie, extrait court | 3 | 0 |
| Physiologie, extrait court | 2 | 0 |
| Biochimie, extrait court | 0 | 0 |
| Pharmacologie, extrait court | 2 | 0 |
| Mathématiques, extrait court | 3 | 0 |
| Informatique, extrait court | 2 | 0 |
| Quatre relations anatomiques homogènes | 4 | 4 |
| Source insuffisante | 0 | 0 |
| Consignes malveillantes dans la source | 2 | 0 |

Les résumés de ces neuf cas reprennent les extraits, sans exécuter les consignes ni produire un raisonnement nouveau. Une « synthèse » d’une source très courte peut simplement reprendre tout le texte. Les cartes du cas malveillant montrent aussi que fidélité à la source et utilité pédagogique sont deux choses différentes : un moteur de règles peut transformer du texte indésirable en propositions maladroites. Ces propositions doivent être relues et rejetées, pas présentées comme validées.

Les QCM nécessitent plusieurs relations comparables pour construire des distracteurs étayés. En l’absence de matière suffisante, le générateur refuse ou produit moins de questions ; il ne complète pas la quantité en inventant des réponses. Les cartes simples et les résumés extractifs sont utilisables comme aide, mais la V1 locale ne doit pas être annoncée comme remplacement général équivalent d’un modèle génératif. Les formulations peuvent être répétitives, les notions moins bien couvertes et les textes non structurés moins bien traités.

## Fonctions affectées / conservées

- Affectées : richesse et couverture de la génération de cartes et QCM à partir des documents ; reformulation des résumés ; OCR et régénération externe indisponibles ; conversation limitée aux ressources et commandes reconnues.
- Conservées : atlas 3D et exercices anatomiques, bibliothèque et QCM existants, examen, cartes personnelles et six formats, modification manuelle, répétition FSRS et progression, lecture/import/export des PDF avec texte, comptes e-mail et Google, export/suppression manuels des données.
- Anciennes productions : conservées avec leurs métadonnées historiques, sans les rebaptiser « locales ». Elles restent à relire.

Les messages des trois espaces concernés annoncent le mode de règles et ses limites ; aucun nouveau menu ni refonte du design n’est introduit.

## Sécurité et conditions d’utilisation

« Local » signifie traitement sur le serveur MyCorpus3D, pas conservation des PDF uniquement sur l’appareil. Les comptes et contenus restent hébergés. Le moteur n’est pas Ollama et n’embarque pas de poids LLM : aucune nouvelle licence de modèle n’est introduite. Les droits des supports importés et les licences logicielles existantes restent applicables ; aucune provenance ou propriété nouvelle n’est inventée.

Les limites d’import, contrôles d’origine, isolation par propriétaire, validation des notes et aperçus restent en place. Les chaînes de source ne sont pas évaluées comme code. Une faiblesse d’affichage des cartes à trous a été corrigée : le serveur échappe le contenu non fiable avant d’ajouter ses marqueurs, et le navigateur rend uniquement les marqueurs connus en composants React. Les anciennes lignes contenant du HTML sont également affichées comme texte ; aucun HTML de source n’est injecté directement dans le DOM. Un test navigateur simule une ancienne réponse contenant une image à onerror et une balise script.

Cette vérification ne certifie pas l’exactitude scientifique des sources ou l’absence de toute vulnérabilité. Elle établit les protections testées et les limites observées sur ce corpus. Une relecture de vrais supports représentatifs sera utile avant de promettre davantage de capacités de génération.

## Conservation et publication

Les purges 24/12 mois sont désactivées au démarrage, même avec RETENTION_POLICY_APPROVED=1. L’ancienne commande batch --apply est bloquée également ; les algorithmes restent testables uniquement sur bases temporaires. La purge au démarrage des brouillons rejetés est également neutralisée dans les serveurs Vite/preview/production. Les expirations de sessions et aperçus restent des nettoyages techniques distincts. La suppression manuelle demandée dans le compte ou un document reste disponible. Les durées proposées ne sont pas annoncées comme effectives. Les sauvegardes restent à vérifier séparément.

Le contrôle `legal:publication-check` continue de refuser les documents préparatoires incomplets. La présence d’une clé Gemini inutilisée ne suffit plus à déclarer Gemini actif : le contrôle se fonde sur la sélection réelle de la V1. Les anciens rapports décrivent l’état historique ; celui-ci décrit le comportement préparé non déployé.

Avant une publication ultérieure : identité et contact réels, vérification Railway, information exacte sur la version effectivement déployée, retrait des champs préparatoires puis validation. Les clés et upstreams de génération devenus inutiles pourront être retirés de la configuration lors d’une opération distincte autorisée. Aucune connexion, révocation de clé ou configuration de production n’a été faite ici.

## Résultats finaux

- 241 tests Node réussis : comptes 11, cartes 101, étude/PDF/adaptateurs isolés 68, anatomie 22, progression 2, taxonomie 11, catalogue 6, qualité des cours 6, signalements 2, sécurité HTTP 1, conservation désactivée 9, politique API locale et évaluation 2.
- 18 cas navigateur distincts validés : 17 lors de la campagne principale, puis le cas de sécurité Cloze après correction du rechargement de session du compte créé par l’API dans le test. Le parcours PDF a été revérifié dans la campagne ciblée ; il n’est pas compté deux fois.
- Compilation, contrôle des pages générées, audit anatomique et vérification du diff réussis. Aucun lint configuré ; avertissement historique de taille de certains bundles.
- Le contrôle de publication refuse toujours les documents incomplets, comme attendu. Cela n’empêche pas les aperçus locaux et ne déclenche aucune publication.

Fichiers principaux : shared/v1-policy.mjs, server/api.mjs, server/retention-startup.mjs, scripts/privacy-retention.mjs et points de démarrage ; protections Cloze serveur et composant client ; évaluation reproductible et tests dédiés ; messages des trois espaces et sources des pages juridiques. Aucun fichier de géométrie anatomique n’est modifié.
