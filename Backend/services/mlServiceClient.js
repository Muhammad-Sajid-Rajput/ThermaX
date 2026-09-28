/**
 * Phase 4 backend → ML trigger client.
 *
 * - Fire-and-forget from the request path: report submission always
 *   succeeds in MongoDB regardless of ML service state.
 * - Up to 3 attempts with backoff (0.5s, 2s) and a 5s per-attempt timeout.
 * - Sends the shared service key (X-Service-Key) the ML service requires.
 * - After the final failure, the failure is persisted to the
 *   EnrichmentFailure dead-letter collection — never swallowed.
 * - When a later trigger for the same report succeeds, the open dead
 *   letter is marked resolved automatically.
 */
import EnrichmentFailure from '../models/EnrichmentFailure.js';

const MAX_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 5000;
const BACKOFF_MS = [500, 2000]; // waits before attempts 2 and 3

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function serviceHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.ML_SERVICE_KEY) {
    headers['X-Service-Key'] = process.env.ML_SERVICE_KEY;
  }
  return headers;
}

async function postOnce(endpoint) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: serviceHeaders(),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`ML service responded with HTTP ${res.status}`);
    }
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function recordFailure(reportId, attemptsMade, error) {
  try {
    await EnrichmentFailure.findOneAndUpdate(
      { report: reportId, status: 'open' },
      {
        $set: {
          lastError: String((error && error.message) || error || 'unknown error'),
          lastAttemptAt: new Date(),
        },
        $inc: { attempts: attemptsMade },
      },
      { upsert: true, new: true }
    );
  } catch (dbError) {
    // The dead letter itself couldn't be written (DB down?). Log it —
    // there is nothing more honest we can do at this point.
    console.error('[ML Client] Failed to persist enrichment dead letter:', dbError.message);
  }
}

async function markResolved(reportId) {
  try {
    await EnrichmentFailure.updateMany(
      { report: reportId, status: 'open' },
      { $set: { status: 'resolved', resolvedAt: new Date() } }
    );
  } catch (dbError) {
    console.error('[ML Client] Failed to mark enrichment failure resolved:', dbError.message);
  }
}

async function attemptWithRetry(reportId) {
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  const endpoint = `${mlServiceUrl}/enrich/report/${reportId}`;

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await postOnce(endpoint);
      console.log(`[ML Client] Triggered ML enrichment pipeline for report ${reportId} (attempt ${attempt})`);
      await markResolved(reportId);
      return { ok: true, attempts: attempt };
    } catch (error) {
      lastError = error;
      console.warn(`[ML Client] Enrichment trigger attempt ${attempt}/${MAX_ATTEMPTS} failed for report ${reportId}: ${error.message}`);
      if (attempt < MAX_ATTEMPTS) {
        await sleep(BACKOFF_MS[attempt - 1]);
      }
    }
  }
  await recordFailure(reportId, MAX_ATTEMPTS, lastError);
  return { ok: false, attempts: MAX_ATTEMPTS, error: String((lastError && lastError.message) || lastError) };
}

/**
 * Fire-and-forget trigger: kicks off the retry loop without blocking the
 * caller. Returns the underlying promise so tests can await the outcome;
 * rejections are already handled internally, so awaiting is optional.
 */
export function triggerReportEnrichment(reportId) {
  const pending = attemptWithRetry(reportId);
  pending.catch(() => {
    // Handled above (dead letter persisted); never reject into the caller.
  });
  return pending;
}

export default { triggerReportEnrichment };
