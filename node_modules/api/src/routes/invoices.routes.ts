import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { createInvoice } from "../services/invoice.service";
import { generateInvoicePdf } from "../services/pdf.service";
import { supabaseAdmin } from "../config/supabaseAdmin";

const router = Router();

// GET /api/invoices — list invoices (scoped by shop for non-admins)
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    let query = supabaseAdmin
      .from("invoices")
      .select("id, invoice_number, invoice_date, total_amount, paid_amount, subtotal, cgst_amount, sgst_amount, igst_amount, round_off, payment_mode, status, created_at, customer:customers(id, name, phone, gstin, state), shop:shops(id, name, state, phone)")
      .order("created_at", { ascending: false });

    // Non-admins only see their own shop's invoices
    if (req.user?.role !== "super_admin" && req.user?.shop_id) {
      query = query.eq("shop_id", req.user.shop_id);
    }

    const { data, error } = await query;
    if (error) throw error;
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});
router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
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

    const result = await createInvoice({
      shopId,
      customerId: customerId || null,
      items,
      paymentMode,
      paidAmount: paidAmount || 0,
      createdBy: userId
    });

    return res.status(201).json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get("/:id/pdf", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const pdfBuffer = await generateInvoicePdf(req.params.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${req.params.id}.pdf`);
    return res.send(pdfBuffer);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
