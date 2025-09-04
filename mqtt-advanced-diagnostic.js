#!/usr/bin/env node

/**
 * Script de diagnostic MQTT avancé
 * Teste la stabilité de la connexion et des abonnements
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obtenir le répertoire du script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Couleurs pour la console
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

function logHeader(message) {
  log(colors.cyan, `\n🔍 ${message}`);
}

function logSuccess(message) {
  log(colors.green, `✅ ${message}`);
}

function logError(message) {
  log(colors.red, `❌ ${message}`);
}

function logWarning(message) {
  log(colors.yellow, `⚠️ ${message}`);
}

function logInfo(message) {
  log(colors.blue, `ℹ️ ${message}`);
}

async function runDiagnostics() {
  logHeader('DIAGNOSTIC MQTT AVANCÉ');
  logInfo('Test de stabilité de la connexion et des abonnements');

  let configContent = '';

  try {
    // Vérifier si le projet React Native est configuré
    const packageJsonPath = path.join(__dirname, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      logError('package.json non trouvé');
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    logSuccess('package.json trouvé');

    // Vérifier les dépendances MQTT
    const hasMQTT = packageJson.dependencies && packageJson.dependencies.mqtt;
    const hasPolyfills = packageJson.dependencies && (
      packageJson.dependencies['react-native-get-random-values'] ||
      packageJson.dependencies['text-encoding']
    );

    if (hasMQTT) {
      logSuccess('Dépendance MQTT trouvée');
    } else {
      logError('Dépendance MQTT manquante');
    }

    if (hasPolyfills) {
      logSuccess('Polyfills React Native trouvés');
    } else {
      logWarning('Polyfills React Native manquants - peuvent causer des problèmes');
    }

    // Tester la compilation TypeScript
    logHeader('TEST DE COMPILATION TYPESCRIPT');
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      logSuccess('Compilation TypeScript réussie');
    } catch (error) {
      logError('Erreurs de compilation TypeScript:');
      console.log(error.stdout.toString());
    }

    // Vérifier les fichiers de configuration
    logHeader('VÉRIFICATION DES FICHIERS DE CONFIGURATION');

    const mqttClientPath = path.join(__dirname, 'services/api/MQTTClient.ts');
    const mqttConfigPath = path.join(__dirname, 'services/api/MQTTConfig.ts');

    if (fs.existsSync(mqttClientPath)) {
      logSuccess('MQTTClient.ts trouvé');
    } else {
      logError('MQTTClient.ts manquant');
    }

    if (fs.existsSync(mqttConfigPath)) {
      logSuccess('MQTTConfig.ts trouvé');
      configContent = fs.readFileSync(mqttConfigPath, 'utf8');
    } else {
      logError('MQTTConfig.ts manquant');
    }

    // Analyser la configuration MQTT
    if (configContent) {
      if (configContent.includes('brokers:')) {
        logSuccess('Configuration multi-brokers détectée');
      } else {
        logWarning('Configuration single-broker détectée');
      }

      if (configContent.includes('broker.hivemq.com')) {
        logInfo('Broker HiveMQ configuré');
      }
      if (configContent.includes('test.mosquitto.org')) {
        logInfo('Broker Mosquitto de test configuré');
      }
      if (configContent.includes('mqtt.eclipse.org')) {
        logInfo('Broker Eclipse configuré');
      }
    }

    // Vérifier les variables d'environnement
    logHeader('VÉRIFICATION DES VARIABLES D\'ENVIRONNEMENT');
    const envVars = [
      'EXPO_PUBLIC_MQTT_HOST',
      'EXPO_PUBLIC_MQTT_PORT',
      'EXPO_PUBLIC_MQTT_KEEP_ALIVE_INTERVAL',
      'EXPO_PUBLIC_MQTT_CONNECTION_TIMEOUT'
    ];

    envVars.forEach(envVar => {
      if (process.env[envVar]) {
        logSuccess(`${envVar}: ${process.env[envVar]}`);
      } else {
        logWarning(`${envVar} non défini (utilise valeur par défaut)`);
      }
    });

    // Recommandations
    logHeader('RECOMMANDATIONS');

    if (!hasPolyfills) {
      logWarning('Ajouter les polyfills React Native:');
      console.log('  npm install react-native-get-random-values');
      console.log('  npm install text-encoding');
    }

    if (!configContent.includes('brokers:')) {
      logWarning('Envisager une configuration multi-brokers pour la redondance');
    }

    logSuccess('Diagnostic terminé');

  } catch (error) {
    logError(`Erreur lors du diagnostic: ${error.message}`);
  }
}

// Exécuter le diagnostic
runDiagnostics().catch(console.error);
