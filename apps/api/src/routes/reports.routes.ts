import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { supabaseAdmin } from '../config/supabaseAdmin';
import { MASTER_PRODUCTS } from '../config/masterCatalog';

const router = Router();

// Helper to seed default products for a shop if it has 0 products
async function seedDefaultProducts(shopId: string) {
  try {
    const { count, error: cErr } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('shop_id', shopId);

    if (cErr) {
      console.error('Error checking products count for seeding:', cErr);
      return;
    }

    if (count !== null && count > 0) {
      return; // Products already exist
    }

    // Fetch or create General category
    let categoryId: string | null = null;
    const { data: cat } = await supabaseAdmin
      .from('categories')
      .select('id')
      .eq('name', 'General')
      .maybeSingle();

    if (cat) {
      categoryId = cat.id;
    } else {
      const { data: newCat } = await supabaseAdmin
        .from('categories')
        .insert({ name: 'General' })
        .select('id')
        .single();
      if (newCat) {
        categoryId = newCat.id;
      }
    }

    const insertPayload = MASTER_PRODUCTS.map((p) => {
      const marginVal = p.sale_price - p.purchase_price;
      const marginPct = p.sale_price > 0 ? (marginVal / p.sale_price) * 100 : 0;
      return {
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
        opening_stock: 0,
        current_stock: 0,
        reorder_level: p.reorder_level,
        category_id: categoryId,
        image_url: p.image_url
      };
    });

    const { error: insErr } = await supabaseAdmin
      .from('products')
      .insert(insertPayload);

    if (insErr) {
      console.error('Error seeding default products:', insErr);
    }
  } catch (err) {
    console.error('Unexpected error seeding default products:', err);
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

// Get all registered shops (Super Admin only)
router.get('/admin/shops', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user?.role;
    if (role !== 'super_admin') {
      return res.status(403).json({ error: 'Access denied: super_admin role required' });
    }

    const { data: shops, error: sErr } = await supabaseAdmin.from('shops').select('*');
    if (sErr) throw sErr;

    const { data: profiles, error: pErr } = await supabaseAdmin.from('profiles').select('*');
    if (pErr) throw pErr;

    const { data: franchises, error: fErr } = await supabaseAdmin.from('franchises').select('*');
    if (fErr) throw fErr;

    // Enrich shops with owner profile and franchise
    const enrichedShops = shops.map(shop => {
      const shopOwner = profiles?.find(p => p.shop_id === shop.id && p.role === 'shopkeeper');
      const franchise = franchises?.find(f => f.id === shop.franchise_id);
      return {
        ...shop,
        owner: shopOwner || null,
        franchise: franchise || null
      };
    });

    return res.json(enrichedShops);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
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

