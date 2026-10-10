import 'dotenv/config';
import { initSupabase, getSupabaseAdmin } from '../config/supabase';

async function main() {
  initSupabase();
  const s = getSupabaseAdmin();
  if (!s) {
    console.error('Supabase admin not initialized');
    return;
  }

  // 1. Reset home_banners slide 1 button_text to 'SHOP NOW'
  await s
    .from('home_banners')
    .update({ button_text: 'SHOP NOW' })
    .eq('id', '10000000-0000-0000-0000-000000000001');

  // 2. Fetch all banners from home_banners
  const { data: allBanners } = await s.from('home_banners').select('*').order('order_index');

  // 3. Prepare Section 1 items (button_text: 'SHOP NOW' on slide 1)
  const sec1Items = (allBanners || []).map((b) => ({
    ...b,
    id: `hero_1_${b.id}`,
    button_text: b.id === '10000000-0000-0000-0000-000000000001' ? 'SHOP NOW' : b.button_text,
  }));

  // 4. Prepare Section 7 items (button_text: 'LOL ->' on slide 1, completely isolated with unique IDs)
  const sec7Items = (allBanners || []).map((b) => ({
    ...b,
    id: `hero_7_${b.id}`,
    button_text: b.id === '10000000-0000-0000-0000-000000000001' ? 'LOL ->' : b.button_text,
  }));

  // 5. Update home_sections_layout table
  await s.from('home_sections_layout').update({ items: sec1Items }).eq('id', 'hero_banner_1');
  await s.from('home_sections_layout').update({ items: sec7Items }).eq('id', 'hero_banner_mur39zb0_jhtc');

  // 6. Fetch full layout from home_sections_layout
  const { data: fullLayout } = await s.from('home_sections_layout').select('*').order('order_index');

  // 7. Update home_banner_settings table key 'home_sections_layout'
  await s.from('home_banner_settings').upsert(
    {
      key: 'home_sections_layout',
      value: fullLayout,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  );

  console.log('SUCCESS: Section 1 and Section 7 completely separated in database!');
}

main().catch(console.error);
