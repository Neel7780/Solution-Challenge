const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const configContent = `export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';\nexport const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';\n`;
fs.writeFileSync(path.join(__dirname, 'src', 'config.ts'), configContent);

const files = walk(path.join(__dirname, 'src'));

files.forEach(file => {
  if (file.endsWith('config.ts')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  const apiUrlPattern = /const API_URL = import\.meta\.env\.VITE_API_URL \|\| 'http:\/\/localhost:3001\/api';/g;
  const socketUrlPattern = /const SOCKET_URL = import\.meta\.env\.VITE_SOCKET_URL \|\| 'http:\/\/localhost:3001';/g;

  if (apiUrlPattern.test(content) || socketUrlPattern.test(content)) {
    // Determine relative path to config.ts
    const fileDir = path.dirname(file);
    let relativePath = path.relative(fileDir, path.join(__dirname, 'src', 'config'));
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    relativePath = relativePath.replace(/\\/g, '/'); // For Windows, though we are on Linux

    const imports = [];
    if (content.match(apiUrlPattern)) {
      imports.push('API_URL');
      content = content.replace(apiUrlPattern, '');
    }
    if (content.match(socketUrlPattern)) {
      imports.push('SOCKET_URL');
      content = content.replace(socketUrlPattern, '');
    }

    const importStmt = `import { ${imports.join(', ')} } from '${relativePath}';\n`;
    
    // Insert import at the top of the file, after any 'use client' or similar if any
    content = importStmt + content.replace(/^\s+/, '');
    
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
