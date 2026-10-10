import dotenv from 'dotenv';
dotenv.config();

import { getSupabaseAdmin, initSupabase } from '../config/supabase';

async function main() {
  initSupabase();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('Supabase admin not available');
    return;
  }

  // 1. Delete all rows from products table
  const { error: pDelErr } = await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log('Cleared products table:', pDelErr ? pDelErr.message : 'SUCCESS');

  // 2. Clear products_catalog in site_settings so no dummy data lingers
  const { error: delErr } = await supabase
    .from('site_settings')
    .delete()
    .eq('key', 'products_catalog');
  console.log('Cleared site_settings products_catalog:', delErr ? delErr.message : 'SUCCESS');

  // 3. Verify products table count
  const { data: prodData } = await supabase.from('products').select('id');
  console.log('Products in "products" table now:', prodData?.length ?? 0);
}

main().catch(console.error);
