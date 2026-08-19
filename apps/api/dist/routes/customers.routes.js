"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const supabaseAdmin_1 = require("../config/supabaseAdmin");
const router = (0, express_1.Router)();
// POST /api/customers — create or update a customer (prevents duplicate phone numbers per shop)
router.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const { name, phone, gstin, state, address, cattleCount, shopId: bodyShopId } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: "Customer name is required" });
        }
        const targetShopId = bodyShopId || req.user?.shop_id || null;
        // Deduplication by phone number per shop
        if (phone?.trim() && targetShopId) {
            const cleanPhone = phone.trim();
            const { data: existingCust } = await supabaseAdmin_1.supabaseAdmin
                .from("customers")
                .select("id, name, phone, gstin, state, address, credit_limit, shop_id")
                .eq("shop_id", targetShopId)
                .eq("phone", cleanPhone)
                .limit(1)
                .maybeSingle();
            if (existingCust) {
                // Update existing customer record with latest address / cattle count
                const { data: updated, error: uErr } = await supabaseAdmin_1.supabaseAdmin
                    .from("customers")
                    .update({
                    name: name.trim(),
                    gstin: gstin?.trim() || existingCust.gstin,
                    state: state?.trim() || existingCust.state,
                    address: address?.trim() || existingCust.address,
                    credit_limit: cattleCount !== undefined && cattleCount !== "" ? Number(cattleCount) : existingCust.credit_limit
                })
                    .eq("id", existingCust.id)
                    .select("id, name, phone, gstin, state, address, credit_limit, shop_id")
                    .single();
                if (!uErr && updated) {
                    return res.status(200).json({
                        ...updated,
                        cattleCount: Number(updated.credit_limit || 0)
                    });
                }
            }
        }
        const { data, error } = await supabaseAdmin_1.supabaseAdmin
            .from("customers")
            .insert({
            name: name.trim(),
            phone: phone?.trim() || null,
            gstin: gstin?.trim() || null,
            state: state?.trim() || null,
            address: address?.trim() || null,
            credit_limit: Number(cattleCount) || 0,
            shop_id: targetShopId
        })
            .select("id, name, phone, gstin, state, address, credit_limit, shop_id")
            .single();
        if (error)
            throw error;
        return res.status(201).json({
            ...data,
            cattleCount: Number(data.credit_limit || 0)
        });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
// GET /api/customers — list customers strictly isolated by shop (super_admin sees all)
router.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        const role = req.user?.role;
        const userShopId = req.user?.shop_id;
        const queryShopId = req.query.shopId;
        let query = supabaseAdmin_1.supabaseAdmin
            .from("customers")
            .select("*, shop:shops(id, name, state), invoices(id, total_amount, invoice_number, created_at, shop:shops(id, name))")
            .order("created_at", { ascending: false });
        // STRICT ISOLATION: Non-admins can ONLY query and see customers belonging to their own shop
        if (role !== "super_admin") {
            if (!userShopId) {
                return res.status(400).json({ error: "Shop context missing" });
            }
            query = query.eq("shop_id", userShopId);
        }
        else if (queryShopId) {
            // Super admin optional filtering by shop
            query = query.eq("shop_id", queryShopId);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        const mapped = (data || []).map((c) => ({
            ...c,
            cattleCount: Number(c.credit_limit || 0)
        }));
        return res.json(mapped);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
