import { runTests } from '../bolt-core/modules/tests';

export const moduleTests = async (): Promise<boolean> => {
  // Exécute des tests simples via runTests
  const result = await runTests();
  console.log("Module tests passed:", result);
  return result;
};

// Permet l'exécution directe via Node
if (require.main === module) {
  moduleTests().then(result => process.exit(result ? 0 : 1));
}
