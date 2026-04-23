function escapeControlCharsInStrings(jsonString: string): string {
  let inString = false
  let result = ''
  
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i]
    if (char === '"' && (i === 0 || jsonString[i - 1] !== '\\')) {
      inString = !inString
    }
    
    if (inString) {
      if (char === '\n') result += '\\n'
      else if (char === '\r') result += '\\r'
      else if (char === '\t') result += '\\t'
      else result += char
    } else {
      result += char
    }
  }
  
  return result
}

const malformed = `{
  "name": "Some UI",
  "vision": "Here is line 1.
Here is line 2."
}`;

console.log(escapeControlCharsInStrings(malformed));
console.log(JSON.parse(escapeControlCharsInStrings(malformed)));
