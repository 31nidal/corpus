import {randomUUID} from 'node:crypto'
import {generateWithQuota} from '../../ai/generation.mjs'
import {studyError, StudyLibrary} from './library.mjs'
import {selectNoteSources, sourceHash, NOTE_LEVELS, MAX_NOTE_ITEMS, localNoteSummary, noteItems, noteCoverage, canonicalSource} from './note-sources.mjs'

export const MAX_NOTES_PER_DOCUMENT = 30
export const MAX_ACTIVE_NOTE_JOBS = 2
export const MAX_QUEUED_NOTE_JOBS = 6
export const NOTE_LEASE_MS = 60000
const parse = value => JSON.parse(value)
const requestKeys = (body, keys) => {if (Object.keys(body).some(key => !keys.includes(key))) throw studyError(400, 'Paramètre de fiche inconnu.')}

export class StudyNotes {
  constructor({db, provider, config, localSummary, now = Date.now}) {
    Object.assign(this, {db, provider, config, localSummary, now})
    this.library = new StudyLibrary(db, now)
    this.active = new Set()
    this.closed = false
    this.timer = null
    this.pump()
  }
  row(userId, id, documentId) {
    const row = this.db.prepare("SELECT * FROM study_v2_notes WHERE id=? AND user_id=? AND document_id=? AND state!='archived'").get(id, userId, documentId)
    if (!row) throw studyError(404, 'Fiche introuvable.')
    return row
  }
  serialize(row) {
    const scope = parse(row.scope_json), items = parse(row.content_json)
    return {id: row.id, documentId: row.document_id, title: row.title, kind: row.kind, origin: row.origin, state: row.state, generationState: row.generation_state,
      sourceVersion: row.source_version, extraction: scope.extraction || {method:'unknown',warnings:[]}, sourceState: scope.processingState || 'unknown', sections: scope.sections.map(({id, title, startPage, endPage}) => ({id, title, startPage, endPage})), selection: scope.selection,
      items, generation: {mode: row.origin === 'legacy' ? 'legacy' : 'pending', ...parse(row.generation_json)}, coverage: noteCoverage(scope, items), editVersion: row.edit_version,
      errorCode: row.error_code, errorMessage: row.error_message, createdAt: row.created_at, updatedAt: row.updated_at}
  }
  get(userId, documentId, id) {this.library.document(userId, documentId); return this.serialize(this.row(userId, id, documentId))}
  list(userId, documentId) {
    const doc = this.library.document(userId, documentId)
    this.importLegacy(userId, doc)
    return this.db.prepare("SELECT * FROM study_v2_notes WHERE document_id=? AND user_id=? AND state!='archived' ORDER BY created_at DESC,id").all(documentId, userId).map(row => this.serialize(row))
  }
  importLegacy(userId, doc) {
    const old = this.db.prepare('SELECT * FROM study_summaries WHERE document_id=? AND user_id=? ORDER BY created_at,id').all(doc.id, userId)
    const sections = this.db.prepare('SELECT id,title,content,start_page AS startPage,end_page AS endPage FROM study_sections WHERE document_id=? AND user_id=? ORDER BY section_order').all(doc.id, userId)
    for (const summary of old) {
      if (this.db.prepare('SELECT 1 FROM study_v2_notes WHERE id=?').get('legacy-' + summary.id)) continue
      let value
      try {value = parse(summary.summary_json); if(!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Invalid legacy shape')} catch {throw studyError(422, 'Une ancienne synthèse est illisible. L’original reste conservé ; elle n’a pas été remplacée.')}
      const items = (Array.isArray(value.chapters) ? value.chapters : []).flatMap(chapter => {
        const section = sections.find(section => section.id === chapter.id)
        const points = Array.isArray(chapter.keyPoints) ? chapter.keyPoints : chapter.summary ? [chapter.summary] : []
        return points.filter(text => typeof text === 'string').map((text, index) => {
          const proof = chapter.proofs?.[index]?.sourceExcerpt || text
          const matched = section && canonicalSource(section.content).includes(canonicalSource(proof))
          return {id: randomUUID(), sectionId: section?.id || null, sectionTitle: chapter.title || 'Ancienne synthèse', text, originalText: text, originalCategory: '', category: '', sourceExcerpt: proof,
            page: section?.startPage || 1, endPage: section?.endPage || 1, exactPage: false, edited: false, proofStatus: matched ? 'matched' : 'unverified'}
        })
      })
      // Preserve the original overview and hierarchy even if the old shape differs.
      if (typeof value.overview === 'string' && value.overview.trim()) items.unshift({id: randomUUID(), sectionId: null, sectionTitle: 'Vue d’ensemble historique', text: value.overview, originalText: value.overview, category: '', sourceExcerpt: '', page: 1, endPage: doc.pageCount || 1, exactPage: false, edited: false, proofStatus: 'unverified'})
      const scope = {sections, pages: [], selection: null, legacySummary: value}
      const created = Number.isFinite(Date.parse(summary.created_at)) ? Date.parse(summary.created_at) : this.now()
      this.db.prepare(`INSERT OR IGNORE INTO study_v2_notes(id,document_id,user_id,request_id,request_hash,kind,title,state,generation_state,origin,source_version,scope_json,content_json,generation_json,created_at,updated_at)
        VALUES(?,?,?,?,?,'structured',?,'saved','succeeded','legacy',?,?,?,?,?,?)`).run('legacy-' + summary.id, doc.id, userId, 'legacy-' + summary.id, sourceHash(value), doc.title.slice(0,150), doc.version, JSON.stringify(scope), JSON.stringify(items), JSON.stringify({mode:'legacy',message:'Synthèse historique conservée. Les preuves non retrouvées restent à vérifier.'}), created, created)
    }
  }
  create(userId, documentId, body) {
    const doc = this.library.document(userId, documentId)
    requestKeys(body, ['requestId','kind','sectionIds','selection'])
    if (typeof body.requestId !== 'string' || !body.requestId.trim() || body.requestId.length > 100 || !Object.hasOwn(NOTE_LEVELS, body.kind)) throw studyError(400, 'Type de fiche ou identifiant de demande invalide.')
    const hash = sourceHash({documentId, kind: body.kind, sectionIds: body.sectionIds, selection: body.selection})
    const prior = this.db.prepare('SELECT * FROM study_v2_notes WHERE user_id=? AND request_id=?').get(userId, body.requestId)
    if (prior) {if (prior.request_hash !== hash) throw studyError(409, 'Cette demande correspond déjà à une autre fiche.'); return {note: this.serialize(prior), reused: true}}
    if (this.db.prepare("SELECT COUNT(*) AS n FROM study_v2_notes WHERE document_id=? AND user_id=? AND origin='generated'").get(documentId, userId).n >= MAX_NOTES_PER_DOCUMENT) throw studyError(403, 'Ce document possède déjà 30 fiches. Supprimez une fiche avant de générer.')
    if (this.db.prepare("SELECT COUNT(*) AS n FROM study_v2_notes WHERE generation_state IN ('queued','running')").get().n >= MAX_QUEUED_NOTE_JOBS) throw studyError(429, 'Les générations sont occupées. Réessayez dans un instant.')
    const scope = selectNoteSources(this.db, userId, doc, body), id = randomUUID(), now = this.now()
    this.db.prepare('INSERT INTO study_v2_notes(id,document_id,user_id,request_id,request_hash,kind,title,source_version,scope_json,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id, documentId, userId, body.requestId, hash, body.kind, `${NOTE_LEVELS[body.kind].label} — ${doc.title}`.slice(0,150), doc.version, JSON.stringify(scope), now, now)
    queueMicrotask(() => this.pump())
    return {note: this.get(userId, documentId, id), reused: false}
  }
  patch(userId, documentId, id, body) {
    this.library.document(userId, documentId)
    const row = this.row(userId, id, documentId)
    requestKeys(body, ['title','items','state','expectedEditVersion'])
    if (row.generation_state !== 'succeeded') throw studyError(409, 'Attendez la fin de la génération avant d’éditer cette fiche.')
    if (!Number.isSafeInteger(body.expectedEditVersion) || body.expectedEditVersion !== row.edit_version) throw studyError(409, 'La fiche a changé. Rechargez avant de modifier.')
    if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 150)) throw studyError(400, 'Titre de fiche invalide.')
    if (body.state !== undefined && !['draft','saved'].includes(body.state)) throw studyError(400, 'État de fiche invalide.')
    const original = parse(row.content_json)
    let items = original
    if (body.items !== undefined) {
      if (!Array.isArray(body.items) || !body.items.length || body.items.length > MAX_NOTE_ITEMS || new Set(body.items.map(item => item?.id)).size !== body.items.length) throw studyError(400, 'Points de fiche invalides.')
      items = body.items.map(item => {
        const source = original.find(source => source.id === item?.id)
        if (!source || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 2000 || Object.keys(item).some(key => !['id','text','category'].includes(key)) || item.category !== undefined && (typeof item.category !== 'string' || item.category.length > 100)) throw studyError(400, 'Point de fiche invalide. Les sources ne peuvent pas être remplacées.')
        return {...source, text: item.text.trim(), category: item.category ?? source.category, edited: item.text.trim() !== (source.originalText ?? source.text) || (item.category ?? source.category) !== (source.originalCategory ?? source.category)}
      })
    }
    const updated = this.db.prepare('UPDATE study_v2_notes SET title=?,state=?,content_json=?,edit_version=edit_version+1,updated_at=? WHERE id=? AND user_id=? AND edit_version=?').run(body.title?.trim() ?? row.title, body.state ?? row.state, JSON.stringify(items), this.now(), id, userId, row.edit_version)
    if (!updated.changes) throw studyError(409, 'La fiche a changé. Rechargez avant de modifier.')
    return this.get(userId, documentId, id)
  }
  delete(userId, documentId, id) {
    const note=this.get(userId, documentId, id)
    // Keep a tombstone for legacy copies so a future GET cannot resurrect them.
    if(note.origin==='legacy')this.db.prepare("UPDATE study_v2_notes SET state='archived',updated_at=? WHERE id=? AND document_id=? AND user_id=?").run(this.now(),id,documentId,userId)
    else this.db.prepare('DELETE FROM study_v2_notes WHERE id=? AND document_id=? AND user_id=?').run(id,documentId,userId)
  }
  pump() {
    if (this.closed) return
    this.db.prepare("UPDATE study_v2_notes SET generation_state='interrupted',lease_token=NULL,lease_until=NULL,error_code='AI_INTERRUPTED',error_message='Génération interrompue ; consommation IA incertaine. Relancez explicitement une nouvelle fiche.',updated_at=? WHERE generation_state='running' AND COALESCE(lease_until,0)<=?").run(this.now(), this.now())
    while (this.active.size < MAX_ACTIVE_NOTE_JOBS) {
      const row = this.db.prepare("SELECT * FROM study_v2_notes WHERE generation_state='queued' ORDER BY created_at,id LIMIT 1").get()
      if (!row) break
      const token = randomUUID()
      if (!this.db.prepare("UPDATE study_v2_notes SET generation_state='running',lease_token=?,lease_until=?,updated_at=? WHERE id=? AND generation_state='queued'").run(token, this.now() + NOTE_LEASE_MS, this.now(), row.id).changes) continue
      const task = this.generate({...row, lease_token: token}).finally(() => {this.active.delete(task); queueMicrotask(() => this.pump())})
      this.active.add(task)
    }
    clearTimeout(this.timer)
    if (this.db.prepare("SELECT 1 FROM study_v2_notes WHERE generation_state='running'").get()) {this.timer = setTimeout(() => this.pump(), NOTE_LEASE_MS); this.timer.unref?.()}
  }
  async generate(row) {
    const heartbeat = setInterval(() => this.db.prepare("UPDATE study_v2_notes SET lease_until=? WHERE id=? AND generation_state='running' AND lease_token=?").run(this.now() + NOTE_LEASE_MS, row.id, row.lease_token), NOTE_LEASE_MS / 3)
    heartbeat.unref?.()
    let result
    try {
      const doc = this.library.document(row.user_id, row.document_id), scope = parse(row.scope_json)
      result = await generateWithQuota({db: this.db, userId: row.user_id, provider: this.provider?.name === 'gemini' ? this.provider : null, config: this.config,
        task: row.kind === 'short' ? 'summary' : 'revision', context: {documentTitle: doc.title, sections: scope.sections, kind: row.kind === 'short' ? 'summary' : 'revision', detailLevel: row.kind},
        local: () => localNoteSummary(doc.title, scope.sections, row.kind, this.localSummary)})
      const {items, refused, rejectionReasons} = noteItems(result.value, scope, row.kind)
      const content = items.map(item => ({...item, originalText: item.text, originalCategory: item.category}))
      const reasons = {...result.generation.rejectionReasons}
      for (const [reason,count] of Object.entries(rejectionReasons)) reasons[reason] = (reasons[reason] || 0) + count
      const generation = {...result.generation, reviewRequired: true, rejected: (result.generation.rejected || 0) + refused, refusedPoints: refused, rejectionReasons: reasons, detailLevel: row.kind}
      this.db.prepare("UPDATE study_v2_notes SET generation_state='succeeded',content_json=?,generation_json=?,lease_until=NULL,lease_token=NULL,updated_at=? WHERE id=? AND user_id=? AND generation_state='running' AND lease_token=?").run(JSON.stringify(content), JSON.stringify(generation), this.now(), row.id, row.user_id, row.lease_token)
    } catch (error) {
      result?.refund?.()
      this.db.prepare("UPDATE study_v2_notes SET generation_state='failed',error_code=?,error_message=?,generation_json=?,lease_until=NULL,lease_token=NULL,updated_at=? WHERE id=? AND user_id=? AND generation_state='running' AND lease_token=?").run(error.code || 'NOTE_GENERATION_FAILED', error.message || 'Génération impossible. Réessayez.', JSON.stringify(error.generation || {}), this.now(), row.id, row.user_id, row.lease_token)
    } finally {clearInterval(heartbeat)}
  }
  async drain() {this.pump(); while (this.active.size) await Promise.all([...this.active])}
  async close() {this.closed = true; clearTimeout(this.timer); await Promise.all([...this.active])}
}
