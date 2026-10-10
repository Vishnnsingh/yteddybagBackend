import dotenv from 'dotenv';
dotenv.config();

import { fetchAllProductsFromDb } from '../controllers/product.controller';

async function testProducts() {
  console.log('Testing Products Controller directly...');
  const products = await fetchAllProductsFromDb();
  console.log(`Successfully fetched ${products.length} products!`);
  for (const p of products) {
    console.log(`- [${p.id}] ${p.title} | Rs.${p.price} (MRP: Rs.${p.mrp}, -${p.discount_percent}%) | Sizes: ${p.sizes.join(', ')} | Colors: ${p.colors.map(c => c.name).join(', ')}`);
  }
}

testProducts()
  .then(() => {
    console.log('Product test passed successfully!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Product test failed:', err);
    process.exit(1);
  });
