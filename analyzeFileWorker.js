const { workerData, parentPort } = require('worker_threads');
const { analyzeFile } = require('./bolt-core/analyzer'); // Adjust the path if necessary

async function main() {
  const { file, rootDir, analysisDepth } = workerData;
  try {
    const fileReport = await analyzeFile(file, rootDir, analysisDepth);
    parentPort.postMessage(fileReport);
  } catch (error) {
    console.error(`Error analyzing file ${file}:`, error);
    parentPort.postMessage({ error: error.message, file });
  }
}

main();
