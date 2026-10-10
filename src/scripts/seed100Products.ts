import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { getSupabaseAdmin, initSupabase } from '../config/supabase';
import { generateSlug } from '../controllers/product.controller';

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=800',
  'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=800',
  'https://images.unsplash.com/photo-1581557991964-125469da3b8a?q=80&w=800',
  'https://images.unsplash.com/photo-1559454403-b8fb88521f11?q=80&w=800',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800',
  'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?q=80&w=800',
  'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800',
  'https://images.unsplash.com/photo-1563245372-f21724e3856d?q=80&w=800',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=800',
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=800',
  'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?q=80&w=800',
  'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?q=80&w=800',
  'https://images.unsplash.com/photo-1560769629-975ec94e6a86?q=80&w=800',
  'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?q=80&w=800',
  'https://images.unsplash.com/photo-1535295972055-1c762f4483e5?q=80&w=800',
  'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=800',
  'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=800',
  'https://images.unsplash.com/photo-1533227268428-f9ed0900fb3b?q=80&w=800',
  'https://images.unsplash.com/photo-1572635196237-14b3f281503f?q=80&w=800',
  'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=800',
];

const PREFIXES = ['Fluffy', 'Honey', 'Pastel', 'Vintage', 'Golden', 'Snuggle', 'Cuddle', 'Velvet', 'Cloud', 'Sweet', 'Little', 'Chubby', 'Cozy', 'Dreamy', 'Panda', 'Berry', 'Sunny', 'Starry', 'Caramel', 'Rainbow'];
const CREATURES = ['Teddy', 'Bear', 'Bunny', 'Panda', 'Koala', 'Lamb', 'Puppy', 'Kitten', 'Duckling', 'Fox', 'Penguin', 'Elephant', 'Giraffe', 'Deer', 'Unicorn'];
const TYPES = ['Backpack', 'School Bag', 'Daypack', 'Satchel', 'Sling Bag', 'Travel Pack', 'Pouch', 'Mini Pack', 'Cuddle Carrier', 'Rucksack'];

const BADGES = ['Bestseller', 'Trending', 'Hot Deal', 'New Arrival', 'Limited Edition', ''];
const BADGE_STYLES = ['ribbon', 'pill', 'minimal', 'glass', 'energetic'];
const BADGE_COLORS = ['#D26900', '#E65100', '#FF3F6C', '#059669', '#2563EB', '#111827'];

const COLOR_PALETTES = [
  [{ name: 'Warm Amber', hex: '#D26900' }, { name: 'Honey Brown', hex: '#8D5B4C' }],
  [{ name: 'Pastel Pink', hex: '#F472B6' }, { name: 'Pearl White', hex: '#F3F4F6' }],
  [{ name: 'Baby Blue', hex: '#60A5FA' }, { name: 'Midnight Navy', hex: '#1E3A8A' }],
  [{ name: 'Emerald Sage', hex: '#059669' }, { name: 'Cream Beige', hex: '#F59E0B' }],
  [{ name: 'Lavender Violet', hex: '#A855F7' }, { name: 'Soft Gray', hex: '#9CA3AF' }],
];

const SIZES_OPTIONS = [
  ['Mini (25cm)', 'Standard (35cm)'],
  ['Standard (35cm)', 'Jumbo (45cm)'],
  ['Free Size'],
  ['Mini (25cm)', 'Standard (35cm)', 'Jumbo (45cm)'],
];

async function main() {
  initSupabase();
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('Supabase admin not available');
    return;
  }

  // 1. Fetch headers and dropdowns
  const { data: hData } = await supabase.from('header_items').select('id, title, path');
  const { data: dData } = await supabase.from('header_dropdown_items').select('id, header_item_id, title, path');

  let toysHeaderId: string | null = null;
  let kidsToyDropdownId: string | null = null;

  if (Array.isArray(hData)) {
    const toys = hData.find((h) => h.title.toLowerCase().includes('toy'));
    toysHeaderId = toys ? toys.id : (hData[0]?.id || null);
  }

  if (Array.isArray(dData)) {
    const kids = dData.find((d) => d.title.toLowerCase().includes('kid') || d.title.toLowerCase().includes('toy'));
    kidsToyDropdownId = kids ? kids.id : (dData[0]?.id || null);
  }

  console.log(`Mapping demo products to Header: ${toysHeaderId}, Dropdown: ${kidsToyDropdownId}`);

  const generatedRows = [];
  const catalogList = [];

  for (let i = 1; i <= 100; i++) {
    const pIndex = (i - 1) % PREFIXES.length;
    const cIndex = (i * 2) % CREATURES.length;
    const tIndex = (i * 3) % TYPES.length;

    const title = `${PREFIXES[pIndex]} ${CREATURES[cIndex]} ${TYPES[tIndex]} ${i}`;
    const subtitle = `Handcrafted velvet companion for kids & daily fun (Edition #${i})`;
    const cleanSlug = generateSlug(title);

    const mrp = 1499 + ((i * 100) % 2500); // 1499 to 3999
    const disc = 20 + ((i * 7) % 35); // 20% to 55%
    const price = Math.round(mrp * (1 - disc / 100));

    const img1 = SAMPLE_PHOTOS[(i - 1) % SAMPLE_PHOTOS.length];
    const img2 = SAMPLE_PHOTOS[(i + 4) % SAMPLE_PHOTOS.length];
    const img3 = SAMPLE_PHOTOS[(i + 8) % SAMPLE_PHOTOS.length];

    const badgeText = BADGES[i % BADGES.length];
    const badgeStyle = BADGE_STYLES[i % BADGE_STYLES.length];
    const badgeColor = BADGE_COLORS[i % BADGE_COLORS.length];

    const colors = COLOR_PALETTES[i % COLOR_PALETTES.length];
    const sizes = SIZES_OPTIONS[i % SIZES_OPTIONS.length];

    const rating = Number((4.5 + ((i % 6) * 0.1)).toFixed(1));
    const reviewsCount = 25 + ((i * 13) % 400);

    const prodObj = {
      id: crypto.randomUUID(),
      title,
      subtitle,
      slug: cleanSlug,
      sku: `YTB-KID-${1000 + i}`,
      price,
      mrp,
      discount_percent: disc,
      rating,
      reviews_count: reviewsCount,
      badge_text: badgeText || null,
      badge_style: badgeStyle,
      badge_color: badgeColor,
      images: [
        { id: `img-${i}-1`, url: img1, is_primary: true, alt: `${title} Main` },
        { id: `img-${i}-2`, url: img2, is_primary: false, alt: `${title} Side` },
        { id: `img-${i}-3`, url: img3, is_primary: false, alt: `${title} Angle` },
      ],
      primary_image: img1,
      colors,
      sizes,
      target_header_id: toysHeaderId,
      target_dropdown_id: kidsToyDropdownId,
      why_love_it: [
        'Ultra-soft feather-touch velvet plush that never sheds',
        'Ergonomic padded shoulder straps designed for gentle posture',
        'Child-safe anti-scratch YKK zippers with teddy pullers',
      ],
      specifications: [
        { key: 'Material & Fabric', value: '100% Premium Korean Velvet Plush + Non-Toxic PP Cotton Fill' },
        { key: 'Dimensions (H x W x D)', value: '35cm x 28cm x 14cm' },
        { key: 'Item Weight', value: '380 grams' },
        { key: 'Recommended Age Group', value: 'All ages (3+ Years recommended)' },
      ],
      description: `Delight your little one with the ${title}. Handcrafted with ultra-soft Korean velvet fabric, ergonomic padded straps, and charming details.`,
      stock_quantity: 25 + (i % 60),
      in_stock: true,
      is_active: true,
      order_index: i,
      created_at: new Date(Date.now() - (100 - i) * 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    catalogList.push(prodObj);
    generatedRows.push({
      id: prodObj.id,
      title: prodObj.title,
      subtitle: prodObj.subtitle,
      slug: prodObj.slug,
      sku: prodObj.sku,
      price: prodObj.price,
      mrp: prodObj.mrp,
      discount_percent: prodObj.discount_percent,
      rating: prodObj.rating,
      reviews_count: prodObj.reviews_count,
      badge_text: prodObj.badge_text,
      images: prodObj.images,
      primary_image: prodObj.primary_image,
      colors: prodObj.colors,
      sizes: prodObj.sizes,
      target_header_id: prodObj.target_header_id,
      target_dropdown_id: prodObj.target_dropdown_id,
      why_love_it: prodObj.why_love_it,
      specifications: prodObj.specifications,
      description: prodObj.description,
      stock_quantity: prodObj.stock_quantity,
      in_stock: prodObj.in_stock,
      is_active: prodObj.is_active,
      order_index: prodObj.order_index,
      created_at: prodObj.created_at,
      updated_at: prodObj.updated_at,
    });
  }

  // Upsert to site_settings
  const { error: sErr } = await supabase.from('site_settings').upsert({
    key: 'products_catalog',
    value: catalogList,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'key' });
  console.log('Upserted to site_settings products_catalog:', sErr ? sErr.message : 'SUCCESS');

  // Upsert in batches to products table
  for (let b = 0; b < generatedRows.length; b += 25) {
    const chunk = generatedRows.slice(b, b + 25);
    const { error: pErr } = await supabase.from('products').upsert(chunk, { onConflict: 'id' });
    if (pErr) {
      console.warn(`Chunk ${b / 25 + 1} upsert notice:`, pErr.message);
    } else {
      console.log(`Chunk ${b / 25 + 1} (25 items) upserted successfully`);
    }
  }

  console.log(`Successfully migrated 100 products to database!`);
}

main().catch(console.error);
