const Babel = require('@babel/standalone');
try {
  Babel.transform("<div />", { filename: "file.tsx", presets: ['typescript', 'react'] });
  console.log("SUCCESS");
} catch (e) {
  console.log("ERROR", e.message);
}
