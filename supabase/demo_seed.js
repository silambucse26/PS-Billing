const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'apps/api/.env' });

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');

async function seedDemoData() {
  console.log('Seeding demo products and customers...');

  // Get first shop
  const { data: shops } = await supabase.from('shops').select('id').limit(1);
  if (!shops || shops.length === 0) {
    console.error('No shops found to bind products to. Register a shop first!');
    return;
  }
  const shopId = shops[0].id;

  // Add category if not exists
  const { data: cat } = await supabase
    .from('categories')
    .insert({ name: 'Mastitis Products' })
    .select()
    .single();

  const categoryId = cat ? cat.id : null;

  // Add demo products
  const products = [
    {
      shop_id: shopId,
      name: 'Mastitis Test Kit',
      sku: 'MAST-01',
      barcode: '123456',
      hsn_code: '3822',
      category_id: categoryId,
      unit: 'pcs',
      purchase_price: 150.00,
      sale_price: 250.00,
      gst_rate: 18.00,
      opening_stock: 50,
      current_stock: 50,
      reorder_level: 5
    },
    {
      shop_id: shopId,
      name: 'Calcium Feed Supplement 1L',
      sku: 'FEED-CALC-1L',
      barcode: '789012',
      hsn_code: '2309',
      category_id: categoryId,
      unit: 'bottles',
      purchase_price: 180.00,
      sale_price: 320.00,
      gst_rate: 12.00,
      opening_stock: 30,
      current_stock: 30,
      reorder_level: 10
    }
  ];

  await supabase.from('products').insert(products);
  console.log('Demo products seeded.');

  // Add demo customer
  await supabase.from('customers').insert({
    shop_id: shopId,
    name: 'Ramesh Kumar',
    phone: '9876543210',
    email: 'ramesh@example.com',
    state: 'Delhi',
    address: 'Sector 5, Dwarka, New Delhi'
  });
  console.log('Demo customer seeded.');
}

seedDemoData();
