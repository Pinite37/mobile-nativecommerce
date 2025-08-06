export interface AuthEvents {
  'auth:token-invalidated': () => void;
  'auth:logout-required': () => void;
}

class AuthEventEmitter {
  private listeners: { [key: string]: (() => void)[] } = {};
  
  // Émettre l'événement quand les tokens sont invalidés
  emitTokenInvalidated() {
    console.log('📡 Émission événement: tokens invalidés');
    this.emit('auth:token-invalidated');
  }
  
  // Émettre l'événement quand une déconnexion est requise
  emitLogoutRequired() {
    console.log('📡 Émission événement: déconnexion requise');
    this.emit('auth:logout-required');
  }
  
  // Écouter les événements de tokens invalidés
  onTokenInvalidated(callback: () => void) {
    this.on('auth:token-invalidated', callback);
  }
  
  // Écouter les événements de déconnexion requise
  onLogoutRequired(callback: () => void) {
    this.on('auth:logout-required', callback);
  }
  
  // Méthode générique pour écouter un événement
  private on(event: string, callback: () => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }
  
  // Méthode générique pour émettre un événement
  private emit(event: string) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Erreur dans le callback d\'événement:', error);
        }
      });
    }
  }
  
  // Nettoyer les listeners
  removeAllAuthListeners() {
    this.listeners = {};
  }
}

export default new AuthEventEmitter();
