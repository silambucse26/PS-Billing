import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { MASTER_PRODUCTS } from '../config/masterCatalog';
import fs from 'fs';
import path from 'path';

const router = Router();

// Helper to seed or update default 20 Franchise Standard Products for a shop (944 units / ₹3,00,000 value)
async function seedDefaultProducts(shopId: string, allocateStandardStock: boolean = true) {
  try {
    // 1. Fetch or create categories
    const categoryNames = ["Mastitis", "Accessories", "Hygiene", "Diagnostic Kits", "Feed Supplement", "Breeding Tool", "General"];
    const categoryMap: Record<string, string> = {};

    const { data: existingCats } = await supabaseAdmin
      .from('categories')
      .select('id, name');

    (existingCats || []).forEach((c: any) => {
      categoryMap[c.name] = c.id;
    });

    for (const catName of categoryNames) {
      if (!categoryMap[catName]) {
        try {
          const { data: newCat } = await supabaseAdmin
            .from('categories')
            .insert({ name: catName })
            .select('id, name')
            .maybeSingle();
          if (newCat) categoryMap[newCat.name] = newCat.id;
        } catch {
          // ignore
        }
      }
    }

    // 2. Fetch existing products for this shop
    const { data: existingProds } = await supabaseAdmin
      .from('products')
      .select('id, name, sku, current_stock, opening_stock, sale_price, purchase_price, mrp')
      .eq('shop_id', shopId);

    const prodBySku: Record<string, any> = {};
    const prodByName: Record<string, any> = {};
    (existingProds || []).forEach((p: any) => {
      if (p.sku) prodBySku[p.sku] = p;
      if (p.name) prodByName[p.name.toLowerCase().trim()] = p;
    });

    // 3. For each of the 20 Master Franchise Products, insert or update
    for (const p of MASTER_PRODUCTS) {
      const catId = categoryMap[p.category] || categoryMap["General"] || null;
      const marginVal = p.sale_price - p.purchase_price;
      const marginPct = p.margin_percent || (p.sale_price > 0 ? (marginVal / p.sale_price) * 100 : 0);
      const stockQty = allocateStandardStock ? (p.default_stock || 0) : 0;

      const matchedProd = prodBySku[p.sku] || prodByName[p.name.toLowerCase().trim()];

      if (matchedProd) {
        if (allocateStandardStock) {
          await supabaseAdmin
            .from('products')
            .update({
              mrp: p.mrp,
              purchase_price: p.purchase_price,
              sale_price: p.sale_price,
              margin_value: marginVal,
              margin_percent: marginPct,
              current_stock: stockQty,
              opening_stock: stockQty,
              category_id: catId,
              image_url: p.image_url,
              unit: p.unit
            })
            .eq('id', matchedProd.id);
        }
      } else {
        await supabaseAdmin
          .from('products')
          .insert({
            shop_id: shopId,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode || null,
            mrp: p.mrp,
            purchase_price: p.purchase_price,
            sale_price: p.sale_price,
            margin_value: marginVal,
            margin_percent: marginPct,
            gst_rate: p.gst_rate,
            hsn_code: p.hsn_code,
            unit: p.unit,
            opening_stock: stockQty,
            current_stock: stockQty,
            reorder_level: p.reorder_level,
            category_id: catId,
            image_url: p.image_url
          });
      }
    }
  } catch (err) {
    console.error('Unexpected error in seedDefaultProducts:', err);
  }
}

// Get current user's profile and shop context safely from backend
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: No user found' });
    }

    // 1. Fetch Profile
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (pErr) throw pErr;

    // 2. Fetch User metadata from Auth
    let userMeta: any = {};
    let userEmail: string | null = null;
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      userMeta = authUser?.user?.user_metadata || {};
      userEmail = authUser?.user?.email || null;
    } catch (e) {
      console.warn("Could not get auth user metadata:", e);
    }

    const enrichedProfile = {
      ...(profile || { id: userId, role: 'shopkeeper' }),
      avatar_url: profile?.avatar_url || userMeta.avatar_url || null,
      full_name: profile?.full_name || userMeta.full_name || 'User',
      email: userEmail
    };

    // 3. Fetch Shop
    let shop = null;
    if (enrichedProfile.shop_id) {
      const { data: s } = await supabaseAdmin
        .from('shops')
        .select('*')
        .eq('id', enrichedProfile.shop_id)
        .maybeSingle();
      shop = s;

      if (shop) {
        // Automatically check and seed default products if this shop has 0 products
        await seedDefaultProducts(shop.id);
      }
    }

    return res.json({
      profile: enrichedProfile,
      shop
    });
  } catch (err: any) {
    console.error('Error in /me:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Sales summary, stock worth, margin, time breakdown & best-selling products rollup
router.get('/dashboard', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    let targetShopId = (req.query.shopId as string) || (role !== 'super_admin' ? req.user?.shop_id : null);

    // If non-admin and no shop context, error out
    if (role !== 'super_admin' && !targetShopId) {
      return res.status(400).json({ error: 'Shop context missing' });
    }

    // 1. Calculate Date Filters
    const period = (req.query.period as string) || 'all';
    let startDateObj: Date | null = null;
    let endDateObj: Date | null = null;
    const now = new Date();

    if (period === 'today') {
      startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'yesterday') {
      startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (period === 'this_week') {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'this_month') {
      startDateObj = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'last_month') {
      startDateObj = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    } else if (period === 'this_year') {
      startDateObj = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === 'last_year') {
      startDateObj = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    } else if (req.query.year || req.query.month || req.query.day) {
      const y = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
      if (req.query.month) {
        const m = parseInt(req.query.month as string, 10) - 1;
        if (req.query.day) {
          const d = parseInt(req.query.day as string, 10);
          startDateObj = new Date(y, m, d, 0, 0, 0, 0);
          endDateObj = new Date(y, m, d, 23, 59, 59, 999);
        } else {
          startDateObj = new Date(y, m, 1, 0, 0, 0, 0);
          endDateObj = new Date(y, m + 1, 0, 23, 59, 59, 999);
        }
      } else {
        startDateObj = new Date(y, 0, 1, 0, 0, 0, 0);
        endDateObj = new Date(y, 11, 31, 23, 59, 59, 999);
      }
    } else if (req.query.startDate) {
      startDateObj = new Date(req.query.startDate as string);
      if (req.query.endDate) {
        const end = new Date(req.query.endDate as string);
        end.setHours(23, 59, 59, 999);
        endDateObj = end;
      } else {
        endDateObj = new Date(startDateObj);
        endDateObj.setHours(23, 59, 59, 999);
      }
    }

    // 2. Fetch Invoices with items and products (filtered by date if applicable)
    let invQuery = supabaseAdmin
      .from('invoices')
      .select('*, customer:customers(id, name, phone), shop:shops(id, name, state, phone, gstin, address), items:invoice_items(*, product:products(id, name, image_url, purchase_price, sale_price, current_stock))')
      .order('created_at', { ascending: false });

    if (targetShopId) {
      invQuery = invQuery.eq('shop_id', targetShopId);
    }
    if (startDateObj) {
      invQuery = invQuery.gte('created_at', startDateObj.toISOString());
    }
    if (endDateObj) {
      invQuery = invQuery.lte('created_at', endDateObj.toISOString());
    }

    const { data: invoices, error: invErr } = await invQuery;
    if (invErr) throw invErr;

    // 3. Fetch Products (Products inventory represents current live catalog)
    let prodQuery = supabaseAdmin
      .from('products')
      .select('*, shop:shops(id, name, state)')
      .order('name', { ascending: true });

    if (targetShopId) {
      prodQuery = prodQuery.eq('shop_id', targetShopId);
    }

    const { data: products, error: prodErr } = await prodQuery;
    if (prodErr) throw prodErr;

    // 4. Compute Metrics
    let totalSales = 0;
    let totalCollected = 0;
    let outstanding = 0;
    let realizedMargin = 0;

    const productSalesMap: Record<string, {
      id: string;
      name: string;
      image_url: string | null;
      unitsSold: number;
      revenue: number;
      currentStock: number;
      marginEarned: number;
    }> = {};

    // Time-series breakdown buckets
    const timeTrendMap: Record<string, { label: string; revenue: number; margin: number; invoiceCount: number; dateKey: string }> = {};

    // Determine breakdown aggregation granularity
    let granularity: 'hourly' | 'daily' | 'monthly' = 'daily';
    if (period === 'today' || period === 'yesterday' || (startDateObj && endDateObj && (endDateObj.getTime() - startDateObj.getTime()) <= 86400000)) {
      granularity = 'hourly';
    } else if (period === 'this_year' || period === 'last_year' || (startDateObj && endDateObj && (endDateObj.getTime() - startDateObj.getTime()) > 65 * 86400000)) {
      granularity = 'monthly';
    }

    for (const inv of invoices || []) {
      const invTotal = Number(inv.total_amount || 0);
      const invPaid = Number(inv.paid_amount || 0);
      totalSales += invTotal;
      totalCollected += invPaid;
      outstanding += (invTotal - invPaid);

      let invoiceMargin = 0;

      for (const item of inv.items || []) {
        const qty = Number(item.quantity || 0);
        const unitPrice = Number(item.unit_price || 0);
        const lineTotal = Number(item.line_total || (qty * unitPrice));
        const costPrice = Number(item.product?.purchase_price || (unitPrice * 0.6)); // Fallback cost price
        const itemProfit = (unitPrice - costPrice) * qty;

        invoiceMargin += itemProfit;
        realizedMargin += itemProfit;

        const prodId = item.product_id || item.product_name || 'unknown';
        if (!productSalesMap[prodId]) {
          productSalesMap[prodId] = {
            id: item.product_id,
            name: item.product_name || item.product?.name || 'Unknown Product',
            image_url: item.product?.image_url || null,
            unitsSold: 0,
            revenue: 0,
            currentStock: Number(item.product?.current_stock || 0),
            marginEarned: 0
          };
        }
        productSalesMap[prodId].unitsSold += qty;
        productSalesMap[prodId].revenue += lineTotal;
        productSalesMap[prodId].marginEarned += itemProfit;
      }

      // Populate time trends
      const invDate = new Date(inv.created_at || inv.invoice_date || now);
      let bucketKey = '';
      let bucketLabel = '';

      if (granularity === 'hourly') {
        const hour = invDate.getHours();
        bucketKey = `${hour.toString().padStart(2, '0')}:00`;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        bucketLabel = `${displayHour} ${ampm}`;
      } else if (granularity === 'monthly') {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        bucketKey = `${invDate.getFullYear()}-${(invDate.getMonth() + 1).toString().padStart(2, '0')}`;
        bucketLabel = `${monthNames[invDate.getMonth()]} ${invDate.getFullYear()}`;
      } else {
        bucketKey = invDate.toISOString().slice(0, 10);
        bucketLabel = invDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      }

      if (!timeTrendMap[bucketKey]) {
        timeTrendMap[bucketKey] = {
          label: bucketLabel,
          revenue: 0,
          margin: 0,
          invoiceCount: 0,
          dateKey: bucketKey
        };
      }
      timeTrendMap[bucketKey].revenue += invTotal;
      timeTrendMap[bucketKey].margin += invoiceMargin;
      timeTrendMap[bucketKey].invoiceCount += 1;
    }

    // Convert time trend map to sorted list
    const timeTrends = Object.keys(timeTrendMap)
      .sort()
      .map(k => timeTrendMap[k]);

    // Stock value calculations on current inventory
    let totalStockValue = 0;
    let totalCostValue = 0;
    let totalUnitsInStock = 0;
    const outOfStockProducts: any[] = [];
    const lowStockProducts: any[] = [];

    for (const p of products || []) {
      const stock = Number(p.current_stock || 0);
      const sPrice = Number(p.sale_price || 0);
      const pPrice = Number(p.purchase_price || (sPrice * 0.6));
      const reorder = Number(p.reorder_level || 5);
      const sName = p.shop?.name || 'Shop Inventory';

      if (stock > 0) {
        totalUnitsInStock += stock;
        totalStockValue += (stock * sPrice);
        totalCostValue += (stock * pPrice);
      }

      if (stock <= 0) {
        outOfStockProducts.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          image_url: p.image_url,
          shop_id: p.shop_id,
          shopName: sName,
          current_stock: stock,
          reorder_level: reorder,
          sale_price: sPrice
        });
      } else if (stock <= reorder) {
        lowStockProducts.push({
          id: p.id,
          name: p.name,
          sku: p.sku,
          image_url: p.image_url,
          shop_id: p.shop_id,
          shopName: sName,
          current_stock: stock,
          reorder_level: reorder,
          sale_price: sPrice
        });
      }
    }

    const potentialStockMargin = totalStockValue - totalCostValue;
    const invoiceCount = invoices?.length || 0;
    const averageOrderValue = invoiceCount > 0 ? totalSales / invoiceCount : 0;
    const marginPercentage = totalSales > 0 ? (realizedMargin / totalSales) * 100 : 0;

    // Best Selling Products (Sorted by units sold and revenue)
    const allProductSales = Object.values(productSalesMap);
    const bestSellingProducts = [...allProductSales]
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, 10);

    // Recent Invoices for the period
    const recentInvoices = (invoices || []).slice(0, 10).map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      date: inv.invoice_date || inv.created_at,
      customerName: inv.customer?.name || 'Walk-in Customer',
      customerPhone: inv.customer?.phone || '',
      shopName: inv.shop?.name || 'PashuCentral Shop',
      total_amount: Number(inv.total_amount || 0),
      payment_mode: inv.payment_mode || 'cash',
      status: inv.status || 'paid'
    }));

    // If Super Admin viewing all shops overview (no specific shopId), build per-shop cards
    let shopsSummary: any[] = [];
    if (role === 'super_admin' && !targetShopId) {
      const { data: allShops } = await supabaseAdmin.from('shops').select('*').order('name');
      const { data: allProfiles } = await supabaseAdmin.from('profiles').select('*');

      shopsSummary = (allShops || []).map(s => {
        const shopInvoices = (invoices || []).filter(inv => inv.shop_id === s.id);
        const shopProducts = (products || []).filter(p => p.shop_id === s.id);

        const sRevenue = shopInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
        const sStockValue = shopProducts.reduce((sum, p) => sum + (Number(p.current_stock || 0) * Number(p.sale_price || 0)), 0);
        const sOwner = allProfiles?.find(p => p.shop_id === s.id && p.role === 'shopkeeper');

        return {
          id: s.id,
          name: s.name,
          state: s.state,
          phone: s.phone,
          gstin: s.gstin,
          address: s.address,
          totalRevenue: sRevenue,
          stockValue: sStockValue,
          invoiceCount: shopInvoices.length,
          productCount: shopProducts.length,
          ownerName: sOwner?.full_name || 'N/A'
        };
      });
    }

    // Target shop details if scoped to a specific shop
    let targetShop = null;
    if (targetShopId) {
      const { data: s } = await supabaseAdmin.from('shops').select('*').eq('id', targetShopId).single();
      targetShop = s;
    }

    return res.json({
      totalSales,
      totalCollected,
      outstanding,
      totalStockValue,
      totalCostValue,
      potentialStockMargin,
      realizedMargin,
      averageOrderValue,
      marginPercentage,
      totalUnitsInStock,
      outOfStockProducts,
      lowStockProducts,
      outOfStockCount: outOfStockProducts.length,
      lowStockCount: lowStockProducts.length,
      invoiceCount,
      productCount: products?.length || 0,
      bestSellingProducts,
      allProductSales,
      recentInvoices,
      timeTrends,
      granularity,
      shopsSummary,
      targetShop,
      filterInfo: {
        period,
        startDate: startDateObj ? startDateObj.toISOString() : null,
        endDate: endDateObj ? endDateObj.toISOString() : null
      },
      isSuperAdminOverview: role === 'super_admin' && !targetShopId
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Get all registered shops (Super Admin only) with full revenue, margin, stock & out-of-stock data
router.get('/admin/shops', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: super_admin role required' });
    }

    const { data: shops, error: sErr } = await supabaseAdmin.from('shops').select('*').order('name', { ascending: true });
    if (sErr) throw sErr;

    const { data: profiles, error: pErr } = await supabaseAdmin.from('profiles').select('*');
    if (pErr) throw pErr;

    const { data: franchises, error: fErr } = await supabaseAdmin.from('franchises').select('*');
    if (fErr) throw fErr;

    const { data: allProducts } = await supabaseAdmin
      .from('products')
      .select('id, shop_id, current_stock, sale_price, purchase_price, reorder_level');

    const { data: allInvoices } = await supabaseAdmin
      .from('invoices')
      .select('id, shop_id, total_amount');

    // Enrich shops with owner profile, franchise, stock summary, revenue, and approval status
    const enrichedShops = (shops || []).map(shop => {
      const shopOwner = profiles?.find(p => p.shop_id === shop.id && p.role === 'shopkeeper');
      const franchise = franchises?.find(f => f.id === shop.franchise_id);
      const shopProducts = (allProducts || []).filter(p => p.shop_id === shop.id);
      const shopInvoices = (allInvoices || []).filter(inv => inv.shop_id === shop.id);

      const totalRevenue = shopInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
      let totalUnitsInStock = 0;
      let totalStockValue = 0;
      let totalStockCost = 0;
      let outOfStockCount = 0;
      let lowStockCount = 0;

      for (const p of shopProducts) {
        const stock = Number(p.current_stock || 0);
        const sPrice = Number(p.sale_price || 0);
        const pPrice = Number(p.purchase_price || (sPrice * 0.6));
        const reorder = Number(p.reorder_level || 5);

        if (stock > 0) {
          totalUnitsInStock += stock;
          totalStockValue += (stock * sPrice);
          totalStockCost += (stock * pPrice);
          if (stock <= reorder) {
            lowStockCount++;
          }
        } else {
          outOfStockCount++;
        }
      }

      const totalPotentialMargin = totalStockValue - totalStockCost;
      const marginPercentage = totalStockValue > 0 ? (totalPotentialMargin / totalStockValue) * 100 : 0;

      // Status: if shop has status, use it; otherwise fallback to is_approved or 'approved'
      const status = shop.status || (shop.is_approved === false ? 'pending' : 'approved');

      return {
        ...shop,
        owner: shopOwner || null,
        franchise: franchise || null,
        totalRevenue,
        invoiceCount: shopInvoices.length,
        productCount: shopProducts.length,
        totalUnitsInStock,
        totalStockValue,
        totalStockCost,
        totalPotentialMargin,
        marginPercentage,
        outOfStockCount,
        lowStockCount,
        status
      };
    });

    return res.json(enrichedShops);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Toggle or Update Shop Approval Status
router.put('/admin/shops/:shopId/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: super_admin role required' });
    }

    const { shopId } = req.params;
    const { status = 'approved' } = req.body;

    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    // Try updating status column
    const { data: updated, error: uErr } = await supabaseAdmin
      .from('shops')
      .update({ status })
      .eq('id', shopId)
      .select()
      .maybeSingle();

    if (uErr) {
      // Fallback in case status column is not present
      const { data: fbUpdated, error: fbErr } = await supabaseAdmin
        .from('shops')
        .update({ is_approved: status === 'approved' })
        .eq('id', shopId)
        .select()
        .maybeSingle();

      if (fbErr) {
        if (status === 'approved') {
          await seedDefaultProducts(shopId, true);
        }
        return res.json({ success: true, message: `Shop approved and 944 standard inventory units allocated`, status });
      }
      if (status === 'approved') {
        await seedDefaultProducts(shopId, true);
      }
      return res.json({ success: true, shop: fbUpdated, status, message: `Shop approved and 944 standard inventory units allocated` });
    }

    // Automatically allocate standard stock (944 units) when admin approves shop
    if (status === 'approved') {
      await seedDefaultProducts(shopId, true);
    }

    return res.json({ 
      success: true, 
      shop: updated, 
      status, 
      message: status === 'approved' 
        ? "Shop approved and 944 standard franchise inventory units (₹3.00L value) allocated successfully!" 
        : "Shop status updated"
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Deploy or Re-sync standard franchise stock (20 products, 944 total units, ₹3,00,000 value) to a shop
router.post('/admin/shops/:shopId/deploy-standard-stock', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: super_admin role required' });
    }

    const { shopId } = req.params;
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    await seedDefaultProducts(shopId, true);

    return res.json({
      success: true,
      message: "Standard franchise inventory (20 products, 944 total units, ₹3,00,000 cost value) successfully allocated to this shop!"
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Directly Update Product Stock and Prices for a Shop
router.put('/admin/shops/:shopId/products/:productId/stock', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: super_admin role required' });
    }

    const { shopId, productId } = req.params;
    const { current_stock, sale_price, purchase_price, mrp } = req.body;

    if (current_stock === undefined && sale_price === undefined && purchase_price === undefined && mrp === undefined) {
      return res.status(400).json({ error: 'No update parameters provided' });
    }

    // Fetch existing product
    const { data: prod, error: pErr } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('shop_id', shopId)
      .single();

    if (pErr || !prod) {
      return res.status(404).json({ error: 'Product not found for this shop' });
    }

    const newStock = current_stock !== undefined ? Number(current_stock) : Number(prod.current_stock || 0);
    const newSalePrice = sale_price !== undefined ? Number(sale_price) : Number(prod.sale_price || 0);
    const newPurchasePrice = purchase_price !== undefined ? Number(purchase_price) : Number(prod.purchase_price || 0);
    const newMrp = mrp !== undefined ? Number(mrp) : Number(prod.mrp || newSalePrice);
    
    const newMarginVal = newSalePrice - newPurchasePrice;
    const newMarginPct = newSalePrice > 0 ? (newMarginVal / newSalePrice) * 100 : 0;

    const { data: updatedProduct, error: uErr } = await supabaseAdmin
      .from('products')
      .update({
        current_stock: newStock,
        sale_price: newSalePrice,
        purchase_price: newPurchasePrice,
        mrp: newMrp,
        margin_value: newMarginVal,
        margin_percent: newMarginPct
      })
      .eq('id', productId)
      .select()
      .single();

    if (uErr) throw uErr;

    // Record stock movement if stock quantity changed
    const prevStock = Number(prod.current_stock || 0);
    const diff = newStock - prevStock;
    if (diff !== 0) {
      try {
        await supabaseAdmin.from('stock_movements').insert({
          shop_id: shopId,
          product_id: productId,
          type: diff > 0 ? 'purchase' : 'adjustment',
          quantity: Math.abs(diff),
          balance_after: newStock,
          reference_id: crypto.randomUUID()
        });
      } catch (smErr) {
        console.warn('Failed to insert stock movement audit:', smErr);
      }
    }

    return res.json({ success: true, product: updatedProduct });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Delete a shop and ALL associated data (invoices, items, products, stock movements, customers, restock requests, etc.)
router.delete('/admin/shops/:shopId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: super_admin role required' });
    }

    const { shopId } = req.params;
    if (!shopId) {
      return res.status(400).json({ error: 'Shop ID is required' });
    }

    // 1. Verify shop exists
    const { data: targetShop, error: sErr } = await supabaseAdmin
      .from('shops')
      .select('id, name, franchise_id')
      .eq('id', shopId)
      .maybeSingle();

    if (sErr || !targetShop) {
      return res.status(404).json({ error: 'Shop not found' });
    }

    // 2. Cascade: Invoices & Invoice Items
    const { data: shopInvoices } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('shop_id', shopId);

    if (shopInvoices && shopInvoices.length > 0) {
      const invoiceIds = shopInvoices.map((inv: any) => inv.id);
      // Delete invoice items first
      await supabaseAdmin
        .from('invoice_items')
        .delete()
        .in('invoice_id', invoiceIds);

      // Delete invoices
      await supabaseAdmin
        .from('invoices')
        .delete()
        .eq('shop_id', shopId);
    }

    // 3. Cascade: Products & Stock Movements
    const { data: shopProducts } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('shop_id', shopId);

    if (shopProducts && shopProducts.length > 0) {
      const productIds = shopProducts.map((p: any) => p.id);
      // Delete stock movements first
      await supabaseAdmin
        .from('stock_movements')
        .delete()
        .in('product_id', productIds);

      // Delete products
      await supabaseAdmin
        .from('products')
        .delete()
        .eq('shop_id', shopId);
    }

    // 4. Cascade: Customers for this shop
    try {
      await supabaseAdmin
        .from('customers')
        .delete()
        .eq('shop_id', shopId);
    } catch (e) {
      console.error('Error deleting shop customers:', e);
    }

    // 5. Cascade: Categories for this shop (if any)
    try {
      await supabaseAdmin
        .from('categories')
        .delete()
        .eq('shop_id', shopId);
    } catch (e) {
      // Ignore if categories don't have shop_id
    }

    // 6. Cascade: Restock requests (from persistent JSON file & table)
    try {
      const DATA_DIR = path.join(process.cwd(), 'apps', 'api', 'data');
      const RESTOCK_FILE = path.join(DATA_DIR, 'restock_requests.json');
      if (fs.existsSync(RESTOCK_FILE)) {
        const content = fs.readFileSync(RESTOCK_FILE, 'utf8');
        const list = JSON.parse(content || '[]');
        const filtered = list.filter((r: any) => r.shopId !== shopId && r.shop_id !== shopId);
        fs.writeFileSync(RESTOCK_FILE, JSON.stringify(filtered, null, 2));
      }
    } catch (e) {
      console.error('Error cleaning restock requests file:', e);
    }

    try {
      await supabaseAdmin
        .from('restock_requests')
        .delete()
        .eq('shop_id', shopId);
    } catch (e) {
      // Table may or may not exist
    }

    // 7. Cascade: Profiles and User Accounts linked to this shop
    try {
      const { data: linkedProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, role')
        .eq('shop_id', shopId);

      if (linkedProfiles && linkedProfiles.length > 0) {
        for (const p of linkedProfiles) {
          if (p.role !== 'super_admin') {
            try {
              await supabaseAdmin.auth.admin.deleteUser(p.id);
            } catch (errAuth) {
              console.warn('Could not delete auth user:', p.id, errAuth);
            }
            try {
              await supabaseAdmin
                .from('profiles')
                .delete()
                .eq('id', p.id);
            } catch (errProf) {
              console.warn('Could not delete profile:', p.id, errProf);
            }
          } else {
            await supabaseAdmin
              .from('profiles')
              .update({ shop_id: null, franchise_id: null })
              .eq('id', p.id);
          }
        }
      }
    } catch (e) {
      console.error('Error cascading shop profiles and user accounts:', e);
    }

    // 8. Delete the Shop row
    const { error: delShopErr } = await supabaseAdmin
      .from('shops')
      .delete()
      .eq('id', shopId);

    if (delShopErr) {
      throw delShopErr;
    }

    // 9. If the franchise has no remaining shops, clean up franchise as well
    if (targetShop.franchise_id) {
      try {
        const { data: remainingShops } = await supabaseAdmin
          .from('shops')
          .select('id')
          .eq('franchise_id', targetShop.franchise_id);

        if (!remainingShops || remainingShops.length === 0) {
          await supabaseAdmin
            .from('franchises')
            .delete()
            .eq('id', targetShop.franchise_id);
        }
      } catch (e) {
        console.error('Error cleaning up empty franchise:', e);
      }
    }

    return res.json({
      success: true,
      message: `Shop "${targetShop.name}" and all associated invoices, products, stock, customers, and records have been permanently deleted.`
    });
  } catch (err: any) {
    console.error('Error deleting shop:', err);
    return res.status(500).json({ error: err.message || 'Failed to delete shop and its data' });
  }
});

// Admin: Sync Master Catalog to a shop or all shops
router.post('/admin/sync-master-catalog', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: super_admin role required' });
    }

    const { shopId, overrideStock } = req.body;

    let targetShopIds: string[] = [];
    if (shopId) {
      targetShopIds = [shopId];
    } else {
      const { data: allShops } = await supabaseAdmin.from('shops').select('id');
      targetShopIds = (allShops || []).map((s: any) => s.id);
    }

    if (targetShopIds.length === 0) {
      return res.status(400).json({ error: 'No shops found to sync' });
    }

    let totalCreated = 0;
    let totalUpdated = 0;

    for (const sid of targetShopIds) {
      // Fetch existing products for this shop
      const { data: existingProducts } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('shop_id', sid);

      for (const master of MASTER_PRODUCTS) {
        const marginVal = master.sale_price - master.purchase_price;
        const marginPct = master.sale_price > 0 ? (marginVal / master.sale_price) * 100 : 0;

        const match = existingProducts?.find((ep: any) => 
          (ep.sku && master.sku && ep.sku.trim().toLowerCase() === master.sku.trim().toLowerCase()) ||
          (ep.name && master.name && ep.name.trim().toLowerCase() === master.name.trim().toLowerCase()) ||
          (ep.barcode && master.barcode && ep.barcode.trim() === master.barcode.trim())
        );

        if (match) {
          // Update product details; if overrideStock specified, update current_stock
          const updatePayload: any = {
            name: master.name,
            mrp: master.mrp,
            purchase_price: master.purchase_price,
            sale_price: master.sale_price,
            margin_value: marginVal,
            margin_percent: marginPct,
            gst_rate: master.gst_rate,
            hsn_code: master.hsn_code,
            unit: master.unit,
            image_url: master.image_url
          };
          if (overrideStock !== undefined) {
            updatePayload.current_stock = overrideStock;
          }
          await supabaseAdmin.from('products').update(updatePayload).eq('id', match.id);
          totalUpdated++;
        } else {
          // Insert new product with stock 0 (or overrideStock)
          const newStock = overrideStock !== undefined ? overrideStock : 0;
          await supabaseAdmin.from('products').insert({
            shop_id: sid,
            name: master.name,
            sku: master.sku,
            barcode: master.barcode || null,
            mrp: master.mrp,
            purchase_price: master.purchase_price,
            sale_price: master.sale_price,
            margin_value: marginVal,
            margin_percent: marginPct,
            gst_rate: master.gst_rate,
            hsn_code: master.hsn_code,
            unit: master.unit,
            opening_stock: newStock,
            current_stock: newStock,
            reorder_level: master.reorder_level,
            image_url: master.image_url
          });
          totalCreated++;
        }
      }
    }

    return res.json({
      success: true,
      message: `Master Catalog synced: ${totalCreated} products created, ${totalUpdated} updated across ${targetShopIds.length} shops.`,
      totalCreated,
      totalUpdated
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Admin: Bulk Upsert products for a shop (from CSV upload)
router.post('/admin/bulk-upsert-products', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: super_admin role required' });
    }

    const { shopId, products } = req.body;
    if (!shopId || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Invalid request: shopId and products array required' });
    }

    const { data: existingProducts } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('shop_id', shopId);

    let createdCount = 0;
    let updatedCount = 0;

    for (const p of products) {
      const calcMrp = Number(p.mrp) || 0;
      const calcPurchase = Number(p.purchase_price) || 0;
      const calcSale = Number(p.sale_price) || 0;
      const marginVal = calcSale - calcPurchase;
      const marginPct = calcSale > 0 ? (marginVal / calcSale) * 100 : 0;
      const stockVal = Number(p.current_stock ?? p.opening_stock ?? p.stock) || 0;

      // Find match by SKU, Barcode, or Name
      const match = existingProducts?.find((ep: any) => 
        (p.sku && ep.sku && ep.sku.trim().toLowerCase() === p.sku.trim().toLowerCase()) ||
        (p.barcode && ep.barcode && ep.barcode.trim() === p.barcode.trim()) ||
        (p.name && ep.name && ep.name.trim().toLowerCase() === p.name.trim().toLowerCase())
      );

      if (match) {
        await supabaseAdmin.from('products').update({
          name: p.name || match.name,
          mrp: calcMrp,
          purchase_price: calcPurchase,
          sale_price: calcSale,
          margin_value: marginVal,
          margin_percent: marginPct,
          gst_rate: Number(p.gst_rate) || 0,
          hsn_code: p.hsn_code || null,
          unit: p.unit || match.unit || 'pcs',
          current_stock: stockVal,
          reorder_level: Number(p.reorder_level) || 5,
          image_url: p.image_url || match.image_url
        }).eq('id', match.id);
        updatedCount++;
      } else {
        let skuVal = p.sku;
        if (!skuVal) {
          skuVal = 'SKU-' + Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        await supabaseAdmin.from('products').insert({
          shop_id: shopId,
          name: p.name,
          sku: skuVal,
          barcode: p.barcode || null,
          mrp: calcMrp,
          purchase_price: calcPurchase,
          sale_price: calcSale,
          margin_value: marginVal,
          margin_percent: marginPct,
          gst_rate: Number(p.gst_rate) || 0,
          hsn_code: p.hsn_code || null,
          unit: p.unit || 'pcs',
          opening_stock: stockVal,
          current_stock: stockVal,
          reorder_level: Number(p.reorder_level) || 5,
          image_url: p.image_url || null
        });
        createdCount++;
      }
    }

    return res.json({
      success: true,
      message: `Successfully processed ${products.length} products: ${updatedCount} updated, ${createdCount} created.`,
      updatedCount,
      createdCount
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Public registration helper to store shop, franchise and profile under service role
router.post('/register-shop', async (req: Request, res: Response) => {
  try {
    const { userId, shopName, fullName, state, address, gstin, phone } = req.body;

    if (!userId || !shopName || !fullName) {
      return res.status(400).json({ error: 'Missing required registration fields' });
    }

    // 1. Insert Franchise
    const { data: franchise, error: fErr } = await supabaseAdmin
      .from('franchises')
      .insert({ name: shopName + ' Franchise', type: 'pashu_partner' })
      .select()
      .single();

    if (fErr) throw fErr;

    // 2. Insert Shop
    const { data: shop, error: sErr } = await supabaseAdmin
      .from('shops')
      .insert({
        franchise_id: franchise.id,
        name: shopName,
        state: state || 'Delhi',
        address: address || '',
        gstin: gstin || '',
        phone: phone || '',
        invoice_prefix: 'INV'
      })
      .select()
      .single();

    if (sErr) throw sErr;

    // 3. Upsert Profile
    const { error: pErr } = await supabaseAdmin.from('profiles').upsert({
      id: userId,
      full_name: fullName,
      phone: phone || '',
      role: 'shopkeeper',
      shop_id: shop.id,
      franchise_id: franchise.id
    });

    if (pErr) throw pErr;

    // 4. Automatically seed all 20 Master Catalog products with stock = 0 for this newly registered shop
    await seedDefaultProducts(shop.id);

    return res.json({ success: true, shopId: shop.id });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Update user profile details & avatar
router.put('/profile', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    const { full_name, phone, avatar_url } = req.body;

    let updatedProfile: any = null;

    // 1. Try updating with avatar_url in profiles table (if column exists)
    try {
      const updatePayload: any = {};
      if (full_name !== undefined) updatePayload.full_name = full_name;
      if (phone !== undefined) updatePayload.phone = phone;
      if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select()
        .single();

      if (!error && data) {
        updatedProfile = data;
      }
    } catch (e) {
      // Column might not exist yet; will fallback below
    }

    // 2. Fallback: Update only standard columns if avatar_url column is not yet in schema
    if (!updatedProfile) {
      const basicPayload: any = {};
      if (full_name !== undefined) basicPayload.full_name = full_name;
      if (phone !== undefined) basicPayload.phone = phone;

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(basicPayload)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error("Profile update error:", error);
      }
      updatedProfile = data || { id: userId, full_name, phone };
    }

    // 3. Only update auth user_metadata with light attributes (prevent token bloat)
    try {
      const metaToUpdate: any = {};
      if (full_name !== undefined) metaToUpdate.full_name = full_name;
      if (phone !== undefined) metaToUpdate.phone = phone;
      if (avatar_url !== undefined && !avatar_url.startsWith("data:")) {
        metaToUpdate.avatar_url = avatar_url;
      }
      if (Object.keys(metaToUpdate).length > 0) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: metaToUpdate
        });
      }
    } catch (authErr) {
      console.warn("Auth user_metadata update warning:", authErr);
    }

    return res.json({
      ...updatedProfile,
      avatar_url: avatar_url || updatedProfile?.avatar_url || null
    });
  } catch (err: any) {
    console.error("Profile route error:", err);
    return res.status(500).json({ error: err.message || "Failed to update profile" });
  }
});

// Update shop profile details & logo/storefront image
router.put('/update-shop', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const shopId = req.user?.shop_id || req.body.shopId;
    if (!shopId) {
      return res.status(400).json({ error: 'Shop context missing' });
    }

    const { name, state, address, gstin, phone, logo_url, image_url } = req.body;

    const updatePayload: any = {
      name,
      state: state || 'Delhi',
      address: address || '',
      gstin: gstin || '',
      phone: phone || ''
    };

    if (logo_url !== undefined) updatePayload.logo_url = logo_url;
    if (image_url !== undefined) updatePayload.image_url = image_url;

    let updatedShop: any = null;

    try {
      const { data, error: sErr } = await supabaseAdmin
        .from('shops')
        .update(updatePayload)
        .eq('id', shopId)
        .select()
        .single();

      if (!sErr && data) {
        updatedShop = data;
      }
    } catch (err) {
      // Fallback without image_url if not in schema
      delete updatePayload.image_url;
      const { data } = await supabaseAdmin
        .from('shops')
        .update(updatePayload)
        .eq('id', shopId)
        .select()
        .single();
      updatedShop = data;
    }

    return res.json(updatedShop || { id: shopId, ...updatePayload });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

