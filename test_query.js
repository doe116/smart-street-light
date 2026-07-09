import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env manually
const envContent = fs.readFileSync('./.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing environment variables!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
  const { data, error } = await supabase
    .from('device_status')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    console.error("Error fetching device status:", error);
  } else {
    console.log("Current Device Status in Database:");
    console.log(data);
  }

  const { data: settings, error: sError } = await supabase
    .from('system_settings')
    .select('*');

  if (sError) {
    console.error("Error fetching system settings:", sError);
  } else {
    console.log("\nCurrent System Settings:");
    console.log(settings);
  }
}

checkStatus();
