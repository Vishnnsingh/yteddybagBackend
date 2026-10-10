import 'dotenv/config';
import { initSupabase, getSupabaseAdmin } from '../config/supabase';

async function main() {
  initSupabase();
  const s = getSupabaseAdmin();
  if (!s) {
    console.error('Supabase admin not initialized');
    return;
  }

  const tables = [
    'home_banners',
    'home_sub_banners',
    'home_occasions',
    'home_bestsellers',
    'home_promo_banners',
    'home_custom_cards',
    'home_sections_layout',
    'products',
    'header_items',
    'header_dropdown_items',
    'users'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await s.from(table).select('*', { count: 'exact' });
      if (error) {
        console.log(`Table [${table}]: ERROR ${error.message}`);
      } else {
        console.log(`Table [${table}]: Count = ${data?.length || 0}`);
        if (data && data.length > 0) {
          console.log(`Sample from [${table}]:`, JSON.stringify(data[0]).slice(0, 150));
        }
      }
    } catch (e: any) {
      console.log(`Table [${table}]: Exception ${e.message}`);
    }
  }
}

main().catch(console.error);
