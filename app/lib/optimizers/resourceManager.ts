import { trackResourceUsage } from '../stores/analytics';

export class ResourceManager {
  private static instance: ResourceManager;
  private memoryThreshold = 0.8; // 80% memory usage threshold
  private cpuThreshold = 0.7; // 70% CPU usage threshold
  private monitoringInterval = 30000; // Check every 30 seconds, default
  private optimizationRunning = false; // Flag to prevent concurrent optimizations
  
  private constructor() {
    this.startMonitoring();
  }

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  private async startMonitoring() {
    setInterval(async () => {
      if (!this.optimizationRunning) {
        const metrics = await this.getMetrics();
        trackResourceUsage(metrics.memory, metrics.cpu);

        if (this.shouldOptimize(metrics)) {
          await this.optimize();
        }
        this.adjustMonitoringInterval(metrics); // Dynamically adjust interval
      }
    }, this.monitoringInterval);
  }

  private async getMetrics() {
    const used = process.memoryUsage();
    const cpu = await this.getCpuUsage();

    return {
      memory: used.heapUsed / used.heapTotal,
      cpu 
    };
  }

  private async getCpuUsage(): Promise<number> {
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    
    return (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
  }

  private shouldOptimize(metrics: {memory: number, cpu: number}): boolean {
    return metrics.memory > this.memoryThreshold || 
           metrics.cpu > this.cpuThreshold;
  }

  private async optimize() {
    this.optimizationRunning = true;
    try {
      console.log("⚡️ Starting optimization...");
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Clear module caches that aren't needed
      Object.keys(require.cache).forEach(key => {
        if (key.includes('node_modules') && !key.includes('essential-module')) {
          delete require.cache[key];
        }
      });
      console.log("✅ Optimization complete.");
    } finally {
      this.optimizationRunning = false;
    }
  }

  private adjustMonitoringInterval(metrics: { memory: number; cpu: number }) {
    // If resources are consistently high, increase frequency
    if (metrics.memory > this.memoryThreshold && metrics.cpu > this.cpuThreshold) {
      this.monitoringInterval = Math.max(10000, this.monitoringInterval / 2); // Minimum 10 seconds
      console.warn(`⚠️ High resource usage detected. Decreasing monitoring interval to ${this.monitoringInterval}ms`);
    }
    // If resources are consistently low, decrease frequency
    else if (metrics.memory < this.memoryThreshold * 0.5 && metrics.cpu < this.cpuThreshold * 0.5) {
      this.monitoringInterval = Math.min(300000, this.monitoringInterval * 2); // Maximum 5 minutes
      console.log(`✅ Low resource usage detected. Increasing monitoring interval to ${this.monitoringInterval}ms`);
    }
  }
}

// OPTIMIZATION_PROMPT: Investigate using more granular cache clearing strategies to avoid clearing essential modules.
