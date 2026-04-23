const fs = require('fs');

const log = fs.readFileSync('Pipeline-logs/log1.text', 'utf-8');
const payloadStart = log.lastIndexOf('Output Payload:\n');
if (payloadStart !== -1) {
  const jsonStr = log.substring(payloadStart + 'Output Payload:\n'.length);
  try {
    const payload = JSON.parse(jsonStr);
    fs.writeFileSync('scratch/generated.tsx', payload.code);
    console.log("Extracted code to scratch/generated.tsx");
  } catch (e) {
    console.error("Failed to parse JSON", e);
  }
}
