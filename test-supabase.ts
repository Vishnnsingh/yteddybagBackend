import { getSupabaseAdmin, initSupabase } from './src/config/supabase';
import { UserModel } from './src/models/user.model';
import dotenv from 'dotenv';

dotenv.config();

async function testSupabase() {
  initSupabase();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('No supabase client');
    process.exit(1);
  }
  
  console.log('Testing Supabase query on table:', UserModel.table);
  const { data, error } = await supabase.from(UserModel.table).select('*').limit(1);
  
  if (error) {
    console.error('SUPABASE ERROR:', error);
  } else {
    console.log('SUPABASE SUCCESS. Data:', data);
  }
}

testSupabase();
