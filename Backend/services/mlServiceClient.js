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
        console.log(`[ML Client] Successfully triggered pipeline for report ${reportId}`);
      }
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      // Silently log — report submission response is never blocked or failed
      if (err.name !== 'AbortError') {
        console.warn(`[ML Client] Background trigger notification skipped (${err.message})`);
      }
    });
}

export default { triggerReportEnrichment };
