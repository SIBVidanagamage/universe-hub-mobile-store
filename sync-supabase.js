/**
 * Universe Hub - One-time Bulk Seeder to Supabase
 * Reads all products, categories, and brands from data.js and uploads them to Supabase PostgreSQL.
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://mukctesllfgdgvkttjkb.supabase.co";
const SUPABASE_KEY = "sb_publishable_f20oiNxVRdSdz7FhICoWlg_8PEoqOVS";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Load data.js
global.window = global;
global.document = { getElementById: () => null };
global.localStorage = { getItem: () => null, setItem: () => null };
require('./js/data.js');

async function seed() {
  console.log("🚀 Starting Universe Hub -> Supabase Cloud Database Seed...\n");

  // 1. Categories
  const categories = global.INITIAL_CATEGORIES || [];
  console.log(`📦 Uploading ${categories.length} Categories...`);
  for (const cat of categories) {
    const { error } = await supabase.from('categories').upsert({
      id: cat.id,
      name: cat.name,
      group: cat.group || 'iphones',
      groupName: cat.groupName || 'iPhones',
      icon: cat.icon || '📱',
      inNav: cat.inNav !== false,
      inFilter: cat.inFilter !== false,
      order: cat.order || 0
    });
    if (error) console.error(`  ❌ Category ${cat.name}:`, error.message);
  }
  console.log(`  ✅ Categories sync complete!\n`);

  // 2. Brands
  const brands = global.INITIAL_BRANDS || [];
  console.log(`🏷️ Uploading ${brands.length} Brands...`);
  for (const b of brands) {
    const { error } = await supabase.from('brands').upsert({
      id: b.id,
      name: b.name,
      icon: b.icon || null,
      badge: b.badge || null,
      order: b.order || 0
    });
    if (error) console.error(`  ❌ Brand ${b.name}:`, error.message);
  }
  console.log(`  ✅ Brands sync complete!\n`);

  // 3. Products
  const products = global.INITIAL_PRODUCTS || [];
  console.log(`📱 Uploading ${products.length} Products...`);
  let prodSuccess = 0;
  for (const p of products) {
    const { error } = await supabase.from('products').upsert({
      id: String(p.id),
      title: p.title || p.name,
      slug: p.slug || p.id,
      category: p.category,
      brand: p.brand || (p.name && p.name.includes('Apple') ? 'Apple' : 'Anker'),
      price: Number(p.price),
      original_price: p.originalPrice ? Number(p.originalPrice) : null,
      badge: p.badge || null,
      is_featured: !!p.isFeatured,
      stock: p.stock !== undefined ? Number(p.stock) : 10,
      rating: p.rating !== undefined ? Number(p.rating) : 5.0,
      review_count: p.reviews || 0,
      image: p.image,
      images: p.images || [p.image],
      description: p.description || '',
      specs: p.specs || {}
    });
    if (error) {
      console.error(`  ❌ Product ${p.title}:`, error.message);
    } else {
      prodSuccess++;
    }
  }
  console.log(`  ✅ ${prodSuccess}/${products.length} Products synced to Cloud Database!\n`);

  // 4. Reviews
  const reviews = global.INITIAL_REVIEWS || [];
  console.log(`⭐ Uploading ${reviews.length} Reviews...`);
  for (const r of reviews) {
    const { error } = await supabase.from('reviews').upsert({
      id: String(r.id),
      author: r.author,
      rating: Number(r.rating || 5),
      comment: r.comment || '',
      verified: r.verified !== false,
      date: r.date || 'Oct 2026'
    });
    if (error) console.error(`  ❌ Review by ${r.author}:`, error.message);
  }
  console.log(`  ✅ Reviews sync complete!\n`);

  console.log("🎉 All Universe Hub inventory and taxonomy live on Supabase!");
}

seed().catch(err => console.error("Fatal Seeding Error:", err));
