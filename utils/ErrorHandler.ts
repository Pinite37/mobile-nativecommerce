export interface ApiError {
  message: string;
  field?: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ApiError[];
}

export class ErrorHandler {
  static parseApiError(error: any): { title: string; message?: string } {
    console.log('🔍 ErrorHandler - Full error object:', error);
    console.log('🔍 ErrorHandler - Error response data:', error.response?.data);
    
    if (error?.response?.data) {
      const errorData = error.response.data as ApiErrorResponse;
      console.log('🔍 ErrorHandler - Parsed errorData:', errorData);
      
      if (errorData.errors && errorData.errors.length > 0) {
        console.log('🔍 ErrorHandler - Found validation errors:', errorData.errors);
        // Handle validation errors - format them nicely
        const fieldErrors = errorData.errors.map(err => {
          const fieldName = this.formatFieldName(err.field || '');
          return `• ${fieldName}: ${err.message}`;
        });
        
        return {
          title: 'Erreurs de validation',
          message: fieldErrors.join('\n'),
        };
      }
      
      // Handle general API errors
      return {
        title: 'Erreur',
        message: errorData.message || 'Une erreur est survenue',
      };
    }
    
    if (error?.message) {
      // Handle network errors
      if (error.message.includes('Network Error') || error.message.includes('No response')) {
        return {
          title: 'Erreur de connexion',
          message: 'Vérifiez votre connexion internet',
        };
      }
      
      return {
        title: 'Erreur',
        message: error.message,
      };
    }
    
    // Fallback error
    return {
      title: 'Erreur',
      message: 'Une erreur inattendue est survenue',
    };
  }

  private static formatFieldName(field: string): string {
    const fieldMap: { [key: string]: string } = {
      'firstName': 'Prénom',
      'lastName': 'Nom',
      'email': 'Email',
      'phone': 'Téléphone',
      'address': 'Adresse',
      'password': 'Mot de passe',
      'confirmPassword': 'Confirmation du mot de passe',
      'companyName': 'Nom de l\'entreprise',
      'description': 'Description',
    };
    
    return fieldMap[field] || field;
  }

  static getSuccessMessage(operation: string): { title: string; message?: string } {
    const messages: { [key: string]: { title: string; message?: string } } = {
      'register': {
        title: 'Inscription réussie',
        message: 'Votre compte a été créé avec succès',
      },
      'login': {
        title: 'Connexion réussie',
        message: 'Vous êtes maintenant connecté',
      },
      'logout': {
        title: 'Déconnexion réussie',
        message: 'À bientôt !',
      },
      'password-reset': {
        title: 'Mot de passe mis à jour',
        message: 'Votre mot de passe a été modifié avec succès',
      },
    };
    
    return messages[operation] || { title: 'Succès' };
  }
}
