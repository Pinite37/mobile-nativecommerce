import { useEffect, useState } from 'react';

interface NetworkPerformance {
  isSlowConnection: boolean;
  averageResponseTime: number;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor';
}

export const useNetworkPerformance = () => {
  const [performance, setPerformance] = useState<NetworkPerformance>({
    isSlowConnection: false,
    averageResponseTime: 0,
    connectionQuality: 'excellent',
  });

  const [, setResponseTimes] = useState<number[]>([]);

  // Méthode pour mesurer le temps de réponse d'une requête
  const measureRequest = (startTime: number, endTime: number) => {
    const responseTime = endTime - startTime;
    
    setResponseTimes(prev => {
      const newTimes = [...prev, responseTime].slice(-10); // Garder les 10 dernières mesures
      const average = newTimes.reduce((sum, time) => sum + time, 0) / newTimes.length;
      
      let quality: NetworkPerformance['connectionQuality'] = 'excellent';
      if (average > 3000) quality = 'poor';
      else if (average > 2000) quality = 'fair';
      else if (average > 1000) quality = 'good';
      
      setPerformance({
        isSlowConnection: average > 2000,
        averageResponseTime: average,
        connectionQuality: quality,
      });
      
      return newTimes;
    });
  };

  // Fonction pour tester la connexion
  const testConnection = async () => {
    try {
      const startTime = Date.now();
      
      // Ping simple vers un service de test
      await fetch('https://httpbin.org/get', {
        method: 'GET',
        cache: 'no-cache',
      });
      
      const endTime = Date.now();
      measureRequest(startTime, endTime);
    } catch {
      // En cas d'erreur, considérer comme connexion lente
      setPerformance(prev => ({
        ...prev,
        isSlowConnection: true,
        connectionQuality: 'poor',
      }));
    }
  };

  useEffect(() => {
    // Test initial de la connexion
    testConnection();
    
    // Test périodique (toutes les 30 secondes)
    const interval = setInterval(() => {
      testConnection();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...performance,
    measureRequest,
    testConnection,
  };
};

export default useNetworkPerformance;
