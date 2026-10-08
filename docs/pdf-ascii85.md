# Extraction des PDF ASCII85

L’extracteur Node natif décode ASCII85Decode (alias A85) et FlateDecode (alias Fl) dans l’ordre déclaré par `/Filter`, y compris `[/ASCII85Decode /FlateDecode]`. Aucun nouveau package ni migration du backend vers pdfjs-dist.

ASCII85 prend en charge les espaces PDF, l’abréviation `z`, les groupes finaux partiels et le marqueur final `~>` (préfixe `<~` optionnel). Les caractères invalides, dépassements 32 bits et groupes incomplets sont refusés. Flate conserve le fallback raw-inflate.

L’upload renvoie 422 avec un code et les filtres rencontrés :

- `ERR_NO_EXTRACTABLE_TEXT`, `scanned: true` : pas assez de texte extractible, scan/image possible, sans OCR. Un PDF texte très court reste également refusé par le seuil existant de 50 caractères.
- `ERR_UNSUPPORTED_PDF_FILTER`, `scanned: false` : nom du filtre non supporté dans le message, par exemple LZWDecode.
- `ERR_INVALID_PDF_STREAM`, `scanned: false` : encodage invalide ou flux corrompu pour un filtre supporté.

Les filtres des images ne bloquent pas l’extraction du texte : ils ne sont pas décodés. Un filtre non supporté sur un contenu de page ou un ToUnicode requis reste une erreur explicite. Les filtres rencontrés sont listés sur les erreurs, sans prétendre prendre en charge tous les formats PDF.

## Vérifications

Exports réels Reportlab dans les trois variantes (texte identique vérifié). Tests d’extraction et upload réel du backend pour ASCII85+Flate, Flate seul et non compressé ; extraction ASCII85 seul, vecteur connu, espaces/z/groupes partiels, rejets d’encodages invalides, distinction scan/filtre inconnu, non-régression sur une image DCTDecode accompagnant du texte.

## Non vérifié

Les trois exports de test ont été produits avec Reportlab 5.0.1 dans un environnement Python temporaire, sans dépendance ajoutée au projet. Ils sont conservés en fixtures (environ 4,2 ko au total) et testés sans Python. Aucun PDF réel fourni par un utilisateur n’a été testé. Pas de benchmark sur un large corpus, pas d’OCR, pas de support ajouté pour les PDF chiffrés, LZW, les références indirectes de Filter ou les nouveaux DecodeParms.

## Régression de longueur indirecte

Le dictionnaire `/Length 6 0 R/Filter/FlateDecode` du PDF du Collège de cardiologie UNESS était interprété comme une longueur directe de six octets. Les références sont désormais reconnues avant les valeurs directes et résolues à la deuxième passe. Un test couvre les objets de longueur avant/après le flux et les variantes Flate, ASCII85+Flate et non compressées. Les tests de scan, filtre non supporté et flux corrompu restent inchangés.

Retest des documents publics du benchmark, mêmes SHA-256 : Collège cardiologie 125 pages / 238 995 caractères ; sémiologie cardiologique 18 / 29 356 ; pharmacologie Lyon 1 70 / 24 346 ; physiologie Grenoble 29 / 6 744. Aucun rejet restant parmi ces quatre documents. Ces volumes ne garantissent pas une restitution exacte des tableaux, formules ou colonnes. Les originaux externes ne sont pas versionnés.

## Décodage Unicode identifié pendant le retest

Le déblocage des flux a révélé un défaut préexistant : les tables ToUnicode des différentes polices étaient fusionnées, et les chaînes littérales ignoraient ces tables. Le parseur conserve maintenant les tables par objet et résout la police active via les ressources de la page (héritées ou locales). Les chaînes littérales et hexadécimales utilisent cette police. Le chemin de repli existant reste disponible lorsque l’objet police n’est pas résolu. La normalisation TeX préserve aussi l’accent sur le i sans point. Aucun nouveau viewer, moteur PDF ou dépendance n’a été introduit.

Retest final : cardiologie Collège 125 pages / 238 149 caractères ; sémiologie 18 / 28 999 ; pharmacologie 70 / 23 971 ; Grenoble 29 / 6 744. La présence des tokens de référence d’au moins trois caractères (pdfjs-dist, uniquement pour le benchmark) atteint respectivement 99,89 %, 100 %, 96,90 % et 94,56 %. Aucun document n’a une page de plus de 100 caractères de référence totalement vide côté extracteur natif. Cette mesure ne vérifie ni l’ordre des mots ni leur justesse médicale ; Grenoble conserve notamment des mots/formules collés et des coupures de mots. Elle utilise une tokenisation différente du premier rapport et ses pourcentages ne se comparent pas directement à celui-ci.

Le test de replay vérifie les empreintes, le nombre de pages et des repères textuels lisibles des quatre documents. Les tests unitaires couvrent deux polices aux mêmes codes, des changements de police dans un même flux, les chaînes littérales/hexadécimales et les ressources héritées/locaux. Le PDF universitaire complet reste externe au dépôt.
