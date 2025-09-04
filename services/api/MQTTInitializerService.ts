// Service simple pour surveiller la connexion MQTT et forcer une reconnexion propre si nécessaire.
// Objectif: rester connecté au broker (ex: broker.emqx.io) avec un clientId unique à chaque (re)connexion.

import mqttClient from './MQTTClient';

let watcherTimer: ReturnType<typeof setInterval> | null = null;
let lastAttemptAt = 0;
let connecting = false;
let failureCount = 0;
let currentInterval = 0;

interface WatcherOptions {
	intervalMs?: number; // Intervalle de vérification
	minDelayBetweenAttemptsMs?: number; // Anti-spam si boucle de déconnexions
}

/**
 * Démarre le watcher de connexion MQTT.
 * @param getUserId fonction qui retourne l'userId courant (ou undefined si anonyme)
 * @param options configuration basique
 */
export function startMQTTConnectionWatcher(
	getUserId: () => string | undefined | null,
	options: WatcherOptions = {}
) {
		const { intervalMs = 8000, minDelayBetweenAttemptsMs = 3000 } = options;
		currentInterval = intervalMs;
		failureCount = 0;

	// Si déjà actif on repart proprement
	if (watcherTimer) {
		clearInterval(watcherTimer);
		watcherTimer = null;
	}

		watcherTimer = setInterval(async () => {
		try {
			// Si déjà connecté, rien à faire
			if (mqttClient.isConnected()) return;
			// Anti double tentative
			if (connecting) return;
			const now = Date.now();
			if (now - lastAttemptAt < minDelayBetweenAttemptsMs) return;

			connecting = true;
			lastAttemptAt = now;
			const userId = getUserId() || undefined;

					console.log('🔄 Watcher MQTT: tentative de connexion', { userId, failureCount });
					await mqttClient.connect(userId); // clientId unique déjà géré
					if (userId) mqttClient.setCurrentUserId(userId);
					console.log('✅ Watcher MQTT: connecté');
					failureCount = 0;
					currentInterval = intervalMs; // reset interval
		} catch (err) {
					failureCount += 1;
					console.log('⚠️ Watcher MQTT: échec connexion', { failureCount, err });
					// Backoff simple: doubler jusqu'à 60s max
					const next = Math.min(currentInterval * 2, 60000);
					if (next !== currentInterval) {
						currentInterval = next;
						// Replanifier le timer avec le nouveau délai
						if (watcherTimer) clearInterval(watcherTimer);
						watcherTimer = setInterval(async () => {
							// récursion simplifiée: on relance start logic via même bloc (duplication évitée par fermeture)
							if (mqttClient.isConnected() || connecting) return;
							const now2 = Date.now();
							if (now2 - lastAttemptAt < minDelayBetweenAttemptsMs) return;
							connecting = true;
							lastAttemptAt = now2;
							const u2 = getUserId() || undefined;
							try {
								console.log('🔄 Watcher MQTT: tentative de connexion (backoff)', { userId: u2, failureCount });
								await mqttClient.connect(u2);
								if (u2) mqttClient.setCurrentUserId(u2);
								console.log('✅ Watcher MQTT: connecté');
								failureCount = 0;
								currentInterval = intervalMs;
								// Revenir à l'interval initial
								if (watcherTimer) clearInterval(watcherTimer);
								startMQTTConnectionWatcher(getUserId, { intervalMs, minDelayBetweenAttemptsMs });
							} catch (e2) {
								failureCount += 1;
								console.log('⚠️ Watcher MQTT: échec connexion (backoff)', { failureCount, e2 });
							} finally {
								connecting = false;
							}
						}, currentInterval);
					}
		} finally {
			connecting = false;
		}
	}, intervalMs);
}

export function stopMQTTConnectionWatcher() {
	if (watcherTimer) {
		clearInterval(watcherTimer);
		watcherTimer = null;
	}
	connecting = false;
		failureCount = 0;
}

export default {
	startMQTTConnectionWatcher,
	stopMQTTConnectionWatcher,
};
