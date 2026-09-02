const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsFiles = [
  'js/core.js',
  'js/tabs/dashboard.js',
  'js/tabs/work.js',
  'js/tabs/sales.js',
  'js/tabs/admin.js',
  'js/tabs/projects.js'
];

let totalLines = 0;
let errors = 0;

jsFiles.forEach(relPath => {
  const filePath = path.join(__dirname, relPath);
  if (!fs.existsSync(filePath)) {
    console.error('MISSING FILE:', relPath);
    errors++;
    return;
  }

  const code = fs.readFileSync(filePath, 'utf8');
  totalLines += code.split('\n').length;

  try {
    new vm.Script(code);
    console.log('✔ Syntax OK:', relPath, `(${code.length} bytes)`);
  } catch (e) {
    console.error('✖ SYNTAX ERROR in', relPath, ':', e.message);
    errors++;
  }
});

console.log(`\nSyntax check completed. Total files: ${jsFiles.length}, Total lines: ${totalLines}, Errors: ${errors}`);
if (errors > 0) process.exit(1);
