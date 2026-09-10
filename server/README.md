# Conversation contextuelle

`npm run dev` monte les routes sur Vite. Pour servir la compilation et l’API ensemble : `npm run build && npm start` (Node 22.13 minimum ; Node 24 LTS recommandé). Les secrets restent côté serveur. Copier `.env.example` vers `.env` pour configurer un adaptateur, puis redémarrer. Un simple hébergement de `dist/` conserve l’atlas mais ne fournit pas l’API.

## Requête

`POST /api/chat`, JSON :

```json
{
  "message": "Pourquoi le ventricule gauche est-il plus épais ?",
  "selected_structure": "FMA7088",
  "system": "Système cardiovasculaire",
  "current_lesson": "FMA7088:1",
  "learning_level": "student"
}
```

Les IDs FMA sont ceux des manifestes. `selected_structure` peut être nul. Les niveaux sont `discovery`, `student`, `advanced`. Le serveur reconstitue le nom et le système à partir de ses données ; il ne fait pas confiance aux métadonnées client. Message limité à 2 000 caractères, corps à 20 Ko.

Réponse :

```json
{
  "message": "Le pancréas est sélectionné.",
  "actions": [{"action":"focus_structure","structure":"FMA7198"}],
  "sources": [],
  "mode": "local"
}
```

`GET /api/status` annonce `local` ou `connected`. Erreurs : 400 requête invalide, 405 méthode, 413 taille, 503 indisponibilité. La route de conversation reste sans état. Pour les utilisateurs connectés, les échanges sont enregistrés par le service de comptes ; les 20 derniers messages sont restaurés dans l’assistant et les échanges antérieurs restent consultables dans l’historique.

## Fournisseurs interchangeables

`providers.mjs` définit `respond(context) → {message, actions, sources}`. `HttpProvider` transmet le contexte à `CHAT_UPSTREAM_URL`, avec le jeton serveur facultatif `CHAT_UPSTREAM_TOKEN`, délai de 25 secondes. **Ce contrat JSON n’est pas directement celui d’OpenAI, Qwen ou Gemini** : ajouter leur adaptateur dans ce module, ou une passerelle HTTP qui transforme le contexte et normalise leur réponse. Le navigateur et le moteur 3D ne changent pas. Aucun modèle génératif n’est configuré ni testé ici ; l’intégration HTTP est testée avec un fournisseur local contrôlé.

Sans URL, le mode local reconnaît quelques commandes françaises et consulte les neuf cours et les profils anatomiques. Il est volontairement annoncé comme « Ressources locales », ne prétend pas répondre à toute question et ne simule pas une IA générative. Le serveur privilégie le cours courant, puis l’organe nommé, puis la sélection. Pas d’historique conversationnel transmis dans cette première version.

## Actions de scène

`shared/actions.mjs` valide côté serveur et navigateur :

| Action | Paramètre |
| --- | --- |
| focus_structure, show_structure, hide_structure, isolate_structure | structure : ID connu |
| show_system, hide_system | system : ID connu |
| reset_camera | aucun |
| start_animation | animation : heartbeat ou breathing |

Les actions inconnues et identifiants invalides sont écartés ; aucun code reçu n’est exécuté. Si la sélection change pendant la requête, les actions de cette réponse ne sont pas appliquées. L’interface affiche l’erreur du service et permet de renvoyer le message. Les secrets de fournisseur ne doivent jamais utiliser le préfixe `VITE_`.

## Ajouter du contenu

- Cours et niveaux : `src/data/learning.json`, identifiant FMA, six étapes, source et IDs de pathologies.
- Pathologies : `src/data/diseases.json`, six rubriques et source.
- Profils musculaires et vasculaires : `src/data/profiles.json`, motif de nom source, type, champs et source. Les profils de réseau ne décrivent pas précisément chaque branche.
- Systèmes : `src/systems.ts`, correspondances aux structures disponibles ; il ne s’agit pas d’une ontologie médicale exhaustive.
- Quiz : `src/data/quiz.ts`, cible réelle, couches, indice et correction.
- Animations : `src/animations.ts`, registre de cibles, période et amplitude. Le moteur applique et restaure des transformations illustratives. Des valves, flux sanguins ou mouvements articulaires demanderaient des animations/contraintes spécifiques ; ils ne sont pas simulés actuellement.


## Comptes et historique

Le serveur utilise SQLite intégré à Node, sans dépendance ni API payante. En local, `.data/mycorpus.sqlite` est créé au premier accès à l’API de comptes. Ce dossier est ignoré par Git. `.env` reste facultatif : les variables peuvent provenir directement de `process.env`.

### Activation sur Railway

1. Ajouter un **volume au service web MyCorpus** et choisir le chemin de montage `/data`.
2. Railway définit automatiquement `RAILWAY_VOLUME_MOUNT_PATH`. Ne pas simuler cette variable sans volume réel.
3. Définir `APP_ORIGIN=https://mycorpus3d.com` (sans slash final), ou l’origine HTTPS réelle du site.
4. Utiliser Node 24 LTS, une seule instance et la commande `npm start`. Le volume est utilisé seulement au démarrage, jamais lors du build.
5. Redéployer et vérifier `/api/account/session` : `available: true`, `user: null` avant connexion. Créer un compte de test, écrire une note, redéployer puis vérifier sa présence.
6. Activer les sauvegardes du volume dans Railway et tester une restauration avant une utilisation à grande échelle. Un volume persistant n’est pas à lui seul une sauvegarde.

Sans volume Railway déclaré, seules les routes de comptes sont désactivées (503) ; l’atlas, les cours et les quiz invités fonctionnent. Hors Railway, `ACCOUNT_DATA_DIR` permet de choisir le dossier de données. Ne pas déployer sur un stockage éphémère.

### Données conservées et fonctionnement

- Par compte : cours terminés, favoris, notes, tentatives et bilans des quiz, explorations anatomiques, cours consultés, conversations et thème.
- L’historique contient les versions enregistrées des notes et les réponses des quiz. Les sessions de quiz interrompues ne reprennent pas automatiquement à la question courante.
- Enregistrement différé de 800 ms, reprises automatiques en cas de panne et file d’attente dans le stockage de session du navigateur. Attendre « Tout est enregistré » avant de fermer l’onglet ; une alerte prévient si des modifications attendent encore.
- Les données sont chargées à la connexion et au rechargement. Le bouton « Recharger mon compte » actualise depuis le serveur. Pas de collaboration en temps réel.
- Les ajouts de favoris, les cours terminés et les compteurs de quiz sont fusionnés entre appareils. Pour une même note modifiée simultanément, la dernière écriture reçue devient la note courante ; les versions précédentes restent dans l’historique.
- Les invités conservent leurs données locales. L’import est volontaire et ajoute uniquement les rubriques absentes du compte.
- Export JSON et suppression définitive accessibles dans Mon compte.

### Authentification

Mots de passe de 12 à 128 caractères, hachage scrypt N=131072/r=8/p=1 avec sel aléatoire, deux calculs simultanés maximum. Sessions opaques de 30 jours, seuls leurs condensats sont en base. Cookie HttpOnly, SameSite=Lax et Secure en HTTPS. Mutations JSON avec en-tête spécifique et vérification d’origine. Vérification de l’identité attendue avant toute synchronisation pour empêcher les mélanges lors d’un changement de compte dans un autre onglet. Requêtes préparées et transactions atomiques/idempotentes. Limitation des tentatives par adresse et connexion réseau ; derrière le proxy Railway, la limite réseau est partagée.

Aucun service d’e-mail n’est configuré : les adresses ne sont pas vérifiées. Un code secret de récupération, affiché une fois, permet de remplacer un mot de passe oublié. Son utilisation renouvelle le code et révoque les sessions. Sans mot de passe ni code conservé, il n’existe pas de récupération autonome. Aucun mot de passe ni code en clair n’est enregistré en base ou dans les logs.

Tests : `npm run test:accounts` pour l’isolation et la persistance ; `npx playwright test tests/accounts.spec.ts` pour les parcours navigateur.
