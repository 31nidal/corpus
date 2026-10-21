# Anonymat de l’éditeur et vérifications de production

Vérification du 21 octobre 2026. Document de préparation, aucune publication autorisée par ce bilan. Aucune identité personnelle, clé, donnée utilisateur ou pièce justificative privée ne doit être ajoutée au dépôt.

## LCEN : possibilité conditionnelle

L’article 1-1, II de la [LCEN](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000801164) permet aux éditeurs à titre non professionnel de préserver leur anonymat public en publiant l’identification et l’adresse de leur hébergeur, sous réserve de lui communiquer les éléments d’identification personnelle visés au I. L’article prévoit également le secret professionnel, non opposable à l’autorité judiciaire. Le texte ne garantit pas une impossibilité de réidentification ni l’anonymat envers les autorités.

L’éditeur déclare un projet personnel, gratuit, sans société ni activité commerciale liée au site. Sur ces faits déclarés, le régime non professionnel paraît pertinent ; la gratuité seule n’est pas une preuve universelle de qualification. Les pages préparatoires présentent ce statut sans inventer une société ni exiger de coordonnées personnelles publiques au titre des mentions LCEN. Elles ne prétendent pas que la transmission à Railway a déjà été réalisée.

Les coordonnées vérifiées sur les [conditions Railway](https://railway.com/legal/terms) sont Railway Corporation, 548 Market St Suite 68956, San Francisco, California 94104, États-Unis ; +1 415 707-7675 ; team@railway.com. Elles identifient le fournisseur, pas le responsable de traitement MyCorpus3D, sa région réelle ni ses sauvegardes. Le nom et l’adresse de l’hébergeur sont prévus par le régime dérogatoire ; son téléphone public vérifié peut être conservé sans publier celui de l’éditeur.

## Transmission confidentielle à prévoir

1. Vérifier que le compte contractuel Railway couvre bien le service mycorpus3d.com.
2. Depuis l’espace privé Railway ou son support authentifié, demander le canal sécurisé adapté pour communiquer les éléments d’identification requis par l’article 1-1, I et II (pour une personne physique, notamment identité, domicile, téléphone et identification du responsable de publication selon le texte). Un compte connecté par GitHub ou une simple adresse e-mail ne prouve pas cette communication.
3. Vérifier le destinataire, les modalités de confidentialité et les possibilités de traitement des demandes légales/droit de réponse ; ne pas envoyer de document d’identité non demandé ni plus d’informations que nécessaire.
4. Communiquer directement ces informations par le canal confirmé, conserver la confirmation de réception et la maintenir à jour. Conserver les justificatifs hors dépôt, hors variables du frontend et hors dossier `public`.
5. Ne modifier la mention publique de transmission accomplie qu’après confirmation. La branche peut référencer une confirmation expurgée, jamais le contenu des coordonnées.

Aucun message ni document n’a été envoyé à Railway. Les coordonnées personnelles ne sont pas demandées dans le chat pour être copiées dans le code.

## RGPD : difficulté distincte

L’[article 13 du RGPD](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3) exige notamment l’identité et les coordonnées du responsable au moment de la collecte. L’exception LCEN ne contient pas une exemption générale à cette obligation. Le projet collecte comptes et contenus personnels ; la publication sur internet ne relève pas automatiquement d’un usage exclusivement domestique.

Une boîte dédiée active permet un contact sans révéler téléphone ou e-mail personnels. Une domiciliation ou une adresse de correspondance valable peut protéger l’adresse de domicile dans la mesure juridiquement appropriée, mais ne remplace pas l’identité exigible du responsable. Un mandataire, DPO ou hébergeur ne devient pas responsable du traitement par simple mention sur le site.

Solutions à étudier, sans les présenter comme déjà effectives :
- Une personne morale réellement constituée (par exemple une association) qui assume effectivement les décisions et responsabilités du traitement pourrait être identifiée avec son nom, ses coordonnées et son contact. Elle ne doit pas être fictive ; ses registres publics peuvent identifier des dirigeants. Aucune création ni garantie d’anonymat global n’est supposée.
- Si l’éditeur reste une personne physique, obtenir une position juridiquement étayée sur l’articulation LCEN/RGPD et le dispositif d’information des personnes concernées, auprès de la CNIL ou d’un conseil. Une notice individuelle ne peut pas simplement cacher une information obligatoire après la collecte. Aucune exception permettant ici une marque seule accompagnée d’une boîte e-mail n’a été établie.

Dans la configuration actuelle, je ne peux donc certifier la compatibilité entre anonymat personnel intégral demandé et information RGPD complète. Le responsable ne doit pas être remplacé par « Railway » ou une entité inventée pour lever ce blocage.

## État des paramètres de production

| Information | État | Source et limite |
| --- | --- | --- |
| Identité et coordonnées publiques Railway | confirmé | Conditions Railway, consultées le 21 octobre 2026 ; ne prouve pas les paramètres du compte |
| Région Railway du service | inaccessible | Connecteur Railway trouvé mais non installé ; aucun outil Railway connecté, CLI ou jeton d’accès détecté |
| Région Railway du volume | inaccessible | Mêmes limites ; aucune déduction depuis un nom de domaine ou une région supposée |
| Sauvegardes : activation | inaccessible | Configuration du volume non accessible ; aucune activation déduite de l’existence d’un volume |
| Sauvegardes : rotation/rétention | inaccessible | Aucun historique/configuration de sauvegarde accessible |
| Modèle Gemini effectif en production | non confirmé | Endpoints de génération renvoient 401 sans session ; aucun accès à la configuration du service. Le modèle par défaut du code ne prouve pas le modèle déployé |
| Projet Google Cloud correspondant à la production | non confirmé | Aucun identifiant de projet de production établi par un accès autorisé |
| Cloud Billing actif pour ce projet | inaccessible | Aucun outil d’administration Cloud Billing connecté ; gcloud, jeton et identifiants ADC usuels non détectés |
| Dialogue public : ressources locales | confirmé | GET public `/api/status` : 200, mode local ; ne renseigne pas les générations Study/Flashcards/OCR |
| Connexion Google disponible | confirmé | GET public `/api/account/session` : 200, disponibilité Google vraie ; ne prouve pas l’état de Gemini/Billing |
| Transmission de l’identité à Railway | non confirmé | Aucun justificatif fourni ni compte d’hébergement consultable |
| Contact public/RGPD actif | non confirmé | Aucune adresse dédiée effectivement créée et validée n’a été fournie |

Seuls des indicateurs de présence d’accès locaux ont été examinés : aucun contenu de secret n’a été affiché. Aucun accès via navigateur personnel, trousseau, cookies de production, base utilisateurs ou boîte mail n’a été tenté. Aucune configuration, aucun appel de génération et aucun déploiement n’ont été déclenchés.

## Traces publiques et limite de l’audit

Une recherche textuelle ciblée dans `public`, `src`, `shared` et `index.html` n’a pas trouvé de nom personnel fourni, chemin `/Users/` ni champ auteur de l’éditeur à retirer. Cela ne constitue pas un audit exhaustif des métadonnées binaires, DNS/WHOIS ou archives publiques. Les crédits nominatifs des auteurs tiers requis par les licences restent conservés.

Le parcours de signalement actuel (`src/study/feedback.ts`) pointe vers le dépôt GitHub existant ; le README cite également ce dépôt. Ce lien peut permettre une corrélation avec le compte du propriétaire. Il n’a pas été supprimé silencieusement car il sert une fonctionnalité existante et aucune adresse dédiée active de remplacement n’est disponible. Les auteurs des commits et l’historique GitHub peuvent également permettre une corrélation : aucune réécriture d’historique ni suppression destructive n’est effectuée. Ne pas promettre un anonymat absolu du site actuel ou de ses archives.

## Contrôles maintenus

La demande d’omettre l’obstacle Gemini ne le résout pas. L’information utile sur les destinataires et transmissions de données reste présente ; les vérifications contractuelles restent bloquantes dans le dossier et le contrôle de publication. Aucune fonctionnalité n’est désactivée. Rien n’est fusionné ou déployé.

Les pages ont été régénérées avec le statut non professionnel et sans demande de coordonnées personnelles à insérer publiquement. `legal:check`, les deux tests Node des liens/blocage et `git diff --check` ont été relancés avec succès. Les changements sont documentaires ; le backend et la configuration de production restent inchangés.
