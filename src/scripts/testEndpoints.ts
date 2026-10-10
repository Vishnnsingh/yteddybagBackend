async function main() {
  try {
    const res1 = await fetch('http://localhost:5000/api/v1/home-banners/bestsellers');
    const json1: any = await res1.json();
    console.log('--- PUBLIC BESTSELLERS API ---');
    console.log('Items count:', json1.data?.items?.length);
    console.log('Product 1 in bestsellers?', json1.data?.items?.some((i: any) => i.title === 'Product 1'));

    const res2 = await fetch('http://localhost:5000/api/v1/home-banners/layout');
    const json2: any = await res2.json();
    console.log('--- PUBLIC LAYOUT API ---');
    const bSection = json2.data?.find((s: any) => s.section_type === 'bestsellers');
    console.log('Bestseller section items count:', bSection?.items?.length);
    console.log('Product 1 in layout bestsellers items?', bSection?.items?.some((i: any) => i.title === 'Product 1'));

    const res3 = await fetch('http://localhost:5000/api/v1/products');
    const json3: any = await res3.json();
    console.log('--- PUBLIC PRODUCTS CATALOG API ---');
    console.log('Product 1 in public products?', json3.data?.some((p: any) => p.title === 'Product 1'));
  } catch (err: any) {
    console.error('Fetch error:', err.message);
  }
  process.exit(0);
}

main();
