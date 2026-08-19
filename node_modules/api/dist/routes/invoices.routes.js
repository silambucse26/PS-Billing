"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const invoice_service_1 = require("../services/invoice.service");
const pdf_service_1 = require("../services/pdf.service");
const supabaseAdmin_1 = require("../config/supabaseAdmin");
const router = (0, express_1.Router)();
// GET /api/invoices — list invoices (scoped by shop for non-admins)
router.get("/", auth_1.requireAuth, async (req, res) => {
    try {
        let query = supabaseAdmin_1.supabaseAdmin
            .from("invoices")
            .select("id, invoice_number, invoice_date, total_amount, paid_amount, subtotal, cgst_amount, sgst_amount, igst_amount, round_off, payment_mode, status, created_at, customer:customers(id, name, phone, gstin, state), shop:shops(id, name, state, phone)")
            .order("created_at", { ascending: false });
        // Non-admins only see their own shop's invoices
        if (req.user?.role !== "super_admin" && req.user?.shop_id) {
            query = query.eq("shop_id", req.user.shop_id);
        }
        const { data, error } = await query;
        if (error)
            throw error;
        return res.json(data);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.post("/", auth_1.requireAuth, async (req, res) => {
    try {
        const { items, customerId, paymentMode, paidAmount } = req.body;
        const shopId = req.user?.shop_id;
        const userId = req.user?.id;
        if (!shopId) {
            return res.status(400).json({ error: "User does not belong to any shop" });
        }
        if (!userId) {
            return res.status(401).json({ error: "User context missing" });
        }
        const result = await (0, invoice_service_1.createInvoice)({
            shopId,
            customerId: customerId || null,
            items,
            paymentMode,
            paidAmount: paidAmount || 0,
            createdBy: userId
        });
        return res.status(201).json(result);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
router.get("/:id/pdf", auth_1.requireAuth, async (req, res) => {
    try {
        const pdfBuffer = await (0, pdf_service_1.generateInvoicePdf)(req.params.id);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=invoice-${req.params.id}.pdf`);
        return res.send(pdfBuffer);
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
