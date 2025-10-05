import { MetricsSnapshot } from '../data/types';

export class MetricsService {
  private snapshots: MetricsSnapshot[] = [];

  record(snapshot: Omit<MetricsSnapshot, 'timestamp'> & { timestamp?: string }) {
    const entry: MetricsSnapshot = {
      timestamp: snapshot.timestamp ?? new Date().toISOString(),
      ...snapshot,
    };
    this.snapshots.unshift(entry);
    if (this.snapshots.length > 100) {
      this.snapshots = this.snapshots.slice(0, 100);
    }
    return entry;
  }

  latest() {
    return this.snapshots[0] ?? null;
  }

  history(limit = 24) {
    return this.snapshots.slice(0, limit);
  }
}

export const metricsService = new MetricsService();
