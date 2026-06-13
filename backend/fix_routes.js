const fs = require('fs');
const path = require('path');

const files = [
  'src/routes/crisis.ts',
  'src/routes/notifications.ts',
  'src/routes/platform.ts',
  'src/routes/tasks.ts',
  'src/routes/users.ts'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('validateRequest')) {
    // Add import statement
    content = content.replace(
      "import { body",
      "import { validateRequest } from '../middleware/validate';\nimport { body"
    );

    // Replace ], ControllerName with ], validateRequest, ControllerName
    // We use a regex that looks for an array ending followed by a comma, optional spaces, and a controller name.
    // However, some routes might not have validation arrays or the controller name might be directly after ],
    // Let's do a more robust regex or just string replacement:
    
    // We can replace `], ` followed by a word (the controller) with `], validateRequest, `
    // Exception: if it's not a controller but something else? In express routes it's usually the controller.
    
    content = content.replace(/\], ([a-zA-Z0-9_]+)\);/g, "], validateRequest, $1);");
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
