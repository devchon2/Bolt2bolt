const fs = require('fs');
const path = require('path');
const config = require('../config/cleanup-config.json');

function scanAndClean(directory) {
  const files = fs.readdirSync(directory);
  files.forEach(file => {
    const filePath = path.join(directory, file);
    if (fs.lstatSync(filePath).isDirectory()) {
      scanAndClean(filePath);
    } else {
      let content = fs.readFileSync(filePath, 'utf8');
      config.sanitize.patterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'g');
        content = content.replace(regex, '');
      });
      fs.writeFileSync(filePath, content, 'utf8');
    }
  });
}

function backupProject() {
  // ...code to create a backup of the project...
}

function logAction(action) {
  // ...code to log the action...
}

function main() {
  if (config.safety.backup) {
    backupProject();
  }
  scanAndClean(path.resolve(__dirname, '..'));
  logAction('Cleanup completed');
}

main();
