"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePdf = generateInvoicePdf;
const pdf_lib_1 = require("pdf-lib");
const supabaseAdmin_1 = require("../config/supabaseAdmin");
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Color palette matching the reference design
const BLUE_NAVY = (0, pdf_lib_1.rgb)(0.06, 0.18, 0.45); // Deep navy for headers and titles
const BLUE_ACCENT = (0, pdf_lib_1.rgb)(0.12, 0.35, 0.78); // Bright royal blue for lines & badges
const BLUE_BG = (0, pdf_lib_1.rgb)(0.95, 0.97, 1.0); // Soft pastel blue for Sold By card
const BLUE_BORDER = (0, pdf_lib_1.rgb)(0.85, 0.90, 0.98); // Soft blue border
const GREEN_ACCENT = (0, pdf_lib_1.rgb)(0.10, 0.60, 0.25); // Green for Billed To & Paid
const GREEN_BG = (0, pdf_lib_1.rgb)(0.95, 0.99, 0.95); // Soft pastel green for Billed To
const GREEN_BORDER = (0, pdf_lib_1.rgb)(0.85, 0.94, 0.86);
const GRAY_BG = (0, pdf_lib_1.rgb)(0.97, 0.97, 0.98);
const GRAY_BORDER = (0, pdf_lib_1.rgb)(0.88, 0.89, 0.92);
const GRAY_TEXT = (0, pdf_lib_1.rgb)(0.38, 0.40, 0.45);
const BLACK = (0, pdf_lib_1.rgb)(0.08, 0.08, 0.10);
const WHITE = (0, pdf_lib_1.rgb)(1, 1, 1);
const YELLOW = (0, pdf_lib_1.rgb)(1, 0.90, 0.15); // Gold/yellow for total amount
function fetchImageBytes(url) {
    return new Promise((resolve) => {
        try {
            const client = url.startsWith("https") ? https_1.default : http_1.default;
            const req = client.get(url, { timeout: 4000 }, (res) => {
                if (res.statusCode !== 200) {
                    resolve(null);
                    return;
                }
                const chunks = [];
                res.on("data", (c) => chunks.push(c));
                res.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
                res.on("error", () => resolve(null));
            });
            req.on("error", () => resolve(null));
            req.on("timeout", () => { req.destroy(); resolve(null); });
        }
        catch {
            resolve(null);
        }
    });
}
async function generateInvoicePdf(invoiceId) {
    const { data: invoice, error: invError } = await supabaseAdmin_1.supabaseAdmin
        .from("invoices")
        .select("*, customer:customers(*), shop:shops(*), items:invoice_items(*, product:products(image_url))")
        .eq("id", invoiceId)
        .single();
    if (invError || !invoice)
        throw new Error("Invoice not found");
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // Standard A4 (595 x 842 pt)
    const W = 595;
    const H = 842;
    const ML = 32; // margin left
    const MR = 32; // margin right
    const CW = W - ML - MR; // 531 pt content width
    const font = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaBold);
    const obliqueFont = await pdfDoc.embedFont(pdf_lib_1.StandardFonts.HelveticaOblique);
    // Sanitize text for WinAnsi standard font encoding
    const safe = (s) => String(s ?? "").replace(/[\u20B9]/g, "Rs.").replace(/[\u2014\u2013]/g, "-")
        .replace(/[^\x00-\xFF]/g, "");
    const txt = (t, x, y, sz = 9, bold = false, col = BLACK) => {
        const s = safe(t);
        if (!s)
            return;
        page.drawText(s, { x, y, size: sz, font: bold ? boldFont : font, color: col });
    };
    const fillRect = (x, y, w, h, col) => {
        page.drawRectangle({ x, y, width: w, height: h, color: col });
    };
    const drawBorder = (x, y, w, h, borderCol, bgCol) => {
        page.drawRectangle({
            x, y, width: w, height: h,
            color: bgCol || WHITE,
            borderColor: borderCol,
            borderWidth: 1
        });
    };
    const hline = (y, x1 = ML, x2 = W - MR, thick = 0.5, col = GRAY_BORDER) => {
        page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: thick, color: col });
    };
    // ============================================================
    // 1. TOP HEADER (White Background, Clean Branded Alignment)
    // ============================================================
    const HDR_TOP = H - 32;
    // Left: Pashu Central Logo
    const logoCandidates = [
        path_1.default.join(__dirname, "../../..", "web", "public", "logo.png"),
        path_1.default.join(__dirname, "..", "..", "logo.png"),
        path_1.default.join(process.cwd(), "logo.png"),
        path_1.default.join(process.cwd(), "apps", "web", "public", "logo.png"),
        path_1.default.join(__dirname, "../../..", "web", "public", "logo.jpg"),
        path_1.default.join(__dirname, "..", "..", "logo.jpg"),
        path_1.default.join(process.cwd(), "logo.jpg"),
        path_1.default.join(process.cwd(), "apps", "web", "public", "logo.jpg"),
    ];
    const logoPath = logoCandidates.find(p => fs_1.default.existsSync(p)) || "";
    let logoDrawn = false;
    if (logoPath) {
        try {
            const logoBytes = new Uint8Array(fs_1.default.readFileSync(logoPath));
            const isPng = logoPath.endsWith(".png") || logoBytes[0] === 0x89;
            const logoImg = isPng
                ? await pdfDoc.embedPng(logoBytes).catch(() => null)
                : await pdfDoc.embedJpg(logoBytes).catch(() => null);
            if (logoImg) {
                const dims = logoImg.scaleToFit(230, 84);
                page.drawImage(logoImg, {
                    x: ML - 6,
                    y: HDR_TOP - dims.height,
                    width: dims.width,
                    height: dims.height
                });
                logoDrawn = true;
            }
        }
        catch { /* silent */ }
    }
    if (!logoDrawn) {
        txt("Pashu", ML, HDR_TOP - 22, 24, true, BLUE_NAVY);
        txt("Central", ML, HDR_TOP - 46, 20, true, BLUE_ACCENT);
    }
    // Right: Invoice Title & Metadata
    const META_X = 395;
    txt("GST TAX INVOICE", META_X, HDR_TOP - 16, 17, true, BLUE_NAVY);
    txt("Invoice No:", META_X, HDR_TOP - 34, 9, false, GRAY_TEXT);
    txt(safe(invoice.invoice_number), META_X + 54, HDR_TOP - 34, 9, true, BLACK);
    const invoiceDate = new Date(invoice.invoice_date || invoice.created_at)
        .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    txt("Date:", META_X, HDR_TOP - 48, 9, false, GRAY_TEXT);
    txt(invoiceDate, META_X + 28, HDR_TOP - 48, 9, false, BLACK);
    txt("Payment:", META_X, HDR_TOP - 62, 9, false, GRAY_TEXT);
    txt((invoice.payment_mode || "CASH").toUpperCase(), META_X + 46, HDR_TOP - 62, 9, true, BLACK);
    // Status Badge (Pill)
    const isPaid = (invoice.status || "paid").toLowerCase() === "paid";
    const badgeCol = isPaid ? GREEN_ACCENT : (0, pdf_lib_1.rgb)(0.85, 0.45, 0.1);
    const badgeText = isPaid ? "[PAID]" : "[UNPAID]";
    fillRect(META_X, HDR_TOP - 80, 48, 14, badgeCol);
    txt(badgeText, META_X + 5, HDR_TOP - 77, 8, true, WHITE);
    // Horizontal Accent Divider
    hline(HDR_TOP - 88, ML, W - MR, 1.5, BLUE_ACCENT);
    // ============================================================
    // 2. SOLD BY & BILLED TO (Two Distinct Styled Cards)
    // ============================================================
    const CARD_TOP = HDR_TOP - 100;
    const CARD_H = 100;
    const CARD_W = (CW - 14) / 2; // ~258 pt each
    const CARD1_X = ML;
    const CARD2_X = ML + CARD_W + 14;
    // --- SOLD BY CARD ---
    drawBorder(CARD1_X, CARD_TOP - CARD_H, CARD_W, CARD_H, BLUE_BORDER, BLUE_BG);
    // Blue badge circle
    page.drawCircle({
        x: CARD1_X + 22,
        y: CARD_TOP - 20,
        size: 11,
        color: BLUE_ACCENT
    });
    txt("S", CARD1_X + 18, CARD_TOP - 24, 9, true, WHITE);
    txt("SOLD BY", CARD1_X + 40, CARD_TOP - 16, 8, true, BLUE_ACCENT);
    txt(safe(invoice.shop?.name || "PashuCentral Shop").slice(0, 28), CARD1_X + 40, CARD_TOP - 28, 10, true, BLACK);
    // Details
    let sy = CARD_TOP - 46;
    const sLineH = 12.5;
    if (invoice.shop?.address) {
        const addrFirst = invoice.shop.address.split("\n")[0];
        txt(safe(addrFirst).slice(0, 38), CARD1_X + 16, sy, 8, false, GRAY_TEXT);
        sy -= sLineH;
    }
    txt(`GSTIN: ${safe(invoice.shop?.gstin || "N/A")}`, CARD1_X + 16, sy, 8, false, GRAY_TEXT);
    sy -= sLineH;
    if (invoice.shop?.state) {
        txt(`State: ${safe(invoice.shop.state)}`, CARD1_X + 16, sy, 8, false, GRAY_TEXT);
        sy -= sLineH;
    }
    if (invoice.shop?.phone) {
        txt(`Phone: ${safe(invoice.shop.phone)}`, CARD1_X + 16, sy, 8, false, GRAY_TEXT);
    }
    // --- BILLED TO CARD ---
    drawBorder(CARD2_X, CARD_TOP - CARD_H, CARD_W, CARD_H, GREEN_BORDER, GREEN_BG);
    // Green badge circle
    page.drawCircle({
        x: CARD2_X + 22,
        y: CARD_TOP - 20,
        size: 11,
        color: GREEN_ACCENT
    });
    txt("C", CARD2_X + 18, CARD_TOP - 24, 9, true, WHITE);
    txt("BILLED TO", CARD2_X + 40, CARD_TOP - 16, 8, true, GREEN_ACCENT);
    txt(safe(invoice.customer?.name || "Walk-in Customer").slice(0, 28), CARD2_X + 40, CARD_TOP - 28, 10, true, BLACK);
    // Details
    let cy = CARD_TOP - 46;
    txt(`Phone: ${safe(invoice.customer?.phone || "N/A")}`, CARD2_X + 16, cy, 8, false, GRAY_TEXT);
    cy -= sLineH;
    txt(`GSTIN: ${safe(invoice.customer?.gstin || "N/A")}`, CARD2_X + 16, cy, 8, false, GRAY_TEXT);
    cy -= sLineH;
    txt(`State: ${safe(invoice.customer?.state || invoice.shop?.state || "N/A")}`, CARD2_X + 16, cy, 8, false, GRAY_TEXT);
    // ============================================================
    // 3. PRODUCTS TABLE
    // ============================================================
    let y = CARD_TOP - CARD_H - 16;
    // Column positions
    const C_NUM = ML + 10; // #
    const C_IMG = ML + 30; // Image
    const C_NAME = ML + 68; // Product Name
    const C_HSN = 265; // HSN
    const C_QTY = 312; // Qty
    const C_RATE = 360; // Rate (Rs.)
    const C_GST = 425; // GST%
    const C_AMT = 475; // Amount (Rs.)
    // Table Header Bar (Navy Blue)
    const TH_H = 22;
    fillRect(ML, y - TH_H, CW, TH_H, BLUE_NAVY);
    const th = (t, x) => txt(t, x, y - TH_H + 7, 8, true, WHITE);
    th("#", C_NUM);
    th("PRODUCT", C_NAME);
    th("HSN", C_HSN);
    th("QTY", C_QTY);
    th("RATE (RS.)", C_RATE);
    th("GST%", C_GST);
    th("AMOUNT (RS.)", C_AMT);
    y -= TH_H;
    // Table Items
    const items = invoice.items || [];
    const ROW_H = 38;
    for (let i = 0; i < items.length; i++) {
        if (y - ROW_H < 170)
            break; // Overflow protection
        const item = items[i];
        // Row background (subtle light gray border)
        fillRect(ML, y - ROW_H, CW, ROW_H, WHITE);
        // Index #
        txt(String(i + 1), C_NUM, y - 22, 9, true, BLACK);
        // Product Thumbnail
        const imgUrl = item.product?.image_url;
        let imgOk = false;
        if (imgUrl) {
            try {
                const imgBytes = await fetchImageBytes(imgUrl);
                if (imgBytes && imgBytes.length > 10) {
                    const isPng = imgBytes[0] === 0x89;
                    const emb = isPng
                        ? await pdfDoc.embedPng(imgBytes).catch(() => null)
                        : await pdfDoc.embedJpg(imgBytes).catch(() => null);
                    if (emb) {
                        drawBorder(C_IMG, y - ROW_H + 5, 28, 28, GRAY_BORDER, WHITE);
                        page.drawImage(emb, { x: C_IMG + 2, y: y - ROW_H + 7, width: 24, height: 24 });
                        imgOk = true;
                    }
                }
            }
            catch { /* silent */ }
        }
        if (!imgOk) {
            drawBorder(C_IMG, y - ROW_H + 5, 28, 28, GRAY_BORDER, GRAY_BG);
            txt("IMG", C_IMG + 6, y - ROW_H + 16, 6, false, GRAY_TEXT);
        }
        // Product Name
        const pname = safe(item.product_name || "N/A");
        txt(pname.slice(0, 24), C_NAME, y - 18, 9, true, BLACK);
        if (pname.length > 24) {
            txt(pname.slice(24, 48), C_NAME, y - 29, 7.5, false, GRAY_TEXT);
        }
        // HSN
        txt(safe(item.hsn_code || "-"), C_HSN, y - 22, 8.5, false, GRAY_TEXT);
        // Qty
        txt(String(item.quantity), C_QTY, y - 22, 9, false, BLACK);
        // Rate (excl. or inclusive unit rate)
        txt(Number(item.unit_price).toFixed(2), C_RATE, y - 22, 9, false, BLACK);
        // GST%
        txt(`${item.gst_rate}%`, C_GST, y - 22, 9, false, BLACK);
        // Amount (Rs.)
        txt(Number(item.line_total).toFixed(2), C_AMT, y - 22, 9.5, true, BLACK);
        // Divider line under row
        hline(y - ROW_H, ML, W - MR, 0.5, GRAY_BORDER);
        y -= ROW_H;
    }
    // ============================================================
    // 4. TOTALS & SUMMARY SECTION (Aligned Bottom Right)
    // ============================================================
    y -= 12;
    const TL = 330; // Total labels left
    const VR = W - MR; // Total values right edge (563)
    const totLine = (label, val, bold = false) => {
        txt(label, TL, y, 9, bold, bold ? BLACK : GRAY_TEXT);
        const vw = (bold ? boldFont : font).widthOfTextAtSize(val, 9);
        txt(val, VR - vw, y, 9, bold, BLACK);
        y -= 15;
    };
    totLine("Subtotal (excl. GST):", `Rs.${Number(invoice.subtotal).toFixed(2)}`);
    if (Number(invoice.igst_amount) > 0) {
        totLine("IGST:", `Rs.${Number(invoice.igst_amount).toFixed(2)}`);
    }
    else {
        totLine("CGST:", `Rs.${Number(invoice.cgst_amount).toFixed(2)}`);
        totLine("SGST:", `Rs.${Number(invoice.sgst_amount).toFixed(2)}`);
    }
    if (Number(invoice.round_off) !== 0) {
        totLine("Round Off:", `Rs.${Number(invoice.round_off).toFixed(2)}`);
    }
    // Divider above Total bar
    hline(y + 8, TL, W - MR, 0.5, GRAY_BORDER);
    y -= 2;
    // --- TOTAL AMOUNT (Solid Navy Bar) ---
    const totBarW = W - MR - TL;
    fillRect(TL, y - 18, totBarW, 22, BLUE_NAVY);
    txt("TOTAL AMOUNT:", TL + 8, y - 12, 10, true, WHITE);
    const totalStr = `Rs.${Number(invoice.total_amount).toFixed(2)}`;
    const totalW = boldFont.widthOfTextAtSize(totalStr, 11);
    txt(totalStr, VR - totalW - 8, y - 12, 11, true, YELLOW);
    y -= 26;
    // --- PAID BADGE / CARD ---
    drawBorder(TL, y - 16, totBarW, 20, GREEN_BORDER, GREEN_BG);
    const paidStr = `[OK] Paid: Rs.${Number(invoice.paid_amount).toFixed(2)}`;
    txt(paidStr, TL + 8, y - 11, 9, true, GREEN_ACCENT);
    // ============================================================
    // 5. FOOTER (Elegant Centered Tagline)
    // ============================================================
    const FOOTER_Y = 32;
    const tagline = "Thank you for your business!";
    const tagW = obliqueFont.widthOfTextAtSize(tagline, 9);
    const tagX = (W - tagW) / 2;
    // Decorative side lines
    page.drawLine({
        start: { x: ML + 40, y: FOOTER_Y + 3 },
        end: { x: tagX - 15, y: FOOTER_Y + 3 },
        thickness: 0.8,
        color: BLUE_ACCENT
    });
    page.drawText(tagline, {
        x: tagX,
        y: FOOTER_Y,
        size: 9,
        font: obliqueFont,
        color: BLUE_NAVY
    });
    page.drawLine({
        start: { x: tagX + tagW + 15, y: FOOTER_Y + 3 },
        end: { x: W - MR - 40, y: FOOTER_Y + 3 },
        thickness: 0.8,
        color: BLUE_ACCENT
    });
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
}
