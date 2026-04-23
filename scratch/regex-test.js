const code1 = "import { useState } from 'react';\r\nimport { motion } from 'framer-motion';";
const code2 = "import { useState } from 'react';\nimport { motion } from 'framer-motion';";

const regex = /^\s*import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"];\s*$/gm;

console.log("CODE1:", code1.replace(regex, ''));
console.log("CODE2:", code2.replace(regex, ''));
