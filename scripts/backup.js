const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

function backupProject() {
  const output = fs.createWriteStream(path.join(__dirname, '..', 'backup.zip'));
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  output.on('close', () => {
    console.log(`Backup completed: ${archive.pointer()} total bytes`);
  });

  archive.pipe(output);
  archive.directory(path.join(__dirname, '..'), false);
  archive.finalize();
}

backupProject();
