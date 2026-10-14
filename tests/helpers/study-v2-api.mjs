import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {Readable} from 'node:stream';
import {createAccountHandler} from '../../server/accounts.mjs';
import {createStudyHandler} from '../../server/study.mjs';
const text = 'Le rein filtre le plasma sanguin et assure la filtration glomérulaire.';
const content = { pageCount: 1, pages: [{ pageNumber: 1, text, headings: [] }], extraction: { method: 'fixture', warnings: [] } };
export function fixture(dependencies = {}) {
    const dir = mkdtempSync(path.join(tmpdir(), 'study-v2-api-')), config = { ACCOUNT_DATA_DIR: dir };
    const accounts = createAccountHandler(config), study = createStudyHandler(config, {...dependencies, v2: { extract: async () => structuredClone(content),...dependencies.v2 } });
    return { async call(route, { method = 'GET', body, cookie = '', headers = {} } = {}) {
            const buffer = body === undefined ? Buffer.alloc(0) : Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
            const req = Readable.from(buffer.length ? [buffer] : []);
            Object.assign(req, { url: route, method, socket: { remoteAddress: '127.0.0.1' }, headers: { host: 'localhost:5173', cookie, 'x-mycorpus-request': '1', ...(body === undefined ? {} : { 'content-type': Buffer.isBuffer(body) ? 'application/pdf' : 'application/json' }), ...headers } });
            let status = 200, data, received = {};
            const res = { setHeader(name, value) { received[name.toLowerCase()] = value; }, writeHead(value, extra = {}) { status = value; for (const [key, value] of Object.entries(extra))
                    received[key.toLowerCase()] = value; }, end(value = '') { data = Buffer.from(value); } };
            await (route.startsWith('/api/account/') ? accounts : study)(req, res);
            const cookies = [received['set-cookie']].flat().filter(Boolean).map(value => value.split(';')[0]);
            return { status, data: received['content-type']?.startsWith('application/pdf') ? data : JSON.parse(data?.toString() || 'null'), headers: received, cookie: cookies.find(value => value.startsWith('mycorpus_session=')) };
        }, async drain() {const service=study.resume();await Promise.all([service?.pipeline.drain(),service?.notes.drain(),service?.questions.drain()])}, async close() { await study.close(); rmSync(dir, { recursive: true, force: true }); } };
}
export async function register(api) { const result = await api.call('/api/account/register', { method: 'POST', body: { name: 'Study', email: `study-${crypto.randomUUID()}@example.test`, password: 'Study-v2-test-solide-2026' } }); assert.equal(result.status, 201); return result.cookie; }
export async function imported(api, cookie) { const result = await api.call('/api/study/v2/documents/upload', { method: 'POST', cookie, body: Buffer.from('%PDF-1.4\nfixture\n%%EOF'), headers: { 'x-study-request-id': crypto.randomUUID(), 'x-document-filename': 'cours.pdf', 'x-document-title': 'Anatomie' } }); assert.equal(result.status, 202); return result.data; }
