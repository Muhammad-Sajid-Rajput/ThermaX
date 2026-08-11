import AuditLog from '../models/AuditLog.js';

export async function logAuditEvent({ action, performedBy, targetType, targetId, details, req }) {
  try {
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const userAgent = req ? (req.headers['user-agent'] || 'System') : 'System';

    const logEntry = new AuditLog({
      action: action || 'UNKNOWN_ACTION',
      performedBy: performedBy || req?.user?._id || null,
      targetType: targetType || 'SYSTEM',
      targetId: targetId || null,
      details: typeof details === 'object' ? JSON.stringify(details) : String(details || ''),
      ip,
      userAgent,
      timestamp: new Date()
    });

    await logEntry.save();
    return logEntry;
  } catch (err) {
    // Non-blocking log persistence fallback
    console.warn(`[AuditLog Warning] Could not persist audit log '${action}':`, err.message);
    return null;
  }
}

export function auditMiddleware(actionName, targetType = 'RESOURCE') {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        logAuditEvent({
          action: actionName,
          performedBy: req.user?._id || null,
          targetType,
          targetId: req.params?.id || req.body?.id || null,
          details: { method: req.method, path: req.originalUrl, status: res.statusCode },
          req
        });
      }
    });
    next();
  };
}

export default { logAuditEvent, auditMiddleware };
