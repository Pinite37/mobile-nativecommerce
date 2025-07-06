export class ValidationHelper {
  static getPhoneNumberHint(): string {
    return 'Format attendu: +229 XX XX XX XX ou 01 XX XX XX XX';
  }

  static getPasswordHint(): string {
    return 'Le mot de passe doit contenir au moins:\n• 8 caractères\n• Une lettre minuscule\n• Une lettre majuscule\n• Un chiffre';
  }

  static getAddressHint(): string {
    return 'Exemple: Quartier Fidjrossè, Cotonou, Bénin';
  }

  static getEmailHint(): string {
    return 'Format attendu: exemple@email.com';
  }

  static validatePhoneNumber(phone: string): { isValid: boolean; message?: string } {
    const phoneRegex = /^(\+229\s?)?[0-9]{8}$/;
    
    if (!phone) {
      return { isValid: false, message: 'Le numéro de téléphone est requis' };
    }
    
    // Remove spaces and plus sign for validation
    const cleanPhone = phone.replace(/\s/g, '').replace('+229', '');
    
    if (!phoneRegex.test(`+229${cleanPhone}`)) {
      return { 
        isValid: false, 
        message: 'Format invalide. ' + this.getPhoneNumberHint() 
      };
    }
    
    return { isValid: true };
  }

  static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (!password) {
      return { isValid: false, message: 'Le mot de passe est requis' };
    }
    
    if (password.length < 8) {
      return { isValid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' };
    }
    
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Le mot de passe doit contenir au moins une lettre minuscule' };
    }
    
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Le mot de passe doit contenir au moins une lettre majuscule' };
    }
    
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
    }
    
    return { isValid: true };
  }

  static validateEmail(email: string): { isValid: boolean; message?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      return { isValid: false, message: 'L\'email est requis' };
    }
    
    if (!emailRegex.test(email)) {
      return { 
        isValid: false, 
        message: 'Format d\'email invalide. ' + this.getEmailHint() 
      };
    }
    
    return { isValid: true };
  }

  static validateAddress(address: string): { isValid: boolean; message?: string } {
    if (!address) {
      return { isValid: false, message: 'L\'adresse est requise' };
    }
    
    if (address.length < 10) {
      return { 
        isValid: false, 
        message: 'L\'adresse doit contenir au moins 10 caractères. ' + this.getAddressHint() 
      };
    }
    
    return { isValid: true };
  }

  static formatPhoneNumber(phone: string): string {
    // Remove all non-numeric characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    
    // If it starts with +229, format it
    if (cleaned.startsWith('+229')) {
      const number = cleaned.substring(4);
      if (number.length <= 8) {
        return `+229 ${number.substring(0, 2)} ${number.substring(2, 4)} ${number.substring(4, 6)} ${number.substring(6, 8)}`.trim();
      }
    }
    
    // If it's a local number, add +229
    if (cleaned.length === 8 && !cleaned.startsWith('+')) {
      return `+229 ${cleaned.substring(0, 2)} ${cleaned.substring(2, 4)} ${cleaned.substring(4, 6)} ${cleaned.substring(6, 8)}`;
    }
    
    return phone; // Return original if can't format
  }
}
