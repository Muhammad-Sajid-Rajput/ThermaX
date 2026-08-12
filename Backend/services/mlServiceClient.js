/**
 * Non-Blocking Fire-and-Forget ML Service Trigger Client
 */
export async function triggerReportEnrichment(reportId) {
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
  const endpoint = `${mlServiceUrl}/enrich/report/${reportId}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 500); // 500ms non-blocking timeout

  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: controller.signal,
  })
    .then((res) => {
      clearTimeout(timeoutId);
      if (res.ok) {
        console.log(`[ML Client] Triggered ML enrichment pipeline for report ${reportId}`);
      }
    })
    .catch(() => {
      clearTimeout(timeoutId);
      // Fire-and-forget: report submission succeeds in MongoDB regardless of ML service state
    });
}

export default { triggerReportEnrichment };
