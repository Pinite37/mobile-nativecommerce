#!/usr/bin/env node

/**
 * Script de diagnostic MQTT pour tester la stabilité de la connexion
 * Usage: node scripts/mqtt-diagnostic.js
 */

// Simuler l'environnement React Native pour les tests
global.process.env.NODE_ENV = 'development';

// Importer le client MQTT
const mqttClient = require('../services/api/MQTTClient.ts').default;

console.log('🔍 Démarrage du diagnostic MQTT...\n');

async function runDiagnostics() {
  try {
    // 1. Vérifier l'état initial
    console.log('📊 État initial:');
    const initialStatus = mqttClient.getConnectionStatus();
    console.log(JSON.stringify(initialStatus, null, 2));
    console.log('');

    // 2. Tester la connexion
    console.log('🔌 Test de connexion...');
    const connectionResult = await mqttClient.testConnection();
    console.log(`Résultat: ${connectionResult ? '✅ Succès' : '❌ Échec'}`);
    console.log('');

    // 3. Vérifier l'état après connexion
    console.log('📊 État après connexion:');
    const afterConnectStatus = mqttClient.getConnectionStatus();
    console.log(JSON.stringify(afterConnectStatus, null, 2));
    console.log('');

    // 4. Tester les abonnements
    console.log('📡 Test des abonnements...');
    mqttClient.checkSubscriptions();

    // Attendre un peu pour que les abonnements se fassent
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('📊 État après abonnements:');
    const afterSubscribeStatus = mqttClient.getConnectionStatus();
    console.log(JSON.stringify(afterSubscribeStatus, null, 2));
    console.log('');

    // 5. Test de reconnexion
    console.log('🔄 Test de reconnexion...');
    mqttClient.reconnect();

    // Attendre la reconnexion
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('📊 État après reconnexion:');
    const afterReconnectStatus = mqttClient.getConnectionStatus();
    console.log(JSON.stringify(afterReconnectStatus, null, 2));
    console.log('');

    console.log('✅ Diagnostic terminé avec succès !');

  } catch (error) {
    console.error('❌ Erreur lors du diagnostic:', error);
  } finally {
    // Nettoyer
    setTimeout(() => {
      console.log('🔌 Fermeture de la connexion de test...');
      mqttClient.disconnect();
      process.exit(0);
    }, 2000);
  }
}

// Gestionnaire d'événements pour les logs
mqttClient.on('connected', () => console.log('📡 Événement: Connecté'));
mqttClient.on('disconnected', () => console.log('📡 Événement: Déconnecté'));
mqttClient.on('error', (error) => console.log('📡 Événement: Erreur -', error?.message || error));

// Lancer le diagnostic
runDiagnostics();
