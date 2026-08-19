import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL || "", process.env.SUPABASE_SERVICE_ROLE_KEY || "");

async function fixProfiles() {
  console.log("Fixing admin profiles in database...");
  
  // 1. Get first shop and franchise
  const { data: shops } = await supabase.from("shops").select("id, franchise_id").limit(1);
  if (!shops || shops.length === 0) {
    console.error("No shops found in database. Please register a shop first!");
    return;
  }
  const shop = shops[0];
  
  // 2. Fetch all Auth users
  const { data: usersData, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error("Error listing users:", uErr);
    return;
  }
  
  const adminUser = usersData.users.find(u => u.email === "admin@pashucentral.com");
  if (adminUser) {
    console.log("Creating admin profile for ID:", adminUser.id);
    const { error: pErr } = await supabase.from("profiles").upsert({
      id: adminUser.id,
      full_name: "Super Admin",
      role: "super_admin",
      shop_id: shop.id,
      franchise_id: shop.franchise_id
    });
    if (pErr) console.error("Error inserting admin profile:", pErr);
    else console.log("Admin profile fixed/created successfully.");
  }
  
  const cashierUser = usersData.users.find(u => u.email === "cashier@pashucentral.com");
  if (cashierUser) {
    console.log("Creating cashier profile for ID:", cashierUser.id);
    const { error: pErr } = await supabase.from("profiles").upsert({
      id: cashierUser.id,
      full_name: "Shop Cashier",
      role: "shopkeeper",
      shop_id: shop.id,
      franchise_id: shop.franchise_id
    });
    if (pErr) console.error("Error inserting cashier profile:", pErr);
    else console.log("Cashier profile fixed/created successfully.");
  }
}

fixProfiles();
