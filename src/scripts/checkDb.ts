import 'dotenv/config';
import { initSupabase, getSupabaseAdmin } from '../config/supabase';

async function main() {
  initSupabase();
  const s = getSupabaseAdmin();
  if (!s) return;

  const { data: prods } = await s.from('products').select('id, title, target_header_id, target_dropdown_id');
  const { data: headers } = await s.from('header_items').select('id, title, path');
  const { data: dropdowns } = await s.from('header_dropdown_items').select('id, header_item_id, title, path');
  console.log('PRODUCTS:', JSON.stringify(prods));
  console.log('HEADERS:', JSON.stringify(headers));
  console.log('DROPDOWNS:', JSON.stringify(dropdowns));
  process.exit(0);
}

main();
