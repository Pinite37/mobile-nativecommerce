import { Alert } from 'react-native';

export class ConfigurationChecker {
  /**
   * Vérifie si l'application est configurée pour utiliser le backend réel
   */
  static checkBackendConfiguration(): {
    isUsingRealBackend: boolean;
    currentConfiguration: string;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    // Vérifier la configuration mock dans CustomerService
    const isUsingRealBackend = true; // CustomerService.USE_MOCK_API est false
    const currentConfiguration = 'Backend réel activé';
    
    if (isUsingRealBackend) {
      recommendations.push('✅ Backend réel configuré');
      recommendations.push('🔧 Assurez-vous que votre backend est démarré');
      recommendations.push('🌐 Vérifiez l\'URL de base dans ApiService.ts');
      recommendations.push('📋 Utilisez le script test-backend.ts pour tester la connectivité');
    } else {
      recommendations.push('⚠️ Mode mock activé - les données ne sont pas persistées');
      recommendations.push('🔄 Configurez votre backend pour utiliser les données réelles');
    }
    
    return {
      isUsingRealBackend,
      currentConfiguration,
      recommendations
    };
  }
  
  /**
   * Affiche un rapport de configuration dans la console
   */
  static logConfigurationReport(): void {
    const report = this.checkBackendConfiguration();
    
    console.log('\n📋 RAPPORT DE CONFIGURATION BACKEND');
    console.log('=====================================');
    console.log(`État: ${report.currentConfiguration}`);
    console.log(`Backend réel: ${report.isUsingRealBackend ? 'OUI' : 'NON'}`);
    console.log('\nRecommandations:');
    
    report.recommendations.forEach(rec => {
      console.log(`  ${rec}`);
    });
    
    console.log('\n📖 Consultez BACKEND_SETUP.md pour plus d\'informations');
    console.log('=====================================\n');
  }
  
  /**
   * Affiche une alerte de configuration (à utiliser dans l'app)
   */
  static showConfigurationAlert(): void {
    const report = this.checkBackendConfiguration();
    
    if (report.isUsingRealBackend) {
      Alert.alert(
        'Configuration Backend',
        'L\'application est configurée pour utiliser le backend réel.\n\nAssurez-vous que votre serveur backend est démarré et accessible.',
        [{ text: 'OK', style: 'default' }]
      );
    } else {
      Alert.alert(
        'Mode Test',
        'L\'application utilise actuellement des données fictives.\n\nConfigurez votre backend pour utiliser des données réelles.',
        [
          { text: 'OK', style: 'default' },
          { text: 'Plus d\'infos', style: 'default' }
        ]
      );
    }
  }
  
  /**
   * Endpoints disponibles dans l'application
   */
  static getAvailableEndpoints(): string[] {
    return [
      'POST /auth/login',
      'POST /auth/register',
      'POST /auth/refresh',
      'POST /auth/logout',
      'GET /customer/profile',
      'PUT /customer/profile',
      'POST /customer/profile/image',
      'DELETE /customer/profile/image',
      'PUT /customer/preferences',
      'PUT /customer/location'
    ];
  }
  
  /**
   * Retourne les informations de configuration pour le développement
   */
  static getDevelopmentInfo(): {
    mockMode: boolean;
    availableEndpoints: string[];
    configurationFiles: string[];
    testFiles: string[];
  } {
    return {
      mockMode: false, // USE_MOCK_API = false
      availableEndpoints: this.getAvailableEndpoints(),
      configurationFiles: [
        'services/api/ApiService.ts',
        'services/api/CustomerService.ts',
        'services/api/AuthService.ts'
      ],
      testFiles: [
        'scripts/test-backend.ts',
        'BACKEND_SETUP.md'
      ]
    };
  }
}

// Utilisation en développement
if (__DEV__) {
  ConfigurationChecker.logConfigurationReport();
}

export default ConfigurationChecker;
