// Ajoutez ceci à l'interface CodeIssue existante

export enum MetricType {
  Complexity = 'complexity',
  Duplication = 'duplication',
  Maintainability = 'maintainability',
  Security = 'security'
}

export enum SeverityLevel {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical'
}

interface CodeIssue {
  id: string;
  title: string;
  description: string;
  location: {
    filePath: string;
    line: number;
    column: number;
  };
  severity: SeverityLevel;
  metricType: MetricType;
  suggestions?: string[];
  type?: string; // Champ ajouté pour identifier facilement le type de problème
}
