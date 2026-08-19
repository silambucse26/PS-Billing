"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInvoice = createInvoice;
const supabaseAdmin_1 = require("../config/supabaseAdmin");
const gst_1 = require("../utils/gst");
async function createInvoice(input) {
    const { data: shop, error: shopErr } = await supabaseAdmin_1.supabaseAdmin
        .from("shops")
        .select("invoice_prefix, next_invoice_number, state")
        .eq("id", input.shopId)
        .single();
    if (shopErr || !shop) {
        throw new Error("Shop not found or shop details inaccessible");
    }
    let customerState = shop.state;
    if (input.customerId) {
        const { data: customer } = await supabaseAdmin_1.supabaseAdmin
            .from("customers")
            .select("state")
            .eq("id", input.customerId)
            .single();
        if (customer && customer.state) {
            customerState = customer.state;
        }
    }
    const isInterState = shop.state.toLowerCase().trim() !== customerState.toLowerCase().trim();
    const invoiceNumber = `${shop.invoice_prefix}-${String(shop.next_invoice_number).padStart(5, "0")}`;
    const totals = (0, gst_1.computeTotals)(input.items, isInterState);
    const { data: invoiceId, error: txError } = await supabaseAdmin_1.supabaseAdmin.rpc("create_invoice_tx", {
        payload: {
            shop_id: input.shopId,
            customer_id: input.customerId,
            invoice_number: invoiceNumber,
            items: input.items,
            totals,
            payment_mode: input.paymentMode,
            paid_amount: input.paidAmount,
            created_by: input.createdBy
        }
    });
    if (txError) {
        throw new Error(`Transaction failed: ${txError.message}`);
    }
    await supabaseAdmin_1.supabaseAdmin
        .from("shops")
        .update({ next_invoice_number: shop.next_invoice_number + 1 })
        .eq("id", input.shopId);
    return { id: invoiceId, invoiceNumber };
}
