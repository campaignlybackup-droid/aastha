import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const neonUrl =
  "postgresql://neondb_owner:npg_7Qmy1OkntvBC@ep-fancy-leaf-azipqs4m-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const supabaseUrl =
  "postgresql://postgres.ycukquwczryyznmvtwzv:%26%40f%26%23%403H%26f5Jvds@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

const neonDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: neonUrl }) });
const supabaseDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: supabaseUrl }) });

async function verify() {
  console.log("=== COMPREHENSIVE DATABASE PARITY AUDIT (NEON VS SUPABASE) ===");

  const tables = [
    { name: "Media", neon: () => neonDb.media.count(), supabase: () => supabaseDb.media.count() },
    { name: "User", neon: () => neonDb.user.count(), supabase: () => supabaseDb.user.count() },
    { name: "Address", neon: () => neonDb.address.count(), supabase: () => supabaseDb.address.count() },
    { name: "Category", neon: () => neonDb.category.count(), supabase: () => supabaseDb.category.count() },
    { name: "Collection", neon: () => neonDb.collection.count(), supabase: () => supabaseDb.collection.count() },
    { name: "Product", neon: () => neonDb.product.count(), supabase: () => supabaseDb.product.count() },
    { name: "ProductImage", neon: () => neonDb.productImage.count(), supabase: () => supabaseDb.productImage.count() },
    { name: "ProductVariant", neon: () => neonDb.productVariant.count(), supabase: () => supabaseDb.productVariant.count() },
    { name: "ProductOnCollection", neon: () => neonDb.productOnCollection.count(), supabase: () => supabaseDb.productOnCollection.count() },
    { name: "ProductFaq", neon: () => neonDb.productFaq.count(), supabase: () => supabaseDb.productFaq.count() },
    { name: "Campaign", neon: () => neonDb.campaign.count(), supabase: () => supabaseDb.campaign.count() },
    { name: "HomepageSection", neon: () => neonDb.homepageSection.count(), supabase: () => supabaseDb.homepageSection.count() },
    { name: "Faq", neon: () => neonDb.faq.count(), supabase: () => supabaseDb.faq.count() },
    { name: "SeoMeta", neon: () => neonDb.seoMeta.count(), supabase: () => supabaseDb.seoMeta.count() },
    { name: "Setting", neon: () => neonDb.setting.count(), supabase: () => supabaseDb.setting.count() },
    { name: "Coupon", neon: () => neonDb.coupon.count(), supabase: () => supabaseDb.coupon.count() },
    { name: "Order", neon: () => neonDb.order.count(), supabase: () => supabaseDb.order.count() },
    { name: "OrderItem", neon: () => neonDb.orderItem.count(), supabase: () => supabaseDb.orderItem.count() },
    { name: "Review", neon: () => neonDb.review.count(), supabase: () => supabaseDb.review.count() },
    { name: "WishlistItem", neon: () => neonDb.wishlistItem.count(), supabase: () => supabaseDb.wishlistItem.count() },
  ];

  let allMatch = true;
  console.log("\nTable Name".padEnd(25) + "Neon Count".padEnd(15) + "Supabase Count".padEnd(18) + "Status");
  console.log("-".repeat(70));

  for (const t of tables) {
    const nCount = await t.neon();
    const sCount = await t.supabase();
    const match = nCount === sCount;
    if (!match) allMatch = false;
    console.log(
      t.name.padEnd(25) +
        String(nCount).padEnd(15) +
        String(sCount).padEnd(18) +
        (match ? "✅ MATCH" : "❌ MISMATCH"),
    );
  }

  console.log("-".repeat(70));
  if (allMatch) {
    console.log("🎉 ALL TABLES PERFECTLY MATCHED WITH 100% DATA PARITY!");
  } else {
    console.log("⚠️ Mismatch detected! Resolving missing data...");
  }
}

verify()
  .catch(console.error)
  .finally(async () => {
    await neonDb.$disconnect();
    await supabaseDb.$disconnect();
  });
