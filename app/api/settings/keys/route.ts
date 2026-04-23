import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase } from '@/lib/db/supabase';

export async function GET() {
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = '';
  try {
    envContent = fs.readFileSync(envPath, 'utf8');
  } catch {
    // File doesn't exist optionally
  }

  const keys: Record<string, boolean> = {};
  
  // Base providers
  const providers = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GROQ_API_KEY'];
  
  // Fetch custom providers from DB
  try {
    const { data: customProviders } = await supabase.from('ai_providers').select('env_key');
    if (customProviders) {
      customProviders.forEach(p => {
        if (p.env_key && !providers.includes(p.env_key)) {
          providers.push(p.env_key);
        }
      });
    }
  } catch (err) {
    console.warn('Could not fetch custom providers for key scanning:', err);
  }

  for (const provider of providers) {
    const regex = new RegExp(`^${provider}=(.*)$`, 'm');
    const match = envContent.match(regex);
    keys[provider] = !!(match && match[1].trim());
  }

  return NextResponse.json(keys);
}

export async function POST(request: Request) {
  try {
    const { envKey, value } = await request.json();
    
    if (!envKey || typeof value !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Base providers + custom providers validation
    const providers = ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY', 'GROQ_API_KEY'];
    try {
      const { data: customProviders } = await supabase.from('ai_providers').select('env_key');
      if (customProviders) {
        customProviders.forEach(p => {
          if (p.env_key && !providers.includes(p.env_key)) {
            providers.push(p.env_key);
          }
        });
      }
    } catch (err) {
       console.warn('Could not fetch custom providers for key validation:', err);
    }

    if (!providers.includes(envKey)) {
      return NextResponse.json({ error: 'Unsupported key' }, { status: 400 });
    }

    const envPath = path.join(process.cwd(), '.env.local');
    let envContent = '';
    try {
      envContent = fs.readFileSync(envPath, 'utf8');
    } catch {
      // File doesn't exist optionally
    }

    const regex = new RegExp(`^${envKey}=.*$`, 'm');
    const newValue = `${envKey}=${value}`;

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, newValue);
    } else {
      envContent += (envContent.endsWith('\n') || envContent === '' ? '' : '\n') + newValue + '\n';
    }

    fs.writeFileSync(envPath, envContent, 'utf8');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving API key:', error);
    return NextResponse.json({ error: 'Failed to save API key' }, { status: 500 });
  }
}
