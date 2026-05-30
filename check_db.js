const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

let envFile = fs.readFileSync('./.env.local', 'utf8');
let supabaseUrl, supabaseAnonKey;
envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1].trim();
  }
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseAnonKey = line.split('=')[1].trim();
  }
});

console.log("Supabase URL:", supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data, error } = await supabase
    .from('audio_tracks')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Error fetching audio_tracks:", error);
  } else {
    console.log("Audio track structure:", data[0]);
  }
}

check();
