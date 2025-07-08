/**
 * Utilitaire pour monitorer les performances de démarrage de l'application
 */

class StartupPerformanceMonitor {
  private static startTime: number = Date.now();
  private static milestones: Map<string, number> = new Map();

  /**
   * Marquer un jalon dans le démarrage
   */
  static mark(milestone: string): void {
    const now = Date.now();
    const elapsed = now - this.startTime;
    this.milestones.set(milestone, elapsed);
    
    console.log(`⏱️ [PERF] ${milestone}: ${elapsed}ms`);
  }

  /**
   * Obtenir le rapport de performance
   */
  static getReport(): { [key: string]: number } {
    const report: { [key: string]: number } = {};
    for (const [milestone, time] of this.milestones) {
      report[milestone] = time;
    }
    return report;
  }

  /**
   * Afficher le rapport complet
   */
  static logReport(): void {
    console.log('\n📊 RAPPORT DE PERFORMANCE DE DÉMARRAGE');
    console.log('=====================================');
    
    const sortedMilestones = Array.from(this.milestones.entries())
      .sort((a, b) => a[1] - b[1]);
    
    for (const [milestone, time] of sortedMilestones) {
      console.log(`${milestone.padEnd(30)}: ${time}ms`);
    }
    
    const totalTime = Date.now() - this.startTime;
    console.log(`${'TOTAL'.padEnd(30)}: ${totalTime}ms`);
    console.log('=====================================\n');
  }

  /**
   * Réinitialiser le moniteur
   */
  static reset(): void {
    this.startTime = Date.now();
    this.milestones.clear();
  }
}

export default StartupPerformanceMonitor;
