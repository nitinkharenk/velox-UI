const fs = require('fs');

const log = fs.readFileSync('Pipeline-logs/log1.text', 'utf-8');
const payloadStart = log.lastIndexOf('"code": "');
if (payloadStart !== -1) {
  const codeStart = payloadStart + '"code": "'.length;
  const codeEnd = log.indexOf('",\n  "imports":', codeStart);
  if (codeEnd !== -1) {
    let codeStr = log.substring(codeStart, codeEnd);
    // Unescape the JSON string
    codeStr = codeStr.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    fs.writeFileSync('scratch/generated.tsx', codeStr);
    console.log("Extracted code to scratch/generated.tsx");
  } else {
    console.log("Could not find end of code string");
  }
}
