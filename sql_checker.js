const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envVars = fs.readFileSync('.env.local', 'utf8').split('\n');
let supabaseUrl = '';
let supabaseKey = '';

envVars.forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

if (supabaseUrl.startsWith('"')) supabaseUrl = supabaseUrl.slice(1, -1);
if (supabaseKey.startsWith('"')) supabaseKey = supabaseKey.slice(1, -1);

const supabase = createClient(supabaseUrl, supabaseKey);

async function probeTable() {
  const { error } = await supabase.from('ideas').insert({
    id: '00000000-0000-0000-0000-000000000000',
    name: 'probe',
    type: 'probe',
    category: 'probe',
    format: 'template',
    tech: [],
    complexity: 'probe',
    feel: 'probe',
    prompt: 'probe',
    enriched_spec: {},
    generated_code: 'probe_code',
    status: 'pending',
    error_log: 'probe'
  }).select();

  if (error) {
    if (error.code === '23505') {
       console.log('Insert succeeded previously, row already exists. All columns accepted!');
    } else {
       console.log('Probing error:', error.message);
    }
  } else {
    console.log('Insert succeeded! All columns including format and generated_code are officially recognized by the database.');
    // cleanup
    await supabase.from('ideas').delete().eq('id', '00000000-0000-0000-0000-000000000000');
  }
}
probeTable();
