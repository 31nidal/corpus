import { parentPort, workerData } from 'node:worker_threads';
import { extractStudyPdf } from '../pdf-layout.mjs';
try {
    const extracted = await extractStudyPdf(Buffer.from(workerData.bytes), { includeStructure: true });
    parentPort.postMessage({ extracted });
}
catch (error) {
    parentPort.postMessage({ error: { code: error.code || 'PDF_EXTRACTION_FAILED', message: error.message, pageCount: error.pageCount, status: error.status } });
}
