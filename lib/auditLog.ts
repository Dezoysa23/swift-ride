// Audit logging for security-relevant operations
interface AuditLog {
  timestamp: Date
  userId?: string
  userRole?: string
  action: string
  resource: string
  resourceId?: string
  result: 'success' | 'failure'
  details?: Record<string, unknown>
  ipAddress?: string
}

function getClientIp(request?: Request): string | undefined {
  if (!request) return undefined
  const forwarded = request.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || undefined
}

export function auditLog(
  userId: string | undefined,
  userRole: string | undefined,
  action: string,
  resource: string,
  result: 'success' | 'failure',
  resourceId?: string,
  details?: Record<string, unknown>,
  request?: Request
) {
  const log: AuditLog = {
    timestamp: new Date(),
    userId,
    userRole,
    action,
    resource,
    resourceId,
    result,
    details: details && { ...details, password: undefined }, // Never log passwords
    ipAddress: getClientIp(request),
  }

  // In production, send to proper logging service (DataDog, Splunk, CloudWatch, etc.)
  // For now, log to console in JSON format for easy parsing
  if (result === 'failure' || ['password_change', 'admin_action', 'payment'].includes(action)) {
    console.log(
      JSON.stringify({
        type: 'AUDIT',
        ...log,
      })
    )
  }
}
