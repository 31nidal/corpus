# Génération Study avec Ollama

MyCorpus peut générer les synthèses et les QCM de **Mes cours** avec un Ollama contrôlé par l’utilisateur. En mode `ollama`, les appels Study ne passent jamais par `CHAT_UPSTREAM_URL` : une panne Ollama déclenche le fallback local, sans bascule vers le provider distant.

## Démarrage local

Installe Ollama, puis dans un terminal :

```sh
ollama pull qwen3:8b
ollama serve
```

Dans un autre terminal, configure le serveur MyCorpus dans `.env` :

```dotenv
STUDY_AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
OLLAMA_TIMEOUT_MS=120000
```

Puis lance MyCorpus normalement avec `npm start` ou `npm run dev`. Le serveur vérifie l’installation par sa méthode interne `healthCheck()` ; aucune route publique ne révèle si Ollama ou un modèle est disponible. Pour faire un contrôle ponctuel côté serveur :

```sh
node --env-file-if-exists=.env --input-type=module -e "import {OllamaProvider} from './server/ollama-provider.mjs'; console.log(await new OllamaProvider(process.env).healthCheck())"
```

## Choix du provider Study

- `STUDY_AI_PROVIDER=ollama` : Ollama local, sans quota de génération payant ; échec → fallback local.
- `STUDY_AI_PROVIDER=remote` : provider existant `CHAT_UPSTREAM_URL` ; le quota payant s’applique comme avant.
- `STUDY_AI_PROVIDER=local` : synthèse et QCM heuristiques locaux, sans appel IA ni quota.
- variable absente : comportement compatible avec l’existant ; provider distant si `CHAT_UPSTREAM_URL` est configuré, sinon mode local.
- valeur inconnue : avertissement serveur sans secret ni texte de cours, puis mode local.

## Données transmises à Ollama

Pour les synthèses, le backend envoie le titre, les identifiants/titres/pages des sections, un nombre limité de faits extraits et au plus 4 200 caractères d’extraits sélectionnés. Pour les QCM, il envoie uniquement des faits structurés qui disposent d’au moins trois distracteurs de même catégorie, avec leurs extraits exacts. Le PDF et le texte complet des sections ne sont pas inclus dans les requêtes Ollama. Les prompts et extraits utilisateur ne sont pas journalisés.

La sortie du modèle reste non fiable : le backend vérifie la forme de la synthèse, les références de section et, pour les QCM Ollama, la correspondance du fait source, de la bonne réponse et des distracteurs avec les faits extraits. Les QCM passent ensuite par la validation, le mélange des réponses, la déduplication et la persistance existants.

## MacBook Air M2

`qwen3:8b` est le modèle par défaut proposé : Ollama le distribue en quantification Q4_K_M, autour de 5,2 Go. La vitesse et le confort dépendent de la mémoire unifiée disponible et des autres applications ouvertes. Pour un MacBook Air M2 avec 8 Go de mémoire, commencer plutôt par `qwen3:4b` (autour de 2,5 Go) ; `qwen3:8b` est plus adapté si la machine dispose d’au moins 16 Go. Ces tailles peuvent évoluer avec les tags publiés par Ollama : [bibliothèque officielle Qwen3](https://ollama.com/library/qwen3). Vérifier chaque sortie médicale avec les extraits et les supports du cours.

## Déploiement

`127.0.0.1` désigne la machine qui exécute le serveur Node. Sur Railway ou un autre hébergeur, cette adresse pointerait vers le conteneur, pas vers le MacBook. Pour le mode Ollama en production, il faut donc exécuter Ollama sur le même hôte ou sur un réseau privé contrôlé, avec une URL non exposée au public.
