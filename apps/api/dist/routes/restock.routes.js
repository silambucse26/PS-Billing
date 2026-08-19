"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabaseAdmin_1 = require("../config/supabaseAdmin");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Persistent storage path for restock requests
const DATA_DIR = path_1.default.join(process.cwd(), 'apps', 'api', 'data');
const RESTOCK_FILE = path_1.default.join(DATA_DIR, 'restock_requests.json');
// Ensure data directory and file exist
if (!fs_1.default.existsSync(DATA_DIR)) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs_1.default.existsSync(RESTOCK_FILE)) {
    fs_1.default.writeFileSync(RESTOCK_FILE, JSON.stringify([]));
}
function getRestockRequests() {
    try {
        if (fs_1.default.existsSync(RESTOCK_FILE)) {
            const content = fs_1.default.readFileSync(RESTOCK_FILE, 'utf8');
            return JSON.parse(content || '[]');
        }
    }
    catch (e) {
        console.error('Error reading restock requests file:', e);
    }
    return [];
}
function saveRestockRequests(requests) {
    try {
        fs_1.default.writeFileSync(RESTOCK_FILE, JSON.stringify(requests, null, 2));
    }
    catch (e) {
        console.error('Error saving restock requests file:', e);
    }
}
// POST /api/restock — Create a restock request from a shop
router.post('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { items, paymentMode, notes, shopId: reqShopId } = req.body;
        const shopId = reqShopId || req.user?.shop_id;
        if (!shopId) {
            return res.status(400).json({ error: 'Shop context missing' });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Please select at least one product to restock' });
        }
        // Fetch shop details
        const { data: shop, error: sErr } = await supabaseAdmin_1.supabaseAdmin
            .from('shops')
            .select('*')
            .eq('id', shopId)
            .single();
        if (sErr || !shop) {
            return res.status(404).json({ error: 'Shop not found' });
        }
        const requests = getRestockRequests();
        const requestNum = `REQ-${String(requests.length + 1).padStart(5, '0')}`;
        let totalAmount = 0;
        const formattedItems = items.map((item) => {
            const qty = Number(item.quantity || 1);
            const unitCost = Number(item.unitPurchasePrice || item.purchase_price || item.unitPrice || 0);
            const lineTotal = qty * unitCost;
            totalAmount += lineTotal;
            return {
                productId: item.productId || item.id,
                productName: item.productName || item.name || 'Product',
                sku: item.sku || 'N/A',
                imageUrl: item.imageUrl || item.image_url || null,
                unit: item.unit || 'pcs',
                quantity: qty,
                unitPurchasePrice: unitCost,
                lineTotal
            };
        });
        const newRequest = {
            id: crypto_1.default.randomUUID(),
            requestNumber: requestNum,
            shopId: shop.id,
            shopName: shop.name,
            shopPhone: shop.phone || 'N/A',
            shopState: shop.state || 'N/A',
            shopAddress: shop.address || 'N/A',
            items: formattedItems,
            totalAmount,
            paymentMode: paymentMode || 'upi',
            notes: notes || '',
            status: 'pending', // 'pending' | 'approved' | 'rejected'
            requestedBy: req.user?.id,
            requesterEmail: req.user?.email,
            createdAt: new Date().toISOString(),
            approvedAt: null,
            rejectedAt: null,
            adminRemarks: null
        };
        requests.unshift(newRequest);
        saveRestockRequests(requests);
        return res.status(201).json(newRequest);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/restock — List restock requests (scoped by shop for non-admins)
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const role = req.user?.role;
        const shopId = req.user?.shop_id;
        let requests = getRestockRequests();
        // If not super_admin, filter only own shop requests
        if (role !== 'super_admin' && shopId) {
            requests = requests.filter(r => r.shopId === shopId);
        }
        return res.json(requests);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// PUT /api/restock/:id/status — Approve or reject restock request (Admin only)
router.put('/:id/status', auth_1.requireAuth, async (req, res) => {
    try {
        const role = req.user?.role;
        if (role !== 'super_admin') {
            return res.status(403).json({ error: 'Access denied: Admin role required' });
        }
        const { id } = req.params;
        const { status, adminRemarks } = req.body;
        if (!['approved', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        const requests = getRestockRequests();
        const requestIndex = requests.findIndex(r => r.id === id);
        if (requestIndex === -1) {
            return res.status(404).json({ error: 'Restock request not found' });
        }
        const request = requests[requestIndex];
        // If approving, increment the product stock in Supabase database & record stock movement!
        if (status === 'approved' && request.status !== 'approved') {
            for (const item of request.items) {
                if (!item.productId)
                    continue;
                // Fetch current product
                const { data: product } = await supabaseAdmin_1.supabaseAdmin
                    .from('products')
                    .select('id, current_stock, shop_id')
                    .eq('id', item.productId)
                    .single();
                if (product) {
                    const currentStock = Number(product.current_stock || 0);
                    const addQty = Number(item.quantity || 0);
                    const newStock = currentStock + addQty;
                    // 1. Update product stock in database
                    await supabaseAdmin_1.supabaseAdmin
                        .from('products')
                        .update({ current_stock: newStock })
                        .eq('id', product.id);
                    // 2. Insert stock movement record
                    try {
                        await supabaseAdmin_1.supabaseAdmin.from('stock_movements').insert({
                            shop_id: product.shop_id || request.shopId,
                            product_id: product.id,
                            type: 'purchase',
                            quantity: addQty,
                            balance_after: newStock,
                            reference_id: crypto_1.default.randomUUID()
                        });
                    }
                    catch (smErr) {
                        console.error('Error inserting stock movement:', smErr);
                    }
                }
            }
            request.approvedAt = new Date().toISOString();
        }
        else if (status === 'rejected') {
            request.rejectedAt = new Date().toISOString();
        }
        request.status = status;
        request.adminRemarks = adminRemarks || null;
        requests[requestIndex] = request;
        saveRestockRequests(requests);
        return res.json(request);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
