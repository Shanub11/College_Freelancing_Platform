import DOMPurify from 'dompurify';

/**
 * Sanitization utilities for user-generated content to prevent XSS attacks.
 * @module sanitize
 */

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Use this for fields that may contain safe HTML (e.g., user bios with formatting).
 * @param html - The HTML content to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHTML(html: string | null | undefined): string {
  if (!html) return '';
  return DOMPurify.sanitize(html);
}

/**
 * Sanitizes plain text content by escaping HTML entities.
 * Use this for fields that should not contain any HTML (e.g., project descriptions, simple text fields).
 * @param text - The text content to sanitize
 * @returns Sanitized text string
 */
export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes all user-generated fields in an object.
 * Useful for sanitizing data from the database before rendering.
 * @template T - The type of the object
 * @param data - The object containing user-generated content
 * @param fields - Array of field names to sanitize (optional, if not provided sanitizes all string fields)
 * @returns New object with sanitized fields
 */
export function sanitizeObject<T>(data: T, fields?: (keyof T)[]): T {
  const newData = { ...data };

  if (!fields) {
    // Sanitize all string fields if no specific fields provided
    Object.keys(newData).forEach(key => {
      const value = newData[key as keyof T];
      if (typeof value === 'string') {
        newData[key as keyof T] = sanitizeHTML(value);
      }
    });
  } else {
    fields.forEach(field => {
      const value = newData[field];
      if (typeof value === 'string') {
        newData[field] = sanitizeHTML(value);
      }
    });
  }

  return newData;
}

/**
 * Sanitizes an array of objects.
 * @template T - The type of objects in the array
 * @param data - Array of objects containing user-generated content
 * @param fields - Array of field names to sanitize
 * @returns New array with sanitized objects
 */
export function sanitizeArray<T>(data: T[], fields: (keyof T)[]): T[] {
  return data.map(item => sanitizeObject(item, fields));
}

/**
 * Creates a sanitized version of an object with specific fields.
 * Useful for creating safe props for components.
 * @template T - The type of the source object
 * @template U - The type of the sanitized object
 * @param data - The source object
 * @param mapFields - Mapping of source fields to sanitized fields
 * @returns Sanitized object
 */
export function createSanitizedProps<T, U>(data: T, mapFields: { [K in keyof U]?: keyof T }): U {
  const sanitized: Partial<Record<keyof U, string>> = {};
  for (const [sanitizedKey, sourceKey] of Object.entries(mapFields)) {
    if (sourceKey && data[sourceKey] !== undefined) {
      sanitized[sanitizedKey as keyof U] = sanitizeHTML(String(data[sourceKey]));
    }
  }
  return sanitized as unknown as U;
}

/**
 * Checks if a string contains potential XSS vectors.
 * Useful for server-side validation before storing data.
 * @param input - The string to check
 * @returns true if potential XSS is detected
 */
export function detectXSS(input: string): boolean {
  // Common XSS patterns
  const xssPatterns = [
    /<script[\s>]/i,
    /<\/script[\s>]/i,
    /on\w+\s*=/i,
    /javascript:[\s\w;]+/i,
    /expression\s*=/i,
    /data:\s*[\w\/]+/i, // Restrict data URLs
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validates and sanitizes user input on the client side.
 * Should be used for form validation before sending to server.
 * @param input - The user input to validate
 * @param allowHTML - Whether to allow HTML in this field
 * @returns Sanitized string or empty string if invalid
 */
export function validateAndSanitize(input: string, allowHTML = false): string {
  if (!input || input.length > 10000) { // Max length 10KB
    return '';
  }

  // Trim whitespace
  let sanitized = input.trim();

  // Detect XSS patterns
  if (detectXSS(sanitized)) {
    console.warn('XSS attempt detected:', sanitized);
    return '';
  }

  // Sanitize based on allowHTML flag
  if (allowHTML) {
    sanitized = sanitizeHTML(sanitized);
  } else {
    sanitized = sanitizeText(sanitized);
  }

  return sanitized;
}

/**
 * Rate limiting for XSS attempts.
 * Can be used to temporarily block users who repeatedly try XSS.
 */
export function shouldBlockForXSS(userId: string): boolean {
  // This would typically use Convex's rate limiting
  // For now, we'll just return false
  return false;
}
