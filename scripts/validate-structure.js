const fs = require('fs');
const path = require('path');
const config = require('../config/cleanup-config.json');

function validateStructure() {
  const missingDirs = config.structure.directories.filter(dir => !fs.existsSync(path.join(__dirname, '..', dir)));
  const missingFiles = config.structure.mandatoryFiles.filter(file => !fs.existsSync(path.join(__dirname, '..', file)));

  if (missingDirs.length > 0 || missingFiles.length > 0) {
    console.error('Structure validation failed');
    console.error('Missing directories:', missingDirs);
    console.error('Missing files:', missingFiles);
    process.exit(1);
  } else {
    console.log('Structure validation passed');
  }
}

validateStructure();
