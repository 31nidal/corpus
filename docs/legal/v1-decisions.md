# V1 gratuite — faits vérifiés et dernières décisions

Vérification du 21 octobre 2026, branche chore/legal-readiness, sans fusion ni déploiement. Aucun secret enregistré dans ce rapport.

## Informations techniques établies

- Hébergement : intégration Railway dans le serveur et la documentation. Les conditions officielles identifient Railway Corporation, 548 Market St Suite 68956, San Francisco, California 94104, États-Unis, +1 415 707-7675, team@railway.com. Sources : https://railway.com/legal/terms et https://railway.com/legal/dpa (consultées le 21 octobre 2026). Ce sont les coordonnées publiées du fournisseur, pas une preuve de la région de ce déploiement ni du contrat particulier de l’éditeur.
- Base : SQLite, fichier mycorpus.sqlite, WAL et clés étrangères ; racine RAILWAY_VOLUME_MOUNT_PATH, sinon ACCOUNT_DATA_DIR, sinon .data. PDF uploads/<userId>, images flashcard_assets. Suppression par propriétaire et export authentifié sur la branche préparatoire.
- IA : API Gemini et modèle gemini-3.5-flash-lite configurés dans l’environnement local (valeurs secrètes non affichées). Le code offre aussi un dialogue HTTP et Study local/Ollama. Aucune preuve de leur activation en production à partir de ces seules variables locales.
- Consultation publique sans connexion du 21 octobre : /api/status retourne local/Ressources locales (uniquement le dialogue), /api/account/session annonce Google disponible et comptes disponibles. Aucun compte créé ni aucune génération lancée sur le site public.
- Cookies : session 30 jours, OAuth 10 minutes, HttpOnly/SameSite, Secure en HTTPS ; progression/thème invités en localStorage et synchronisation en sessionStorage. Pas de SDK audience/publicité trouvé dans le dépôt. Les éventuels ajouts à l’infrastructure restent à confirmer.
- Sauvegardes : aucun script ou planning de sauvegarde trouvé dans le dépôt. Une option Railway peut être configurée hors dépôt ; activation, rotation et région non vérifiables ici. Ne pas annoncer « aucune sauvegarde » ni une durée d’effacement garantie.
- Licences : BodyParts3D CC BY-SA 2.1 Japan selon les fichiers (divergence page fournisseur BY 4.0 documentée), HRA CC BY 4.0, terminologie dérivée Z-Anatomy BY-SA 4.0, polices OFL. Notices et attributions conservées. Aucun sujet de vente n’est nécessaire à cette V1.

## Conservation proposée — nécessite validation ET mise en œuvre

Ces propositions ne sont pas des durées légales universelles et ne décrivent pas une purge déjà implémentée.

| Données | Proposition à approuver | État actuel / action après accord |
|---|---|---|
| Compte, cartes, progression, PDF/images utiles | Jusqu’à suppression ou 24 mois sans activité ; avertissement 30 jours avant fermeture | Pas de suivi/purge d’inactivité ni d’envoi d’avertissement automatisés : à implémenter après accord, sans promettre cette politique en production entre-temps. |
| Historique détaillé de conversations et versions de notes | 12 mois glissants ; notes/cartes actuelles conservées avec le compte | Purge ciblée à prévoir sans effacer le contenu actuel ni les données pédagogiques encore utiles. |
| Signalements et e-mail facultatif | 12 mois après clôture ; conserver la correction pédagogique anonymisée | Clôture et purge à mettre en œuvre. |
| Journaux techniques contrôlés par l’éditeur | 30 jours, sauf incident documenté et limitation spécifique | Vérifier les journaux Railway et options réelles avant engagement. |
| Sauvegardes | Rotation maximale de 30 jours, si l’offre le permet ; réappliquer les suppressions après restauration | Confirmer puis configurer/tester ; pas de garantie actuelle. |
| Preuve CGU | Vie du compte, puis suppression avec lui ; pas d’archive nominative séparée par défaut | Correspond au lien en cascade actuel. Une conservation contentieuse distincte demanderait une justification spécifique. |

Déjà codé : sessions 30 jours, OAuth 10 minutes, compteurs de comptes 15 minutes, nettoyage lors des utilisations suivantes. Brouillons de flashcards rejetés : purge au démarrage au-delà de 30 jours depuis le rejet ; ce n’est pas une garantie de purge quotidienne. Les données invitées restent jusqu’à effacement par le navigateur/utilisateur.

## Mineurs : règle proposée

Service pédagogique à destination des étudiants, y compris mineurs, sans interdiction arbitraire à 18 ans ni contrôle d’âge ou copie de pièce d’identité ajouté. Expliquer simplement les données et les risques d’erreur ; inviter le mineur à solliciter son représentant légal lorsque son accord est nécessaire pour l’utilisation du service. La capacité à accepter les CGU et le consentement RGPD sont deux questions différentes. Le seuil français de 15 ans concerne les traitements fondés sur le consentement pour les services en ligne ; ce n’est pas un âge minimum général d’accès au site. Aucun marketing, profil publicitaire ou consentement facultatif n’est ajouté. Si un traitement soumis au consentement est introduit pour les moins de 15 ans, prévoir l’accord conjoint légalement requis et son mécanisme avant activation.

Sources : https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans et https://www.cnil.fr/les-bases-legales/consentement.

## Les quatre réponses attendues

1. Identité : nom/prénom du responsable et de la publication, adresse de contact appropriée, e-mail public utilisable pour les droits RGPD ; confirmation d’une édition personnelle sans société, si c’est bien le cas. Déterminer les coordonnées à rendre publiques selon le régime réel, sans inventer de statut professionnel.
2. Production : région Railway et volume, sauvegardes activées/rotation ; Gemini utilisé pour génération/OCR ou autre configuration, offre API gratuite/payante et éventuel intermédiaire/CDN/outil d’audience ajouté hors dépôt. Aucun secret nécessaire. Les contrats du fournisseur seront vérifiés sur la base de cette offre précise.
3. Conservation : accord ou ajustements du tableau ci-dessus ; les mécanismes manquants seront implémentés avant d’afficher ces délais comme des engagements effectifs.
4. Public et contenus : accord sur la règle mineurs proposée et confirmation que les textes/logo/schémas propres au projet peuvent être publiés ; les licences tierces déjà identifiées restent intactes.

Cette liste remplace les demandes générales de dossier commercial : pas de SIREN/TVA/capital, CGV, médiateur de vente ou paiement à inventer. Les informations techniques inconnues hors dépôt ne peuvent pas être présentées comme établies. Les décisions prises pourront nécessiter quelques ajustements ciblés de traitement ; les textes seuls ne créent pas une purge ou une vérification parentale.
