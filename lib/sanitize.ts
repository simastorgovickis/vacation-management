/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 * For display purposes, use proper HTML escaping in the UI layer
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }
  
  // Remove null bytes and control characters (except newlines and tabs)
  return input
    .replace(/\0/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
}

/**
 * Sanitize HTML content (basic - for production, use a library like DOMPurify)
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== 'string') {
    return ''
  }
  
  // Basic HTML entity encoding
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

/**
 * Validate and sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return ''
  }
  
  // Basic email validation and sanitization
  const sanitized = email.trim().toLowerCase()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
  if (!emailRegex.test(sanitized)) {
    return ''
  }
  
  return sanitized
}

/**
 * Sanitize a number input
 */
export function sanitizeNumber(input: unknown): number | null {
  if (typeof input === 'number' && !isNaN(input) && isFinite(input)) {
    return input
  }
  
  if (typeof input === 'string') {
    const parsed = parseFloat(input)
    if (!isNaN(parsed) && isFinite(parsed)) {
      return parsed
    }
  }
  
  return null
}
