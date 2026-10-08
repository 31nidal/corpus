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
