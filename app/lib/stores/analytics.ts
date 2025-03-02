import { atom } from 'nanostores';

interface AnalyticsMetrics {
  apiCalls: {
    total: number;
    successful: number;
    failed: number;
    latency: number[];
  };
  resourceUsage: {
    memory: number[];
    cpu: number[];
    timestamps: number[];
  }; 
  providerMetrics: Record<string, {
    calls: number;
    errors: number;
    avgLatency: number;
  }>;
}

const initialMetrics: AnalyticsMetrics = {
  apiCalls: {
    total: 0,
    successful: 0, 
    failed: 0,
    latency: []
  },
  resourceUsage: {
    memory: [],
    cpu: [],
    timestamps: []
  },
  providerMetrics: {}
};

export const analyticsStore = atom<AnalyticsMetrics>(initialMetrics);

// Méthodes pour mettre à jour les métriques
export const trackApiCall = (success: boolean, latency: number, provider?: string) => {
  analyticsStore.set({
    ...analyticsStore.get(),
    apiCalls: {
      ...analyticsStore.get().apiCalls,
      total: analyticsStore.get().apiCalls.total + 1,
      successful: analyticsStore.get().apiCalls.successful + (success ? 1 : 0),
      failed: analyticsStore.get().apiCalls.failed + (success ? 0 : 1),
      latency: [...analyticsStore.get().apiCalls.latency, latency]
    },
    providerMetrics: provider ? {
      ...analyticsStore.get().providerMetrics,
      [provider]: {
        calls: (analyticsStore.get().providerMetrics[provider]?.calls || 0) + 1,
        errors: (analyticsStore.get().providerMetrics[provider]?.errors || 0) + (success ? 0 : 1),
        avgLatency: calculateAvgLatency(
          analyticsStore.get().providerMetrics[provider]?.avgLatency || 0,
          analyticsStore.get().providerMetrics[provider]?.calls || 0,
          latency
        )
      }
    } : analyticsStore.get().providerMetrics
  });
};

export const trackResourceUsage = (memory: number, cpu: number) => {
  const now = Date.now();
  analyticsStore.set({
    ...analyticsStore.get(),
    resourceUsage: {
      memory: [...analyticsStore.get().resourceUsage.memory, memory],
      cpu: [...analyticsStore.get().resourceUsage.cpu, cpu],
      timestamps: [...analyticsStore.get().resourceUsage.timestamps, now]
    }
  });
};

// Helpers
const calculateAvgLatency = (currentAvg: number, totalCalls: number, newLatency: number): number => {
  return ((currentAvg * totalCalls) + newLatency) / (totalCalls + 1); 
};
