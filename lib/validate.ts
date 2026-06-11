// Input validation utilities
export const validate = {
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 255
  },

  password: (password: string): { valid: boolean; error?: string } => {
    if (password.length < 8) return { valid: false, error: 'Password must be at least 8 characters' }
    if (!/[a-z]/.test(password)) return { valid: false, error: 'Password must contain lowercase letters' }
    if (!/[A-Z]/.test(password)) return { valid: false, error: 'Password must contain uppercase letters' }
    if (!/[0-9]/.test(password)) return { valid: false, error: 'Password must contain numbers' }
    return { valid: true }
  },

  string: (value: string, minLen: number = 1, maxLen: number = 255): boolean => {
    return value.length >= minLen && value.length <= maxLen
  },

  phone: (phone: string): boolean => {
    // Allow various phone formats, minimum 10 digits
    const phoneRegex = /^[\d\s\-\+\(\)]{10,20}$/
    return phoneRegex.test(phone.replace(/\s/g, ''))
  },

  number: (value: unknown, min: number = 0, max: number = Infinity): boolean => {
    if (typeof value !== 'number') return false
    return value >= min && value <= max && Number.isInteger(value)
  },

  enum: (value: string, allowedValues: string[]): boolean => {
    return allowedValues.includes(value)
  },

  mongoId: (id: string): boolean => {
    return /^[0-9a-f]{24}$/i.test(id)
  },
}
