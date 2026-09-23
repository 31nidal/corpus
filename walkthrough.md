# Walkthrough - Infrastructure Taxonomique et Couche de Compatibilité

L'infrastructure de la maquette pédagogique canonique de première année Santé (PASS) et sa couche de compatibilité ascendante non destructive ont été intégralement implémentées et testées.

> [!IMPORTANT]
> **Aucun contenu de cours rédigé à ce stade**, conformément aux consignes. Seule l'infrastructure de données, de routage, de persistance et de requêtage a été mise en place.

---

## 1. Architecture de la Source de Vérité (`src/study/taxonomy/`)

La taxonomie canonique est versionnée dans le dépôt sous une structure modulaire et typée :

- [`taxonomyTypes.ts`](src/study/taxonomy/taxonomyTypes.ts) : Définitions TypeScript (`CanonicalCourseMetadata`, `LegacyHub`, `CourseRouteResolution`, `CoursePriority`, `CourseStatus`, etc.).
- [`canonicalCourses.ts`](src/study/taxonomy/canonicalCourses.ts) : Catalogue des **305 chapitres canoniques** avec métadonnées complètes, priorités P0/P1/P2 et mappings universitaires Toulouse corrigés.
- [`legacyHubs.ts`](src/study/taxonomy/legacyHubs.ts) : Registre des **26 Legacy Hubs** issus des scissions de cours trop denses, avec justification pédagogique (`reason`) et pointeurs vers les chapitres enfants (`childrenIds`).
- [`universityMappings.ts`](src/study/taxonomy/universityMappings.ts) : Référentiel universitaire de Toulouse (UE1 à UE13, UE8/11) avec corrections effectives.
- [`routing.ts`](src/study/taxonomy/routing.ts) : Résolveur de routes (`resolveCourseRoute`), prédicats d'identification (`isValidCourseOrHubId`, `isCanonicalCourseId`, `isLegacyHubId`) et résolveurs de titres.
- [`taxonomyValidation.ts`](src/study/taxonomy/taxonomyValidation.ts) : Validateur programmatique d'invariants (comptages, regex kebab-case + exception FMA, absence de collision).
- [`index.ts`](src/study/taxonomy/index.ts) : Point d'entrée réexportant l'ensemble de l'infrastructure.

---

## 2. Invariants & Chiffres Clés Validés

| Métrique | Valeur Cible | Valeur Implémentée | Statut |
| :--- | :---: | :---: | :---: |
| **Chapitres canoniques** | **305** | **305** | Validé |
| **Legacy Hubs** | **26** | **26** | Validé |
| **Priorité P0** | **166** | **166** | Validé |
| **Priorité P1** | **128** | **128** | Validé |
| **Priorité P2** | **11** | **11** | Validé |
| **Anatomie** | **80** | **80** | Validé |
| **Collisions Hub / Canonique** | **0** | **0** | Validé |
| **Format identifiants** | `kebab-case` + `^FMA[0-9]+$` | `kebab-case` + `^FMA[0-9]+$` | Validé |

### Corrections Toulouse validées :
- **Médicament & Société** : `UE8` (aucun cours en `UE4`)
- **Recherche biomédicale** : `UE8/11` (aucun cours en `UE8` seul ou `UE4`)
- **Anglais médical** : `UE13` (aucun cours en `UE12`)

---

## 3. Couche de Compatibilité Non Destructive (Zéro Régression)

### A. Routing & Transition LegacyHub (`CoursesWorkspace.tsx`)
- L'accès à une ancienne URL (ex. `#tab=cours&cours=cell-cycle`) résout en `{ kind: 'legacy-hub' }`.
- **Aucune redirection automatique silencieuse** vers un enfant.
- Affichage de la vue dédiée `LegacyHubView` :
  - Badge **« Ancien cours restructuré »** et mention des nouvelles unités courtes (10–25 min).
  - Explication claire de la restructuration pédagogique (`hub.reason`).
  - Bannière pour les étudiants l'ayant déjà validé : *« Validé dans l'ancienne version du programme. Pour valider la nouvelle version avec sa granularité approfondie, complétez les chapitres ci-dessous »*.
  - Liste interactive des nouveaux chapitres avec statut individuel de complétion et lien direct d'accès.
  - Entraînement QCM d'ensemble sur le thème.
  - Carnet de notes personnel persistant (`corpus-note-[hubId]`).

### B. Conservation de la Progression (`corpus-completed`)
- Dans [`src/App.tsx`](src/App.tsx), le chargement du localStorage utilise désormais `isValidCourseOrHubId(x)`.
- Les anciens identifiants validés ne sont jamais purgés ou écrasés.
- Les enfants ne sont pas marqués terminés automatiquement.

### C. Favoris (`corpus-saved-courses`) & Bibliothèque
- Les anciens identifiants mis en favoris sont préservés.
- Dans [`src/study/CourseLibrary.tsx`](src/study/CourseLibrary.tsx), le catalogue principal n'affiche **que** les cours canoniques (pas d'inflation artificielle des chapitres).
- Sous le filtre `filter === 'saved'`, les anciens hubs enregistrés apparaissent dans une section dédiée avec badge **« Restructuré »**.

### D. Flashcards & Provenance SQLite (`server/flashcards/`)
- Création du module [`server/flashcards/provenance.mjs`](server/flashcards/provenance.mjs) :
  - `expandCourseIdsForProvenance(courseId)` :
    - Si `courseId` est un Legacy Hub (ex. `cell-cycle`) $\rightarrow$ retourne `[hubId, child1, child2, ...]`.
    - Si `courseId` est un enfant (ex. `cell-cycle-phases-control`) $\rightarrow$ retourne `[childId, hubId]`.
    - Si `courseId` est indépendant $\rightarrow$ retourne `[courseId]`.
- [`server/flashcards/repository.mjs`](server/flashcards/repository.mjs) :
  - Mise à jour des requêtes `listNotes` et `listCards` avec placeholders paramétrés `source_course_id IN (?, ?, ...)`.

---

## 4. Résultats des Vérifications Automatisées

1. **Suite de tests dédiée à la taxonomie** :
   ```bash
   npm run test:taxonomy
   ```
   **11/11 tests passés** (`tests/taxonomy.test.mjs`) :
   - Invariants A : 305 canoniques, 26 hubs, 166 P0, 128 P1, 11 P2, 80 anatomie, Toulouse UEs exactes.
   - Résolution B : `cell-cycle` $\rightarrow$ Legacy Hub avec 2 enfants.
   - Résolution C : `cell-cycle-phases-control` $\rightarrow$ cours canonique P0.
   - Progression D : `corpus-completed` préserve `cell-cycle` sans purge.
   - Favoris E : `corpus-saved-courses` préserve `cell-cycle` et ouvre le hub.
   - Carnet F : persistance de `corpus-note-cell-cycle`.
   - Invariance G : enfants non marqués terminés par contamination.
   - Provenance H : expansion hub $\rightarrow$ enfants.
   - Provenance I : expansion enfant $\rightarrow$ hub.
   - Regex J : validation kebab-case et exception `FMA[0-9]+`.
   - Helpers K : `getCourseOrHubTitle` et `getCourseOrHubSubject`.

2. **Suite globale de non-régression** :
   ```bash
   npm run test:study && npm run test:flashcards
   ```
   **80/80 tests passés** (intégrité FSRS, migrations idempotentes, notes, decks, review).

3. **Build de production** :
   ```bash
   npm run build
   ```
   Build TypeScript & Vite réussi sans aucune erreur.
