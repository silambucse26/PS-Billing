export interface CartItemInput {
  productId: string;
  qty: number;
  unitPrice: number;
  gstRate: number;
  discount?: number;
}

export function computeTotals(items: CartItemInput[], isInterState: boolean) {
  let subtotal = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let discountAmount = 0;

  for (const item of items) {
    const qty = item.qty || 0;
    const unitPrice = item.unitPrice || 0;
    const itemDiscount = item.discount || 0;
    
    // Selling price is inclusive of GST.
    const lineTotal = qty * unitPrice - itemDiscount;
    const base = lineTotal / (1 + (item.gstRate || 0) / 100);
    const tax = lineTotal - base;

    subtotal += base;
    discountAmount += itemDiscount;

    if (isInterState) {
      igstAmount += tax;
    } else {
      cgstAmount += tax / 2;
      sgstAmount += tax / 2;
    }
  }

  const totalBeforeRound = subtotal + cgstAmount + sgstAmount + igstAmount;
  const totalAmount = Math.round(totalBeforeRound);
  const roundOff = Number((totalAmount - totalBeforeRound).toFixed(2));

  return {
    subtotal,
    cgst_amount: cgstAmount,
    sgst_amount: sgstAmount,
    igst_amount: igstAmount,
    discount_amount: discountAmount,
    round_off: roundOff,
    total_amount: totalAmount
  };
}
