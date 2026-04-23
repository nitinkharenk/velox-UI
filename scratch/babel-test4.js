const Babel = require('@babel/standalone');
const fs = require('fs');

const code = fs.readFileSync('scratch/generated.tsx', 'utf-8');

try {
  Babel.transform(code, { filename: 'file.tsx', presets: ['typescript', 'react'] });
  console.log("SUCCESS with filename=file.tsx");
} catch(e) {
  console.error("ERROR with filename=file.tsx:", e.message);
}

try {
  Babel.transform(code, { filename: 'file.ts', presets: ['typescript', 'react'] });
  console.log("SUCCESS with filename=file.ts");
} catch(e) {
  console.error("ERROR with filename=file.ts:", e.message);
}
