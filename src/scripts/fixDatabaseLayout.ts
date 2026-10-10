import 'dotenv/config';
import { initSupabase, getSupabaseAdmin } from '../config/supabase';

const DEFAULT_SECTION_IDS = [
  'hero_banner_1',
  'sub_banner_1',
  'occasions_1',
  'bestsellers_1',
  'custom_cards_1',
  'promo_banner_1',
];

async function main() {
  initSupabase();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('Supabase admin not initialized');
    process.exit(1);
  }

  console.log('1. Cleaning home_sections_layout table for default sections...');
  const { data: rows, error: readErr } = await supabase
    .from('home_sections_layout')
    .select('*')
    .order('order_index', { ascending: true });

  if (readErr) {
    console.error('Error reading home_sections_layout:', readErr);
  } else if (Array.isArray(rows)) {
    for (const row of rows) {
      if (DEFAULT_SECTION_IDS.includes(row.id)) {
        const cleanSettings = { ...(row.settings || {}) };
        delete cleanSettings.items;

        await supabase
          .from('home_sections_layout')
          .update({
            items: null,
            settings: cleanSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', row.id);
        console.log(`Cleaned section ${row.id} in home_sections_layout table`);
      }
    }
  }

  console.log('2. Cleaning home_banner_settings table key home_sections_layout...');
  const { data: currentLayout } = await supabase
    .from('home_sections_layout')
    .select('*')
    .order('order_index', { ascending: true });

  const cleanedLayoutForStorage = (currentLayout || []).map((item) => {
    const isDefault = DEFAULT_SECTION_IDS.includes(item.id);
    const cleanSettings = { ...(item.settings || {}) };
    if (isDefault) {
      delete cleanSettings.items;
    }
    return {
      ...item,
      items: isDefault ? undefined : item.items,
      settings: cleanSettings,
    };
  });

  await supabase.from('home_banner_settings').upsert(
    {
      key: 'home_sections_layout',
      value: cleanedLayoutForStorage,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );
  console.log('Updated home_banner_settings with clean layout!');

  console.log('Database cleanup completed successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
