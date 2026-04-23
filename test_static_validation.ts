import { validateCodeString } from './lib/pipeline/validationStatic'

const code = `
export default function ComponentName() {
  return <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 w-96 h-96">hello</div>;
}
`

const result = validateCodeString(code);
console.log("Validation Result:", JSON.stringify(result, null, 2));
