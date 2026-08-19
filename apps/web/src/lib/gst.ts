export interface CartLine {
  productId: string;
  name: string;
  hsnCode?: string;
  qty: number;
  unitPrice: number;
  gstRate: number;
  discount?: number;
  imageUrl?: string;
  unit?: string;
}

export function calcInvoiceTotals(lines: CartLine[], shopState: string, customerState: string) {
  const isInterState = shopState.toLowerCase().trim() !== customerState.toLowerCase().trim();

  let subtotal = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let discountAmount = 0;

  const items = lines.map((l) => {
    // Selling price is inclusive of GST.
    // Line total (with GST) = qty * unitPrice - discount.
    const lineTotal = l.qty * l.unitPrice - (l.discount ?? 0);
    // Base taxable value (without GST) = lineTotal / (1 + gstRate / 100)
    const lineBase = lineTotal / (1 + l.gstRate / 100);
    const taxAmount = lineTotal - lineBase;

    if (isInterState) {
      igst += taxAmount;
    } else {
      cgst += taxAmount / 2;
      sgst += taxAmount / 2;
    }

    subtotal += lineBase;
    discountAmount += (l.discount ?? 0);

    return { ...l, lineTotal: Number(lineTotal.toFixed(2)) };
  });

  const totalBeforeRound = subtotal + cgst + sgst + igst;
  const totalAmount = Math.round(totalBeforeRound);
  const roundOff = Number((totalAmount - totalBeforeRound).toFixed(2));

  return {
    items,
    subtotal,
    cgst,
    sgst,
    igst,
    discountAmount,
    roundOff,
    totalAmount,
    isInterState
  };
}
