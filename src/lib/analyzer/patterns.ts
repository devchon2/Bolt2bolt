export interface PatternsOptions {
	allowExperimental?: boolean;
}

export function analyzePatterns(code: string, options: PatternsOptions): any {
	const experimental = options.allowExperimental || false;
}
