import { Worker } from 'node:worker_threads';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';
import { chunkIntoSections } from '../../pdfExtractor.mjs';
import { generateWithQuota } from '../../ai/generation.mjs';
import { transcribeMissingPages } from '../ocr-pages.mjs';
import { getOrResetStudyQuota } from '../quota.mjs';
import { studyError, StudyLibrary } from './library.mjs';
export const MAX_DOCUMENT_WORKERS = 2;
export const MAX_QUEUED_DOCUMENT_JOBS = 8;
export const DOCUMENT_LEASE_MS = 60000;
export const MAX_DOCUMENT_RESTART_ATTEMPTS = 3;
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
export const DOCUMENT_WORKER_TIMEOUT_MS = 120000;
export const MIN_DOCUMENT_TEXT_CHARACTERS = 50;
export const MAX_DOCUMENT_TEXT_CHARACTERS = 2000000;
const hash = buffer => createHash('sha256').update(buffer).digest('hex');
const remove = file => { try {
    unlinkSync(file);
}
catch { /* rollback/cleanup only */ } };
const publicJob = row => ({ id: row.id, documentId: row.document_id, state: row.state, stage: row.stage, attempts: row.attempts, errorCode: row.error_code, errorMessage: row.error_message, updatedAt: row.updated_at });
export function extractInWorker(buffer) {
    return new Promise((resolve, reject) => {
        const bytes = new Uint8Array(buffer);
        const worker = new Worker(new URL('./worker.mjs', import.meta.url), { workerData: { bytes }, transferList: [bytes.buffer], resourceLimits: { maxOldGenerationSizeMb: 256 } });
        let settled = false;
        const finish = (error, value) => { if (settled)
            return; settled = true; clearTimeout(timer); void worker.terminate(); error ? reject(error) : resolve(value); };
        const timer = setTimeout(() => finish(studyError(422, 'Le traitement du PDF a dépassé le délai. L’original est conservé.', 'PDF_PROCESSING_TIMEOUT')), DOCUMENT_WORKER_TIMEOUT_MS);
        worker.once('message', result => finish(result.error ? Object.assign(new Error(result.error.message), result.error) : null, result.extracted));
        worker.once('error', error => finish(studyError(422, 'Impossible de traiter ce PDF. L’original est conservé.', error.code || 'PDF_WORKER_FAILED')));
        worker.once('exit', code => { if (code !== 0)
            finish(studyError(422, 'Le traitement a été interrompu. L’original est conservé.', 'PDF_WORKER_FAILED')); });
    });
}
export class DocumentPipeline {
    constructor({ db, getStorageDir, provider, config = {}, extract = extractInWorker, now = Date.now }) {
        Object.assign(this, { db, getStorageDir, provider, config, extract, now });
        this.library = new StudyLibrary(db, now);
        this.active = new Set();
        this.closed = false;
        this.timer = null;
        this.recover();
        this.wake();
    }
    file(userId, id) { return path.join(this.getStorageDir(userId), id + '.pdf'); }
    job(userId, id) { const row = this.db.prepare('SELECT * FROM study_v2_jobs WHERE id=? AND user_id=?').get(id, userId); if (!row)
        throw studyError(404, 'Traitement introuvable.'); return publicJob(row); }
    latest(userId, id) { this.library.document(userId, id); const row = this.db.prepare('SELECT * FROM study_v2_jobs WHERE document_id=? AND user_id=? ORDER BY created_at DESC,id DESC LIMIT 1').get(id, userId); return row ? publicJob(row) : null; }
    upload(userId, buffer, { requestId, title, filename, consentOcr = false } = {}) {
        if (typeof requestId !== 'string' || !requestId.trim() || requestId.length > 100)
            throw studyError(400, 'Identifiant de demande requis.');
        if (typeof consentOcr !== 'boolean' || !Buffer.isBuffer(buffer) || !buffer.length)
            throw studyError(400, 'Import invalide.');
        if (buffer.length > MAX_DOCUMENT_BYTES)
            throw studyError(413, 'Le PDF dépasse 25 Mo.');
        if (!buffer.subarray(0, 1024).includes(Buffer.from('%PDF-')))
            throw studyError(415, 'Ce fichier n’est pas un PDF.');
        if (typeof filename !== 'string' || !filename.toLowerCase().endsWith('.pdf') || filename.length > 150 || typeof title !== 'string' || !title.trim() || title.length > 150)
            throw studyError(400, 'Nom ou titre du PDF invalide.');
        const fileHash = hash(buffer), prior = this.db.prepare('SELECT * FROM study_v2_jobs WHERE user_id=? AND request_id=?').get(userId, requestId);
        if (prior) {
            if (this.db.prepare('SELECT file_hash FROM study_v2_document_meta WHERE document_id=? AND user_id=?').get(prior.document_id, userId)?.file_hash !== fileHash)
                throw studyError(409, 'Cette demande correspond déjà à un autre fichier.');
            return { document: this.library.document(userId, prior.document_id), job: publicJob(prior), reused: true };
        }
        const quota = getOrResetStudyQuota(userId, this.db);
        if (buffer.length > quota.max_file_size_bytes)
            throw studyError(413, 'Le PDF dépasse votre limite de taille.');
        if (this.db.prepare('SELECT COUNT(*) AS n FROM study_documents WHERE user_id=?').get(userId).n >= quota.max_documents)
            throw studyError(403, 'Votre quota de documents est atteint.');
        this.checkQueue();
        const id = randomUUID(), jobId = randomUUID(), now = this.now(), target = this.file(userId, id), temp = target + '.tmp';
        try {
            writeFileSync(temp, buffer, { mode: 0o600 });
            renameSync(temp, target);
        }
        catch (error) {
            remove(temp);
            throw error;
        }
        this.db.exec('BEGIN IMMEDIATE');
        try {
            this.db.prepare(`INSERT INTO study_documents(id,user_id,title,filename,file_size,status,created_at,updated_at) VALUES(?,?,?,?,?,'processing',?,?)`).run(id, userId, title.trim(), path.basename(filename).replace(/["\r\n]/g, '_'), buffer.length, new Date(now).toISOString(), new Date(now).toISOString());
            this.db.prepare(`INSERT INTO study_v2_document_meta(document_id,user_id,file_hash,created_at,updated_at) VALUES(?,?,?,?,?)`).run(id, userId, fileHash, now, now);
            this.db.prepare(`INSERT INTO study_v2_jobs(id,document_id,user_id,request_id,kind,consent_ocr,created_at,updated_at) VALUES(?,?,?,?,'extract',?,?,?)`).run(jobId, id, userId, requestId, Number(consentOcr), now, now);
            this.db.exec('COMMIT');
        }
        catch (error) {
            this.db.exec('ROLLBACK');
            remove(temp);
            remove(target);
            throw error;
        }
        this.wake();
        return { document: this.library.document(userId, id), job: this.job(userId, jobId), reused: false };
    }
    checkQueue() { if (this.db.prepare("SELECT COUNT(*) AS n FROM study_v2_jobs WHERE state IN ('queued','running')").get().n >= MAX_QUEUED_DOCUMENT_JOBS)
        throw studyError(429, 'Les traitements sont occupés. Réessayez dans un instant.'); }
    retry(userId, id, { requestId, consentOcr = false } = {}) {
        const doc = this.library.document(userId, id);
        if (typeof requestId !== 'string' || !requestId.trim() || requestId.length > 100 || typeof consentOcr !== 'boolean')
            throw studyError(400, 'Reprise invalide.');
        const prior = this.db.prepare('SELECT * FROM study_v2_jobs WHERE user_id=? AND request_id=?').get(userId, requestId);
        if (prior) {
            if (prior.document_id !== id)
                throw studyError(409, 'Identifiant de demande déjà utilisé.');
            return { job: publicJob(prior), reused: true };
        }
        if (['ready', 'processing', 'imported'].includes(doc.processingState))
            throw studyError(409, 'Ce document n’attend pas de reprise.');
        if (!existsSync(this.file(userId, id)))
            throw studyError(404, 'Le PDF original est introuvable. Importez-le de nouveau.');
        if (doc.sectionCount && !consentOcr)
            throw studyError(409, 'Les passages déjà extraits sont conservés. Activez l’OCR pour récupérer les pages manquantes.');
        this.checkQueue();
        const jobId = randomUUID(), now = this.now();
        this.db.exec('BEGIN IMMEDIATE');
        try {
            this.db.prepare(`INSERT INTO study_v2_jobs(id,document_id,user_id,request_id,kind,consent_ocr,created_at,updated_at) VALUES(?,?,?,?,'extract',?,?,?)`).run(jobId, id, userId, requestId, Number(consentOcr), now, now);
            this.db.prepare("UPDATE study_v2_document_meta SET processing_state='imported',updated_at=? WHERE document_id=? AND user_id=?").run(now, id, userId);
            this.db.prepare("UPDATE study_documents SET status='processing',error_message=NULL WHERE id=? AND user_id=?").run(id, userId);
            this.db.exec('COMMIT');
        }
        catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
        this.wake();
        return { job: this.job(userId, jobId), reused: false };
    }
    recover() {
        const expired = this.db.prepare("SELECT * FROM study_v2_jobs WHERE state='running' AND COALESCE(lease_until,0)<=?").all(this.now());
        for (const job of expired) {
            if (job.stage === 'ocr')
                this.fail(job, studyError(409, 'L’OCR a été interrompu ; sa consommation est incertaine. Reprenez explicitement si nécessaire.', 'OCR_INTERRUPTED'), 'interrupted');
            else if (job.attempts >= MAX_DOCUMENT_RESTART_ATTEMPTS)
                this.fail(job, studyError(422, 'Plusieurs interruptions du traitement. Le PDF original est conservé.', 'PDF_RESTART_LIMIT'));
            else
                this.db.prepare("UPDATE study_v2_jobs SET state='queued',lease_until=NULL,lease_token=NULL WHERE id=?").run(job.id);
        }
    }
    wake() { if (!this.closed)
        queueMicrotask(() => this.pump()); }
    pump() {
        if (this.closed)
            return;
        this.recover();
        while (this.active.size < MAX_DOCUMENT_WORKERS) {
            const job = this.db.prepare("SELECT * FROM study_v2_jobs WHERE state='queued' ORDER BY created_at,id LIMIT 1").get();
            if (!job)
                break;
            const leaseToken = randomUUID();
            const claimed = this.db.prepare("UPDATE study_v2_jobs SET state='running',attempts=attempts+1,lease_until=?,updated_at=?,lease_token=? WHERE id=? AND state='queued'").run(this.now() + DOCUMENT_LEASE_MS, this.now(), leaseToken, job.id);
            if (!claimed.changes)
                continue;
            const task = this.run({ ...job, lease_token: leaseToken }).finally(() => { this.active.delete(task); this.wake(); });
            this.active.add(task);
        }
        clearTimeout(this.timer);
        if (this.db.prepare("SELECT 1 FROM study_v2_jobs WHERE state='running'").get()) {
            this.timer = setTimeout(() => this.pump(), DOCUMENT_LEASE_MS);
            this.timer.unref?.();
        }
    }
    stage(job, name) {
        const result = this.db.prepare("UPDATE study_v2_jobs SET stage=?,lease_until=?,updated_at=? WHERE id=? AND user_id=? AND state='running' AND lease_token=?").run(name, this.now() + DOCUMENT_LEASE_MS, this.now(), job.id, job.user_id, job.lease_token);
        if (!result.changes)
            throw studyError(404, 'Le traitement a été repris ou le document supprimé.', 'JOB_LEASE_LOST');
    }
    async run(job) {
        const heartbeat = setInterval(() => this.db.prepare("UPDATE study_v2_jobs SET lease_until=? WHERE id=? AND state='running' AND lease_token=?").run(this.now() + DOCUMENT_LEASE_MS, job.id, job.lease_token), DOCUMENT_LEASE_MS / 3);
        heartbeat.unref?.();
        try {
            this.db.prepare("UPDATE study_v2_document_meta SET processing_state='processing' WHERE document_id=? AND user_id=?").run(job.document_id, job.user_id);
            this.stage(job, 'extracting');
            const buffer = readFileSync(this.file(job.user_id, job.document_id));
            let extracted;
            try {
                extracted = await this.extract(buffer);
            }
            catch (error) {
                if (error.code !== 'ERR_NO_EXTRACTABLE_TEXT' || !job.consent_ocr)
                    throw error;
                this.stage(job, 'ocr');
                if (this.provider?.name !== 'gemini')
                    throw studyError(503, 'Gemini n’est pas disponible pour l’OCR. Le PDF original est conservé.', 'AI_OCR_UNAVAILABLE');
                const result = await generateWithQuota({ db: this.db, userId: job.user_id, provider: this.provider, config: this.config, task: 'ocr', context: { buffer, pageCount: error.pageCount || 1 }, local: () => null });
                if (result.value.pages.reduce((n, page) => n + page.text.replace(/\s/g, '').length, 0) < MIN_DOCUMENT_TEXT_CHARACTERS) {
                    result.refund?.();
                    throw studyError(422, 'L’OCR n’a pas récupéré de texte. L’original est conservé.', 'ERR_NO_EXTRACTABLE_TEXT');
                }
                extracted = { pageCount: result.value.pageCount, pages: result.value.pages, extraction: { method: 'ocr', warnings: result.value.pages.filter(page => page.uncertain).map(page => `Page ${page.pageNumber} : transcription incertaine.`) } };
            }
            if (job.consent_ocr && extracted.pages.some(page => !page.text.trim())) {
                this.stage(job, 'ocr');
                extracted = (await transcribeMissingPages({ extracted, buffer, db: this.db, userId: job.user_id, provider: this.provider, config: this.config })).extracted;
            }
            if (!Number.isSafeInteger(extracted.pageCount) || extracted.pageCount < 1 || extracted.pageCount > 600 || !Array.isArray(extracted.pages) || extracted.pages.length !== extracted.pageCount || extracted.pages.some((page, index) => page.pageNumber !== index + 1 || typeof page.text !== 'string'))
                throw studyError(422, 'Les pages extraites sont incomplètes. Le PDF original est conservé.', 'PDF_INVALID_PAGE_MAP');
            const characters = extracted.pages.reduce((n, page) => n + page.text.replace(/\s/g, '').length, 0);
            if (characters < MIN_DOCUMENT_TEXT_CHARACTERS)
                throw studyError(422, 'Aucun texte suffisamment exploitable. Le PDF original est conservé.', 'ERR_NO_EXTRACTABLE_TEXT');
            if (characters > MAX_DOCUMENT_TEXT_CHARACTERS)
                throw studyError(413, 'Le texte extrait dépasse la limite. Scindez le PDF original.', 'PDF_TEXT_LIMIT');
            this.stage(job, 'indexing');
            this.persist(job, extracted);
        }
        catch (error) {
            this.fail(job, error);
        }
        finally {
            clearInterval(heartbeat);
        }
    }
    persist(job, extracted) {
        this.stage(job, 'indexing'); // Verify the lease again before committing any source.
        const userId = job.user_id, id = job.document_id, now = this.now(), doc = this.library.document(userId, id);
        const oldPages = this.db.prepare('SELECT page_number AS pageNumber,text FROM study_pdf_pages WHERE document_id=? AND user_id=? ORDER BY page_number').all(id, userId);
        // Preserve every already cited passage; recovery adds only previously unreadable pages.
        const pages = extracted.pages.map(page => { const old = oldPages.find(item => item.pageNumber === page.pageNumber); return old?.text.trim() ? { ...page, text: old.text, blocks: [{ text: old.text }] } : page; });
        const recovered = oldPages.length ? pages.filter(page => !oldPages.find(old => old.pageNumber === page.pageNumber)?.text.trim() && page.text.trim()) : pages;
        const sections = chunkIntoSections(recovered.filter(page => page.text.trim()));
        const state = pages.some(page => !page.text.trim()) || extracted.extraction?.warnings?.some(w => /incertain|superposées/.test(w)) ? 'partial' : 'ready';
        const oldSections = this.db.prepare('SELECT id,title,content,start_page AS startPage,end_page AS endPage,section_order AS sectionOrder FROM study_sections WHERE document_id=? AND user_id=? ORDER BY section_order').all(id, userId);
        const version = this.db.prepare('SELECT 1 FROM study_v2_versions WHERE document_id=?').get(id) ? doc.version + 1 : 1;
        const versionId = randomUUID();
        this.db.exec('BEGIN IMMEDIATE');
        try {
            for (const page of pages)
                this.db.prepare('INSERT INTO study_pdf_pages VALUES(?,?,?,?) ON CONFLICT(document_id,page_number) DO UPDATE SET text=excluded.text WHERE study_pdf_pages.user_id=excluded.user_id').run(id, userId, page.pageNumber, page.text);
            const added = sections.map((section, index) => ({ ...section, id: `${id}-v${version}-sec-${index + 1}`, sectionOrder: oldSections.length + index + 1 }));
            for (const section of added)
                this.db.prepare('INSERT INTO study_sections VALUES(?,?,?,?,?,?,?,?,?)').run(section.id, id, userId, section.title, section.sectionOrder, section.startPage, section.endPage, section.content, section.tokenCount);
            const metadata = extracted.extraction || { method: 'native', warnings: [] };
            this.db.prepare('INSERT INTO study_pdf_extractions VALUES(?,?,?) ON CONFLICT(document_id) DO UPDATE SET metadata_json=excluded.metadata_json WHERE study_pdf_extractions.user_id=excluded.user_id').run(id, userId, JSON.stringify(metadata));
            this.db.prepare('INSERT INTO study_v2_versions VALUES(?,?,?,?,?,?,?)').run(versionId, id, userId, version, JSON.stringify([...oldSections, ...added]), JSON.stringify(metadata), now);
            for (const page of pages)
                for (const [index, block] of (page.blocks || [{ text: page.text }]).entries())
                    this.db.prepare('INSERT INTO study_v2_blocks VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(), id, userId, versionId, page.pageNumber, index, block.heading ? 'heading' : block.code ? 'code' : block.table ? 'table' : 'paragraph', block.text, null);
            this.db.prepare("UPDATE study_documents SET page_count=?,status='ready',error_message=NULL,updated_at=? WHERE id=? AND user_id=?").run(extracted.pageCount, new Date(now).toISOString(), id, userId);
            this.db.prepare('UPDATE study_v2_document_meta SET processing_state=?,current_version=?,updated_at=? WHERE document_id=? AND user_id=?').run(state, version, now, id, userId);
            this.db.prepare("UPDATE study_v2_jobs SET state='succeeded',stage='complete',lease_until=NULL,lease_token=NULL,error_code=NULL,error_message=NULL,updated_at=? WHERE id=? AND user_id=?").run(now, job.id, userId);
            this.db.exec('COMMIT');
        }
        catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }
    fail(job, error, jobState) {
        if (error.code === 'JOB_LEASE_LOST')
            return;
        if (job.lease_token && !this.db.prepare("SELECT 1 FROM study_v2_jobs WHERE id=? AND lease_token=? AND state='running'").get(job.id, job.lease_token))
            return;
        const attention = ['ERR_NO_EXTRACTABLE_TEXT', 'ERR_UNSUPPORTED_PDF_FILTER', 'AI_OCR_UNAVAILABLE', 'AI_OCR_LIMIT', 'AI_RATE_LIMIT', 'AI_DAILY_BUDGET', 'ERR_GENERATION_QUOTA_EXCEEDED', 'OCR_INTERRUPTED'].includes(error.code);
        const state = jobState || (attention ? 'needs_attention' : 'failed'), now = this.now();
        this.db.exec('BEGIN IMMEDIATE');
        try {
            if (Number.isSafeInteger(error.pageCount) && error.pageCount >= 1 && error.pageCount <= 600) {
                this.db.prepare('UPDATE study_documents SET page_count=? WHERE id=? AND user_id=?').run(error.pageCount, job.document_id, job.user_id);
            }
            this.db.prepare('UPDATE study_v2_jobs SET state=?,error_code=?,error_message=?,lease_until=NULL,lease_token=NULL,updated_at=? WHERE id=? AND user_id=?').run(state, error.code || 'PDF_PROCESSING_FAILED', error.message || 'Traitement impossible. L’original est conservé.', now, job.id, job.user_id);
            this.db.prepare('UPDATE study_v2_document_meta SET processing_state=?,updated_at=? WHERE document_id=? AND user_id=?').run(attention ? 'needs_attention' : 'failed', now, job.document_id, job.user_id);
            this.db.prepare("UPDATE study_documents SET status=?,error_message=? WHERE id=? AND user_id=?").run(this.db.prepare('SELECT 1 FROM study_sections WHERE document_id=? AND user_id=?').get(job.document_id, job.user_id) ? 'ready' : 'error', error.message, job.document_id, job.user_id);
            this.db.exec('COMMIT');
        }
        catch (error) {
            this.db.exec('ROLLBACK');
            throw error;
        }
    }
    async drain() { this.pump(); while (this.active.size)
        await Promise.all([...this.active]); }
    async close() { this.closed = true; clearTimeout(this.timer); await Promise.all([...this.active]); }
}
