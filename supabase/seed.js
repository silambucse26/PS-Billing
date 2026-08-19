const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: "apps/api/.env" });

const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");

async function seed() {
  console.log("Seeding administrative users...");
  
  const { data: franchise, error: fErr } = await supabase
    .from("franchises")
    .insert({ name: "PashuCentral HQ", type: "master_franchise" })
    .select()
    .single();
  if (fErr) { console.error("Franchise error:", fErr); return; }

  const { data: shop, error: sErr } = await supabase
    .from("shops")
    .insert({
      franchise_id: franchise.id,
      name: "Central Delhi Center",
      state: "Delhi",
      invoice_prefix: "INV-DEL"
    })
    .select()
    .single();
  if (sErr) { console.error("Shop error:", sErr); return; }

  const adminEmail = "admin@pashucentral.com";
  const adminPassword = "Password123!";
  const { data: adminAuth, error: aAuthErr } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true
  });
  if (aAuthErr) { console.log("Admin Auth error:", aAuthErr.message); }

  const adminId = adminAuth?.user?.id;
  if (adminId) {
    await supabase.from("profiles").insert({
      id: adminId,
      full_name: "Super Admin",
      role: "super_admin",
      shop_id: shop.id,
      franchise_id: franchise.id
    });
    console.log("Admin profile created.");
  }

  const cashierEmail = "cashier@pashucentral.com";
  const cashierPassword = "Password123!";
  const { data: cashierAuth, error: cAuthErr } = await supabase.auth.admin.createUser({
    email: cashierEmail,
    password: cashierPassword,
    email_confirm: true
  });
  if (cAuthErr) { console.log("Cashier Auth error:", cAuthErr.message); }

  const cashierId = cashierAuth?.user?.id;
  if (cashierId) {
    await supabase.from("profiles").insert({
      id: cashierId,
      full_name: "Shop Cashier",
      role: "shopkeeper",
      shop_id: shop.id,
      franchise_id: franchise.id
    });
    console.log("Cashier profile created.");
  }

  console.log("Done!");
}

seed();
