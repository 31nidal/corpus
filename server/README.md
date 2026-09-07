# Conversation contextuelle

`npm run dev` monte les routes sur Vite. Pour servir la compilation et l’API ensemble : `npm run build && npm start` (Node 22.9+). Les secrets restent côté serveur. Copier `.env.example` vers `.env` pour configurer un adaptateur, puis redémarrer. Un simple hébergement de `dist/` conserve l’atlas mais ne fournit pas l’API.

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

`GET /api/status` annonce `local` ou `connected`. Erreurs : 400 requête invalide, 405 méthode, 413 taille, 503 indisponibilité. Aucune conversation n’est conservée par ce serveur ; l’interface conserve uniquement les échanges en mémoire.

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
