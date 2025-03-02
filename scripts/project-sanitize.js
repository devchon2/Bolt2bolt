const fs = require('fs');
const path = require('path');
const config = require('../config/cleanup-config.json');
const { execSync } = require('child_process');

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
  const backupScript = path.join(__dirname, 'backup.js');
  execSync(`node ${backupScript}`);
}

function validateStructure() {
  const validateScript = path.join(__dirname, 'validate-structure.js');
  execSync(`node ${validateScript}`);
}

function logAction(action) {
  // ...code to log the action...
}

function main() {
  if (config.safety.backup) {
    backupProject();
  }
  scanAndClean(path.resolve(__dirname, '..'));
  validateStructure();
  logAction('Full project sanitize completed');
}

main();
