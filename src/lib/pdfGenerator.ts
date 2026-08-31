import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { parseInvoiceMetadata } from "./invoiceHelper";
import { formatDateDisplay } from "./dateUtils";

// Setup font paths dynamically using absolute path resolution
const fontRegularPath = path.resolve("src/assets/fonts/Roboto-Regular.ttf");
const fontBoldPath = path.resolve("src/assets/fonts/Roboto-Bold.ttf");

function registerAppFonts(doc: any) {
  doc.registerFont("Roboto-Regular", fontRegularPath);
  doc.registerFont("Roboto-Bold", fontBoldPath);
  doc.font("Roboto-Regular"); // Set default
}

export function generateInvoicePDF(invoiceData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      // TCE Logo Left
      let logoLoaded = false;
      try {
        let logoPath = path.resolve("LOGO.png");
        if (!fs.existsSync(logoPath)) {
          logoPath = path.resolve("public/logo.png");
        }
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 40, { width: 70 });
          logoLoaded = true;
        }
      } catch (e) {
        console.error("Error loading logo image:", e);
      }

      if (!logoLoaded) {
        doc.save();
        doc.fillColor("#F28C28");
        doc.moveTo(60, 45)
           .bezierCurveTo(45, 55, 45, 75, 60, 85)
           .bezierCurveTo(63, 81, 63, 79, 60, 75)
           .bezierCurveTo(52, 69, 52, 61, 60, 55)
           .bezierCurveTo(63, 51, 63, 49, 60, 45)
           .closePath()
           .fill();
         
        doc.moveTo(100, 45)
           .bezierCurveTo(115, 55, 115, 75, 100, 85)
           .bezierCurveTo(97, 81, 97, 79, 100, 75)
           .bezierCurveTo(108, 69, 108, 61, 100, 55)
           .bezierCurveTo(97, 51, 97, 49, 100, 45)
           .closePath()
           .fill();

        doc.font("Roboto-Bold").fontSize(22).fillColor("#3A1984");
        doc.text("TCE", 60, 57, { width: 40, align: "center" });
        doc.restore();
      }

      // Right Side Header (Official TCE Letterhead)
      doc.font("Roboto-Bold").fontSize(22).fillColor("#3A1984").text("Technicool Engineering", 130, 38);
      doc.font("Roboto-Bold").fontSize(8).fillColor("#1f2937").text("MAKE YOUR DESIRE CLIMATE", 130, 64, { align: "left", width: 420 });

      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#374151");
      doc.text("Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.", 130, 76, { width: 420 });
      doc.text("NTN: G535752  |  STRN: 3277876376780  |  Web: www.technicool.com.pk  |  Mobile: 03218304978", 130, 87, { width: 420 });

      // Title Banner
      doc.rect(50, 102, 500, 20).fill("#1e293b"); // dark slate header
      doc.font("Roboto-Bold").fontSize(11).fillColor("#ffffff").text("BILLING INVOICE", 50, 107, { align: "center", width: 500 });

      // Info metadata block
      doc.font("Roboto-Bold").fontSize(13).fillColor("#1f2937").text(`INVOICE: ${invoiceData.invoiceNumber}`, 50, 130);
      doc.font("Roboto-Regular").fontSize(9.5).fillColor("#4b5563");
      const meta = parseInvoiceMetadata(invoiceData.notes, invoiceData);
      const siteVal = (meta.site || invoiceData.site || invoiceData.deliveryOrder?.deliveryAddress || "").trim();
      let leftY = 148;
      doc.text(`Date: ${formatDateDisplay(invoiceData.date, "en-GB")}`, 50, leftY);
      leftY += 14;
      doc.text(`Client Name: ${invoiceData.clientName}`, 50, leftY);
      leftY += 14;
      const custAddr = invoiceData.customer?.address || invoiceData.clientAddress;
      if (custAddr) {
        doc.text(`Customer Address: ${custAddr}`, 50, leftY, { width: 280 });
        leftY += 14;
      }
      if (invoiceData.clientPhone) {
        doc.text(`Client Phone: ${invoiceData.clientPhone}`, 50, leftY);
        leftY += 14;
      }
      if (siteVal) {
        doc.text(`Delivery / Site Address: ${siteVal}`, 50, leftY, { width: 280 });
        leftY += 18;
      }

      if (invoiceData.deliveryOrder) {
        doc.text(`Ref Delivery Order: ${invoiceData.deliveryOrder.doNumber}`, 340, 148);
      }
      if (invoiceData.complaint) {
        doc.text(`Ref Support Ticket: ${invoiceData.complaint.complaintNumber}`, 340, 162);
      }
      doc.text(`NTN: G535752  |  STRN: 3277876376780`, 340, 176);

      // Subject Block
      let y = Math.max(220, leftY + 12);
      if (invoiceData.subjectHeading) {
        doc.font("Roboto-Bold").fontSize(11).fillColor("#1f2937").text(`Subject: ${invoiceData.subjectHeading}`, 50, y);
        y += 15;
        if (invoiceData.subjectDescription) {
          doc.font("Roboto-Regular").fontSize(9).fillColor("#4b5563").text(invoiceData.subjectDescription, 50, y, { width: 500 });
          const textHeight = doc.heightOfString(invoiceData.subjectDescription, { width: 500 });
          y += textHeight + 15;
        } else {
          y += 15;
        }
      }

      // Table columns header
      doc.font("Roboto-Bold").fontSize(10).fillColor("#1e3a8a");
      doc.text("Description", 50, y);
      doc.text("Qty", 300, y, { width: 50, align: "right" });
      doc.text("Price (PKR)", 380, y, { width: 80, align: "right" });
      doc.text("Total (PKR)", 475, y, { width: 75, align: "right" });

      // Table line
      doc.moveTo(50, y + 15).lineTo(550, y + 15).strokeColor("#1e3a8a").stroke();
      y += 25;

      doc.font("Roboto-Regular").fillColor("#1f2937");
      invoiceData.lineItems.forEach((item: any) => {
        const desc = item.product ? `[${item.product.sku}] ${item.product.name}` : (item.description || "Service Item");
        
        doc.fontSize(10).text(desc, 50, y, { width: 240 });
        doc.text(String(item.quantity), 300, y, { width: 50, align: "right" });
        doc.text(Math.round(Number(item.salesPrice)).toLocaleString("en-US"), 380, y, { width: 80, align: "right" });
        const lineTotal = Math.round(item.quantity * Number(item.salesPrice));
        doc.text(lineTotal.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });
        
        y += 20;

        if (item.extraFields) {
          try {
            const fields = typeof item.extraFields === "string" ? JSON.parse(item.extraFields) : item.extraFields;
            if (fields && Object.keys(fields).length > 0) {
              Object.entries(fields).forEach(([key, val]) => {
                if (key === "unit") return;
                doc.fontSize(8).fillColor("#6b7280").text(`  • ${key}: ${val}`, 60, y);
                y += 12;
              });
              doc.fillColor("#1f2937");
            }
          } catch (e) {}
        }
      });

      // Bottom Totals Line
      doc.moveTo(50, y + 5).lineTo(550, y + 5).strokeColor("#e5e7eb").stroke();
      y += 20;

      // const meta is already parsed above
      const subtotal = meta.subtotalAmount;
      const discountAmount = meta.discountAmount;
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = meta.taxAmount;
      const computedTaxRate = meta.taxRate;
      const totalAmount = meta.totalAmount;
      const amountPaid = Math.round(Number(invoiceData.amountPaid || 0));
      const balance = Math.round(totalAmount - amountPaid);

      // Print Totals
      doc.fontSize(10).fillColor("#4b5563");
      doc.text("Subtotal:", 320, y, { width: 140, align: "right" });
      doc.text(subtotal.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });

      if (discountAmount > 0) {
        y += 18;
        doc.fillColor("#b91c1c").text(`Discount (${meta.discountType === "PERCENTAGE" ? `${meta.discountPercent}%` : "Flat"}):`, 320, y, { width: 140, align: "right" });
        doc.text(`-${discountAmount.toLocaleString("en-US")}`, 475, y, { width: 75, align: "right" });
        doc.fillColor("#4b5563");
      }

      if (taxAmount > 0) {
        y += 18;
        doc.text(`Sales Tax (${computedTaxRate}%):`, 320, y, { width: 140, align: "right" });
        doc.text(taxAmount.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });
      }

      y += 18;
      doc.font("Roboto-Bold").fontSize(10).fillColor("#1f2937");
      doc.text("Total Invoice Amount:", 320, y, { width: 140, align: "right" });
      doc.text(totalAmount.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });

      if (amountPaid > 0) {
        y += 18;
        doc.font("Roboto-Regular").fontSize(10).fillColor("#4b5563");
        doc.text("Received Payment:", 320, y, { width: 140, align: "right" });
        doc.text(amountPaid.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });

        y += 18;
        doc.font("Roboto-Bold").fontSize(11).fillColor("#b91c1c").text("Balance Due (PKR):", 320, y, { width: 140, align: "right" });
        doc.text(balance.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });
      }

      if (meta.userNotes) {
        y += 30;
        doc.font("Roboto-Bold").fontSize(10).fillColor("#1f2937").text("Notes:", 50, y);
        y += 15;
        doc.font("Roboto-Regular").fontSize(9).fillColor("#4b5563").text(meta.userNotes, 50, y, { width: 500 });
      }

      // Footer notice
      doc.font("Roboto-Regular").fontSize(8).fillColor("#9ca3af").text("Generated automatically from the HVAC ERP general ledger. System source of truth.", 50, 720, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateDeliveryOrderPDF(doData: any, baseUrlOverride?: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      // TCE Logo Left
      let logoLoaded = false;
      try {
        let logoPath = path.resolve("LOGO.png");
        if (!fs.existsSync(logoPath)) {
          logoPath = path.resolve("public/logo.png");
        }
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 40, { width: 70 });
          logoLoaded = true;
        }
      } catch (e) {
        console.error("Error loading logo image:", e);
      }

      if (!logoLoaded) {
        doc.save();
        doc.fillColor("#F28C28");
        doc.moveTo(60, 45)
           .bezierCurveTo(45, 55, 45, 75, 60, 85)
           .bezierCurveTo(63, 81, 63, 79, 60, 75)
           .bezierCurveTo(52, 69, 52, 61, 60, 55)
           .bezierCurveTo(63, 51, 63, 49, 60, 45)
           .closePath()
           .fill();
         
        doc.moveTo(100, 45)
           .bezierCurveTo(115, 55, 115, 75, 100, 85)
           .bezierCurveTo(97, 81, 97, 79, 100, 75)
           .bezierCurveTo(108, 69, 108, 61, 100, 55)
           .bezierCurveTo(97, 51, 97, 49, 100, 45)
           .closePath()
           .fill();

        doc.font("Roboto-Bold").fontSize(22).fillColor("#3A1984");
        doc.text("TCE", 60, 57, { width: 40, align: "center" });
        doc.restore();
      }

      // Right Side Header (Official TCE Letterhead)
      doc.font("Roboto-Bold").fontSize(22).fillColor("#3A1984").text("Technicool Engineering", 130, 38);
      doc.font("Roboto-Bold").fontSize(8).fillColor("#1f2937").text("MAKE YOUR DESIRE CLIMATE", 130, 64, { align: "left", width: 420 });

      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#374151");
      doc.text("Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.", 130, 76, { width: 420 });
      doc.text("NTN: G535752  |  STRN: 3277876376780  |  Web: www.technicool.com.pk  |  Mobile: 03218304978", 130, 87, { width: 420 });

      // Title Banner
      doc.rect(50, 102, 500, 20).fill("#065f46"); // emerald header
      doc.font("Roboto-Bold").fontSize(11).fillColor("#ffffff").text("DELIVERY ORDER / DISPATCH CHALLAN", 50, 107, { align: "center", width: 500 });

      // Info metadata block
      doc.font("Roboto-Bold").fontSize(13).fillColor("#1f2937").text(`DO NUMBER: ${doData.doNumber}`, 50, 130);
      doc.font("Roboto-Regular").fontSize(9.5).fillColor("#4b5563");
      let leftY = 148;
      doc.text(`Date: ${formatDateDisplay(doData.date, "en-GB")}`, 50, leftY);
      leftY += 14;
      doc.text(`Client Name: ${doData.clientName}`, 50, leftY);
      leftY += 14;
      const doCustAddr = doData.customer?.address || doData.clientAddress;
      if (doCustAddr) {
        doc.text(`Customer Address: ${doCustAddr}`, 50, leftY, { width: 280 });
        leftY += 14;
      }
      if (doData.clientPhone) {
        doc.text(`Client Phone: ${doData.clientPhone}`, 50, leftY);
        leftY += 14;
      }
      if (doData.deliveryAddress) {
        doc.text(`Delivery Address: ${doData.deliveryAddress}`, 50, leftY, { width: 280 });
        leftY += 18;
      }

      doc.text(`DO Status: ${doData.status}`, 340, 148);
      if (doData.poNumber) {
        doc.text(`Ref PO Number: ${doData.poNumber}`, 340, 162);
      }
      if (doData.vehicle) {
        doc.text(`Vehicle / Transport: ${doData.vehicle}`, 340, 176);
      }

      // Generate and embed QR code
      try {
        const rawHost = baseUrlOverride || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "";
        let baseUrl = rawHost ? (rawHost.startsWith("http") ? rawHost : `https://${rawHost}`) : "";
        if (!baseUrl && typeof window !== "undefined") {
          baseUrl = window.location.origin;
        }
        const confirmUrl = baseUrl ? `${baseUrl}/delivery/confirm/${doData.id}` : `/delivery/confirm/${doData.id}`;
        
        const qrBuffer = await QRCode.toBuffer(confirmUrl, {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 75,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        doc.image(qrBuffer, 470, 130, { width: 68 });
        doc.fontSize(6.5).fillColor("#6b7280").text("Scan to Confirm Receipt", 450, 202, { width: 105, align: "center" });
      } catch (qrErr) {
        console.warn("Could not embed QR code on DO PDF", qrErr);
      }

      let y = 230;
      let notesText = doData.notes || "";
      if (doData.invoices && doData.invoices.length > 0) {
        const invNotes = doData.invoices.map((inv: any) => inv.notes).filter(Boolean).join("\n");
        if (invNotes) {
          notesText = notesText ? `${notesText}\nInvoice Notes:\n${invNotes}` : invNotes;
        }
      }
      if (notesText) {
        doc.fontSize(10).fillColor("#4b5563").text(`Driver/Notes: ${notesText}`, 50, 200, { width: 500 });
        const notesHeight = doc.heightOfString(`Driver/Notes: ${notesText}`, { width: 500 });
        y = 200 + notesHeight + 20;
      }

      doc.font("Roboto-Bold").fontSize(10).fillColor("#047857");
      doc.text("Catalog/Service Description", 50, y);
      doc.text("Quantity Out", 450, y, { width: 100, align: "right" });

      doc.moveTo(50, y + 15).lineTo(550, y + 15).strokeColor("#047857").stroke();
      y += 25;

      doc.font("Roboto-Regular").fillColor("#1f2937");
      doData.lineItems.forEach((item: any) => {
        const desc = item.product ? `[${item.product.sku}] ${item.product.name}` : (item.description || "Custom Service");
        doc.fontSize(10).text(desc, 50, y, { width: 380 });
        doc.text(String(item.quantity), 450, y, { width: 100, align: "right" });
        y += 20;

        if (item.extraFields) {
          try {
            const fields = typeof item.extraFields === "string" ? JSON.parse(item.extraFields) : item.extraFields;
            if (fields && Object.keys(fields).length > 0) {
              Object.entries(fields).forEach(([key, val]) => {
                if (key === "unit") return;
                doc.fontSize(8).fillColor("#6b7280").text(`  • ${key}: ${val}`, 60, y);
                y += 12;
              });
              doc.fillColor("#1f2937");
            }
          } catch (e) {}
        }
      });

      doc.moveTo(50, y + 5).lineTo(550, y + 5).strokeColor("#e5e7eb").stroke();
      y += 30;

      // Customer acknowledgment area
      doc.fontSize(10).text("Signatures:", 50, y);
      doc.fontSize(9).text("Dispatched By: ___________________", 50, y + 40);
      doc.text("Customer Signature: ___________________", 350, y + 40);

      doc.fontSize(8).fillColor("#9ca3af").text("All catalog items stock levels are decremented upon Dispatch.", 50, 720, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generatePayslipPDF(payslipData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margins: { top: 40, bottom: 30, left: 50, right: 50 }, font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      // TCE Logo Left
      let logoLoaded = false;
      try {
        let logoPath = path.resolve("LOGO.png");
        if (!fs.existsSync(logoPath)) {
          logoPath = path.resolve("public/logo.png");
        }
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 42, { width: 75 });
          logoLoaded = true;
        }
      } catch (e) {
        console.error("Error loading logo image:", e);
      }

      if (!logoLoaded) {
        doc.save();
        doc.fillColor("#F28C28");
        doc.moveTo(60, 45)
           .bezierCurveTo(45, 55, 45, 75, 60, 85)
           .bezierCurveTo(63, 81, 63, 79, 60, 75)
           .bezierCurveTo(52, 69, 52, 61, 60, 55)
           .bezierCurveTo(63, 51, 63, 49, 60, 45)
           .closePath()
           .fill();
         
        doc.moveTo(100, 45)
           .bezierCurveTo(115, 55, 115, 75, 100, 85)
           .bezierCurveTo(97, 81, 97, 79, 100, 75)
           .bezierCurveTo(108, 69, 108, 61, 100, 55)
           .bezierCurveTo(97, 51, 97, 49, 100, 45)
           .closePath()
           .fill();

        doc.font("Roboto-Bold").fontSize(22).fillColor("#3A1984");
        doc.text("TCE", 60, 57, { width: 40, align: "center" });
        doc.restore();
      }

      // Right Side Header
      doc.font("Roboto-Bold").fontSize(24).fillColor("#3A1984").text("Technicool Engineering", 130, 48);
      doc.font("Roboto-Regular").fontSize(8).fillColor("#1f2937").text("MAKE YOUR DESIRE CLIMATE", 130, 75, { align: "right", width: 420 });

      // Title Banner
      doc.rect(50, 95, 500, 20).fill("#4b5563"); // slate gray
      doc.font("Roboto-Bold").fontSize(11).fillColor("#ffffff").text("SALARY PAYSLIP RECEIPT", 50, 100, { align: "center", width: 500 });

      doc.font("Roboto-Bold").fontSize(13).fillColor("#1f2937").text(`PAYSLIP RECORD: ${payslipData.month}/${payslipData.year}`, 50, 125);
      doc.font("Roboto-Regular").fontSize(10).fillColor("#4b5563");
      doc.text(`Employee Name: ${payslipData.employee.name}${payslipData.employee.employeeNo ? ` (${payslipData.employee.employeeNo})` : ""}`, 50, 145);
      doc.text(`CNIC/ID: ${payslipData.employee.cnic}`, 50, 160);
      doc.text(`Department: ${payslipData.employee.department}`, 50, 175);
      doc.text(`Position: ${payslipData.employee.position}`, 50, 190);

      doc.text(`Bank Account: ${payslipData.employee.bankDetails}`, 350, 145);
      doc.text(`Payroll Status: ${payslipData.status}`, 350, 160);
      if (payslipData.paymentDate) {
        doc.text(`Payment Date: ${new Date(payslipData.paymentDate).toLocaleDateString()}`, 350, 175);
      }

      let y = 220;
      doc.font("Roboto-Bold").fontSize(11).fillColor("#111827");
      doc.text("Earnings & Allowances", 50, y);
      doc.text("Deductions & Adjustments", 320, y);

      doc.moveTo(50, y + 15).lineTo(550, y + 15).strokeColor("#9ca3af").stroke();
      y += 25;

      doc.font("Roboto-Regular").fontSize(10).fillColor("#374151");
      // Earnings Column
      doc.text("Base Salary:", 50, y);
      doc.text(Math.round(Number(payslipData.baseSalary)).toLocaleString("en-US"), 200, y, { align: "right" });
      
      doc.text("Allowances:", 50, y + 20);
      doc.text(Math.round(Number(payslipData.allowances)).toLocaleString("en-US"), 200, y + 20, { align: "right" });

      // Deductions Column
      doc.text("Total Deductions:", 320, y);
      doc.text(Math.round(Number(payslipData.deductions)).toLocaleString("en-US"), 470, y, { align: "right" });

      y += 60;
      doc.moveTo(50, y).lineTo(550, y).strokeColor("#e5e7eb").stroke();
      y += 15;

      doc.font("Roboto-Bold").fontSize(12).fillColor("#111827");
      doc.text("Net Take-Home Pay (PKR):", 200, y);
      doc.fontSize(13).fillColor("#1e3a8a").text(Math.round(Number(payslipData.netPay)).toLocaleString("en-US"), 400, y, { align: "right" });

      // Universal TCE Footer
      doc.moveTo(50, 715).lineTo(550, 715).strokeColor("#000000").lineWidth(0.5).stroke();
      doc.font("Roboto-Regular").fontSize(8).fillColor("#4b5563");
      doc.text("Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.", 50, 722, { align: "center", width: 500 });
      doc.text("Web: www.technicool.com.pk   |   Email: services@technicool.com.pk", 50, 734, { align: "center", width: 500 });
doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateComplaintPDF(complaintData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margins: { top: 35, bottom: 30, left: 50, right: 50 }, size: "A4", font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      // TCE Logo Left
      let logoLoaded = false;
      try {
        let logoPath = path.resolve("LOGO.png");
        if (!fs.existsSync(logoPath)) {
          logoPath = path.resolve("public/logo.png");
        }
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 40, { width: 70 });
          logoLoaded = true;
        }
      } catch (e) {
        console.error("Error loading logo image:", e);
      }

      if (!logoLoaded) {
        doc.save();
        doc.fillColor("#F28C28");
        doc.moveTo(60, 45)
           .bezierCurveTo(45, 55, 45, 75, 60, 85)
           .bezierCurveTo(63, 81, 63, 79, 60, 75)
           .bezierCurveTo(52, 69, 52, 61, 60, 55)
           .bezierCurveTo(63, 51, 63, 49, 60, 45)
           .closePath()
           .fill();
         
        doc.moveTo(100, 45)
           .bezierCurveTo(115, 55, 115, 75, 100, 85)
           .bezierCurveTo(97, 81, 97, 79, 100, 75)
           .bezierCurveTo(108, 69, 108, 61, 100, 55)
           .bezierCurveTo(97, 51, 97, 49, 100, 45)
           .closePath()
           .fill();

        doc.font("Roboto-Bold").fontSize(22).fillColor("#3A1984");
        doc.text("TCE", 60, 57, { width: 40, align: "center" });
        doc.restore();
      }

      // Right Side Header (Official TCE Letterhead)
      doc.font("Roboto-Bold").fontSize(22).fillColor("#3A1984").text("Technicool Engineering", 130, 38);
      doc.font("Roboto-Bold").fontSize(8).fillColor("#1f2937").text("MAKE YOUR DESIRE CLIMATE", 130, 64, { align: "left", width: 420 });

      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#374151");
      doc.text("Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.", 130, 76, { width: 420 });
      doc.text("NTN: G535752  |  STRN: 3277876376780  |  Web: www.technicool.com.pk  |  Mobile: 03218304978", 130, 87, { width: 420 });

      // Title
      doc.font("Roboto-Bold").fontSize(13).fillColor("#003366").text("COMPLAINT SHEET", 50, 105, { align: "center", width: 500, underline: true });

      // ================= CUSTOMER & COMPLAINT DETAILS BOX =================
      const topBoxY = 125;
      const topBoxHeight = 65;
      doc.rect(50, topBoxY, 500, topBoxHeight).strokeColor("#003366").lineWidth(1.2).stroke();

      // Horizontal lines inside top box
      doc.moveTo(50, topBoxY + 20).lineTo(550, topBoxY + 20).strokeColor("#003366").lineWidth(1).stroke();
      doc.moveTo(50, topBoxY + 40).lineTo(550, topBoxY + 40).strokeColor("#003366").lineWidth(1).stroke();

      // Vertical lines inside top box
      doc.moveTo(120, topBoxY).lineTo(120, topBoxY + topBoxHeight).strokeColor("#003366").lineWidth(1).stroke();
      doc.moveTo(300, topBoxY).lineTo(300, topBoxY + 40).strokeColor("#003366").lineWidth(1).stroke();
      doc.moveTo(375, topBoxY).lineTo(375, topBoxY + 40).strokeColor("#003366").lineWidth(1).stroke();

      // Labels and Values
      doc.font("Roboto-Bold").fontSize(8.5).fillColor("#003366");
      doc.text("Customer:", 55, topBoxY + 6);
      doc.text("Complaint:", 305, topBoxY + 6);
      doc.text("Cell #:", 55, topBoxY + 26);
      doc.text("Date:", 305, topBoxY + 26);
      doc.text("Site / Address:", 55, topBoxY + 49);

      // Prefilled data
      doc.font("Roboto-Regular").fontSize(8.5).fillColor("#000000");
      doc.text(complaintData.customerName || "", 125, topBoxY + 6, { width: 170, ellipsis: true });
      doc.text(complaintData.complaintNumber || "", 380, topBoxY + 6, { width: 165, ellipsis: true });
      doc.text(complaintData.customerPhone || "", 125, topBoxY + 26, { width: 170, ellipsis: true });
      doc.text(formatDateDisplay(complaintData.date, "en-GB"), 380, topBoxY + 26, { width: 165, ellipsis: true });
      doc.text(complaintData.customerAddress || "", 125, topBoxY + 49, { width: 420, height: 14, ellipsis: true });

      // ================= UNIT DETAILS & OPERATING CONDITIONS =================
      const midBoxY = 200;
      const midBoxHeight = 170;
      doc.rect(50, midBoxY, 250, midBoxHeight).strokeColor("#003366").lineWidth(1.2).stroke();
      doc.rect(300, midBoxY, 250, midBoxHeight).strokeColor("#003366").lineWidth(1.2).stroke();

      // Left Box: Unit Details
      doc.font("Roboto-Bold").fontSize(9).fillColor("#003366").text("UNIT DETAILS.", 55, midBoxY + 6);
      
      const drawLeftRow = (label: string, labelY: number) => {
        doc.font("Roboto-Regular").fontSize(7.5).fillColor("#000000").text(label, 55, labelY);
        doc.moveTo(145, labelY + 8).lineTo(290, labelY + 8).strokeColor("#94a3b8").lineWidth(0.5).stroke();
      };
      
      drawLeftRow("Indoor Unit Model:", midBoxY + 26);
      drawLeftRow("Indoor Serial:", midBoxY + 51);
      drawLeftRow("Outdoor Unit Model:", midBoxY + 76);
      drawLeftRow("Outdoor Serial:", midBoxY + 101);
      drawLeftRow("Gas Type / Refrigerant:", midBoxY + 126);

      // Right Box: Operating Conditions
      doc.font("Roboto-Bold").fontSize(9).fillColor("#003366").text("OPERATING CONDITIONS.", 305, midBoxY + 6);

      const drawRightRow = (label: string, labelY: number) => {
        doc.font("Roboto-Regular").fontSize(7.5).fillColor("#000000").text(label, 305, labelY);
        doc.moveTo(415, labelY + 8).lineTo(540, labelY + 8).strokeColor("#94a3b8").lineWidth(0.5).stroke();
      };

      drawRightRow("Grill Temperature:", midBoxY + 20);
      drawRightRow("Room Temperature:", midBoxY + 38);
      drawRightRow("Room Size:", midBoxY + 56);
      drawRightRow("Remote Set Temperature:", midBoxY + 74);
      drawRightRow("Ambient Temperature:", midBoxY + 92);
      drawRightRow("Gas Pressure:", midBoxY + 110);
      drawRightRow("Voltage:", midBoxY + 128);
      drawRightRow("Amp:", midBoxY + 146);

      // ================= WORK DETAIL BOX =================
      const workBoxY = 380;
      const workBoxHeight = 95;
      doc.rect(50, workBoxY, 500, workBoxHeight).strokeColor("#003366").lineWidth(1.2).stroke();
      doc.font("Roboto-Bold").fontSize(9).fillColor("#003366").text("WORK DETAIL.", 55, workBoxY + 6);

      // Draw manual writing lines inside Work Detail
      for (let i = 1; i <= 3; i++) {
        doc.moveTo(55, workBoxY + 18 + i * 23).lineTo(540, workBoxY + 18 + i * 23).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      }

      // Prefill with Description
      if (complaintData.description) {
        doc.font("Roboto-Regular").fontSize(8.5).fillColor("#1e293b");
        doc.text(complaintData.description, 55, workBoxY + 28, { width: 480, lineGap: 14.5 });
      }

      // ================= CUSTOMER REMARKS BOX =================
      const remarksBoxY = 495;
      const remarksBoxHeight = 95;
      doc.rect(50, remarksBoxY, 500, remarksBoxHeight).strokeColor("#003366").lineWidth(1.2).stroke();
      doc.font("Roboto-Bold").fontSize(9).fillColor("#003366").text("CUSTOMER REMARKS.", 55, remarksBoxY + 6);

      // Extra Work Required & Signature
      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#000000").text("Extra Work Required:", 55, remarksBoxY + 22);
      
      // Draw checkboxes
      doc.rect(145, remarksBoxY + 21, 7, 7).strokeColor("#003366").lineWidth(0.8).stroke();
      doc.text("Yes", 155, remarksBoxY + 21.5);
      doc.rect(185, remarksBoxY + 21, 7, 7).strokeColor("#003366").lineWidth(0.8).stroke();
      doc.text("No", 195, remarksBoxY + 21.5);

      doc.text("If Yes, Customer Signature: _____________________________________", 230, remarksBoxY + 21);

      // Draw lines for customer remarks
      doc.moveTo(55, remarksBoxY + 55).lineTo(540, remarksBoxY + 55).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.moveTo(55, remarksBoxY + 80).lineTo(540, remarksBoxY + 80).strokeColor("#cbd5e1").lineWidth(0.5).stroke();

      // ================= BOTTOM BOXES (TECHNICIAN & COORDINATOR) =================
      const botBoxY = 590;
      const botBoxHeight = 145;
      doc.rect(50, botBoxY, 250, botBoxHeight).strokeColor("#003366").lineWidth(1.2).stroke();
      doc.rect(300, botBoxY, 250, botBoxHeight).strokeColor("#003366").lineWidth(1.2).stroke();

      // Left Box: Technician Info
      doc.font("Roboto-Bold").fontSize(9).fillColor("#003366").text("TECHNICIAN NAME.", 55, botBoxY + 6);
      
      const techNameStr = complaintData.technician?.name || "";
      doc.font("Roboto-Regular").fontSize(9.5).fillColor("#000000").text(techNameStr, 55, botBoxY + 24);
      doc.moveTo(55, botBoxY + 36).lineTo(290, botBoxY + 36).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.moveTo(55, botBoxY + 58).lineTo(290, botBoxY + 58).strokeColor("#cbd5e1").lineWidth(0.5).stroke();

      doc.font("Roboto-Bold").fontSize(9).fillColor("#003366").text("SIGNATURES.", 55, botBoxY + 80);
      doc.font("Roboto-Regular").fontSize(8).fillColor("#000000").text("Technician Signature: _______________________", 55, botBoxY + 115);

      // Right Box: Coordinator Info & Status
      doc.font("Roboto-Bold").fontSize(9).fillColor("#003366").text("COORDINATOR / OFFICE REMARKS.", 305, botBoxY + 6);

      const statusVal = (complaintData.status || "OPEN").toUpperCase();
      
      const drawCheckbox = (x: number, y: number, checked: boolean) => {
        doc.rect(x, y, 7, 7).strokeColor("#003366").lineWidth(0.8).stroke();
        if (checked) {
          doc.font("Roboto-Bold").fontSize(7).fillColor("#003366").text("X", x + 1, y - 0.5);
        }
      };

      drawCheckbox(305, botBoxY + 24, statusVal === "OPEN" || statusVal === "PENDING");
      doc.font("Roboto-Regular").fontSize(8).fillColor("#000000").text("Pending", 318, botBoxY + 23);

      drawCheckbox(305, botBoxY + 38, statusVal === "IN_PROGRESS");
      doc.font("Roboto-Regular").fontSize(8).text("In Progress", 318, botBoxY + 37);

      drawCheckbox(305, botBoxY + 52, statusVal === "RESOLVED");
      doc.font("Roboto-Regular").fontSize(8).text("Resolved", 318, botBoxY + 51);

      drawCheckbox(305, botBoxY + 66, statusVal === "CLOSED");
      doc.font("Roboto-Regular").fontSize(8).text("Closed", 318, botBoxY + 65);

      doc.font("Roboto-Bold").fontSize(9).fillColor("#003366").text("SIGNATURES.", 305, botBoxY + 85);
      doc.font("Roboto-Regular").fontSize(8).fillColor("#000000").text("Coordinator Signature: _______________________", 305, botBoxY + 115);

      // ================= FOOTER =================
      doc.moveTo(50, 750).lineTo(550, 750).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#64748b");
      doc.text("Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.", 50, 757, { align: "center", width: 500 });
      doc.text("Web: www.technicool.com.pk   |   Email: services@technicool.com.pk", 50, 767, { align: "center", width: 500 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateEmployeeFormPDF(employee: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margins: { top: 40, bottom: 30, left: 50, right: 50 }, font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      // 1. TCE Brand Logo (Left Header)
      let logoLoaded = false;
      try {
        let logoPath = path.resolve("LOGO.png");
        if (!fs.existsSync(logoPath)) {
          logoPath = path.resolve("public/logo.png");
        }
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 42, { width: 75 });
          logoLoaded = true;
        }
      } catch (e) {
        console.error("Error loading logo image:", e);
      }

      if (!logoLoaded) {
        doc.save();
        doc.fillColor("#F28C28");
        doc.moveTo(60, 45)
           .bezierCurveTo(45, 55, 45, 75, 60, 85)
           .bezierCurveTo(63, 81, 63, 79, 60, 75)
           .bezierCurveTo(52, 69, 52, 61, 60, 55)
           .bezierCurveTo(63, 51, 63, 49, 60, 45)
           .closePath()
           .fill();
         
        doc.moveTo(100, 45)
           .bezierCurveTo(115, 55, 115, 75, 100, 85)
           .bezierCurveTo(97, 81, 97, 79, 100, 75)
           .bezierCurveTo(108, 69, 108, 61, 100, 55)
           .bezierCurveTo(97, 51, 97, 49, 100, 45)
           .closePath()
           .fill();

        doc.font("Roboto-Bold").fontSize(22).fillColor("#3A1984");
        doc.text("TCE", 60, 57, { width: 40, align: "center" });
        doc.restore();
      }

      // Right Side Header
      doc.font("Roboto-Bold").fontSize(24).fillColor("#3A1984").text("Technicool Engineering", 130, 48);
      doc.font("Roboto-Regular").fontSize(8).fillColor("#1f2937").text("MAKE YOUR DESIRE CLIMATE", 130, 75, { align: "right", width: 420 });

      // Title Banner
      doc.rect(50, 95, 500, 20).fill("#1e293b"); // slate-800
      doc.font("Roboto-Bold").fontSize(11).fillColor("#ffffff").text("EMPLOYMENT FORM", 50, 100, { align: "center", width: 500 });

      // Joining Date & Employee No
      const dateStr = employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString("en-GB") : new Date().toLocaleDateString("en-GB");
      if (employee.employeeNo) {
        doc.font("Roboto-Bold").fontSize(9).fillColor("#000000").text(`EMP NO: ${employee.employeeNo}`, 50, 125, { align: "left" });
      }
      doc.font("Roboto-Bold").fontSize(9).fillColor("#000000").text(`DATE: ${dateStr}`, 50, 125, { align: "right", width: 500 });

      // Meta grid
      let gridY = 145;
      doc.font("Roboto-Bold").fontSize(9).fillColor("#000000");
      doc.text("NAME:", 50, gridY);
      doc.font("Roboto-Regular").text(employee.name || "", 90, gridY);

      doc.font("Roboto-Bold").text("FATHER NAME:", 280, gridY);
      doc.font("Roboto-Regular").text(employee.fatherName || "______________________________", 360, gridY);

      gridY += 20;
      doc.font("Roboto-Bold").text("CONTACT#", 50, gridY);
      doc.font("Roboto-Regular").text(employee.phone || "", 110, gridY);

      doc.font("Roboto-Bold").text("FATHER CONTACT#", 280, gridY);
      doc.font("Roboto-Regular").text(employee.fatherPhone || "__________________________", 380, gridY);

      gridY += 20;
      doc.font("Roboto-Bold").text("DESIGNATION:", 50, gridY);
      doc.font("Roboto-Regular").text(employee.position || "", 125, gridY);

      doc.font("Roboto-Bold").text("RESPONSIBLE PERSON:", 280, gridY);
      doc.font("Roboto-Regular").text(employee.responsiblePerson || "_________________________", 400, gridY);

      gridY += 20;
      doc.font("Roboto-Bold").text("CNIC Number:", 50, gridY);
      doc.font("Roboto-Regular").text(employee.cnic || "", 120, gridY);

      doc.font("Roboto-Bold").text("REF/CONTACT#", 280, gridY);
      doc.font("Roboto-Regular").text(employee.refPhone || "_____________________________", 370, gridY);

      // Address
      gridY += 25;
      doc.font("Roboto-Bold").text("ADDRESS:", 50, gridY);
      doc.font("Roboto-Regular").text(employee.address || "", 50, gridY + 12, { width: 500, height: 25 });

      // Salary
      gridY += 40;
      const salaryStr = employee.baseSalary ? `${Number(employee.baseSalary).toFixed(0)}/=` : "___________/=";
      doc.font("Roboto-Bold").fontSize(10).text(`SALARY AMOUNT: ${salaryStr}`, 50, gridY);

      // Terms & Conditions
      gridY += 22;
      doc.font("Roboto-Bold").fontSize(10).text("Terms and Conditions:", 50, gridY);

      const terms = [
        "50% First salary will be under the company, which will be cleared after leaving the Job.",
        "1 Month notice period is Mandatory from both of employed person or Company while leaving the Job.",
        "The worker can be sent for work in any city of Pakistan.",
        "In case of emergency or ill health, the leave must be approved by the company.",
        "In case of leaving the job or termination, the calculation will be done after one month.",
        "All the Handed over equipment like Tool Box, Motorbike etc. should be returned back same as these was Handed over to the concern Person. Clearance must be done during leaving the job.",
        "All of your expenses (Salary, Bonuses etc.) bearded during the job must be clearance During leaving.",
        "Without Prior/ leaving Notice, salary or Bonuses will be deducted from the company.",
        "ID Card photocopy of employed person, father and responsible person must be provided to Company.",
        "Failure to follow all rules may result in fine or termination by the company.",
        "company may terminate without notice in case of theft or misbehavior.",
        "If the worker works outside the city, he will get 300 rupees a day for food.",
        "4-holidays in one month, Holidays is not same days of the month, every holiday will be approved as per requirement of company &employee.",
        "if employee, call will not attend by company during the holidays, then will be financial fine by the company.",
        "salary will be extend, extra bonuses & promotion as per employee behavior and rolls following of the company."
      ];

      gridY += 15;
      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#1e293b");
      terms.forEach((term, idx) => {
        const textStr = `${idx + 1}- ${term}`;
        doc.text(textStr, 50, gridY, { width: 500 });
        const linesUsed = Math.ceil(doc.heightOfString(textStr, { width: 500 }) / 10);
        gridY += Math.max(12, linesUsed * 10 - 2);
      });

      // Signatures
      let sigY = 650;
      doc.font("Roboto-Bold").fontSize(10).fillColor("#000000").text("For Employee", 50, sigY);
      doc.font("Roboto-Regular").fontSize(8).text("Sign .............................", 50, sigY + 18);
      doc.text(`Name: ${employee.name}`, 50, sigY + 32);

      doc.font("Roboto-Bold").fontSize(10).text("Technicool Engineering", 360, sigY);
      doc.font("Roboto-Regular").fontSize(8).text("Sign & stamp .....................", 360, sigY + 18);

      // Universal TCE Footer
      doc.moveTo(50, 715).lineTo(550, 715).strokeColor("#000000").lineWidth(0.5).stroke();
      doc.font("Roboto-Regular").fontSize(8).fillColor("#4b5563");
      doc.text("Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.", 50, 722, { align: "center", width: 500 });
      doc.text("Web: www.technicool.com.pk   |   Email: services@technicool.com.pk", 50, 734, { align: "center", width: 500 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export interface BusinessSummaryData {
  title?: string;
  period?: string;
  generatedDate?: string;
  recipientEmail?: string;
  financials: {
    totalRevenue: number;
    totalPaid: number;
    accountsReceivable: number;
    totalProcurement: number;
    grossProfit: number;
    invoicesCount: number;
    paidInvoicesCount: number;
  };
  sales: {
    recentInvoices: Array<{
      invoiceNumber: string;
      clientName: string;
      date: string;
      totalAmount: number;
      status: string;
    }>;
  };
  inventory: {
    totalProducts: number;
    totalValuation: number;
    lowStockItems: Array<{
      sku: string;
      name: string;
      onHandQty: number;
      reorderLevel: number;
    }>;
  };
  complaints: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    resolutionRate: number;
    recentList: Array<{
      complaintNumber: string;
      customerName: string;
      status: string;
      amount: number;
    }>;
  };
  hrm: {
    totalEmployees: number;
    totalPayrollAmount: number;
  };
}

export function generateBusinessSummaryPDF(data: BusinessSummaryData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4", font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      const title = data.title || "Executive Business Intelligence Dossier";
      const period = data.period || "Comprehensive Business Performance Report";
      const dateStr = data.generatedDate || new Date().toLocaleDateString("en-US", { dateStyle: "long" });

      // PAGE 1: Executive Overview & Financials
      // Header Banner Background
      doc.rect(0, 0, 595, 90).fill("#0f172a");

      // Logo Left
      let logoPath = path.resolve("public/logo.png");
      if (!fs.existsSync(logoPath)) {
        logoPath = path.resolve("logo.png");
      }
      if (fs.existsSync(logoPath)) {
        try {
          // White badge behind logo
          doc.rect(40, 18, 100, 54).fill("#ffffff");
          doc.image(logoPath, 45, 22, { width: 90 });
        } catch (e) {}
      }

      // Header Text
      doc.font("Roboto-Bold").fontSize(18).fillColor("#ffffff").text("TECHNICOOL ENGINEERING", 160, 24);
      doc.font("Roboto-Regular").fontSize(10).fillColor("#93c5fd").text("TCE ERP — Executive Business Intelligence Dossier", 160, 46);
      doc.font("Roboto-Regular").fontSize(8).fillColor("#94a3b8").text(`Generated: ${dateStr}  |  Scope: ${period}`, 160, 60);

      let y = 110;

      // Executive Summary Headline
      doc.font("Roboto-Bold").fontSize(14).fillColor("#0f172a").text("1. Executive Financial Performance", 40, y);
      y += 20;

      // 4-Column KPI Metric Cards
      const cardWidth = 120;
      const cardHeight = 55;
      const metrics = [
        { label: "TOTAL SALES REVENUE", value: `PKR ${Math.round(data.financials.totalRevenue).toLocaleString()}`, color: "#1e3a8a", bg: "#eff6ff" },
        { label: "COLLECTED PAYMENTS", value: `PKR ${Math.round(data.financials.totalPaid).toLocaleString()}`, color: "#166534", bg: "#f0fdf4" },
        { label: "RECEIVABLES (UNPAID)", value: `PKR ${Math.round(data.financials.accountsReceivable).toLocaleString()}`, color: "#b45309", bg: "#fffbeb" },
        { label: "PROCUREMENT SPEND", value: `PKR ${Math.round(data.financials.totalProcurement).toLocaleString()}`, color: "#6b21a8", bg: "#faf5ff" },
      ];

      metrics.forEach((m, i) => {
        const x = 40 + i * (cardWidth + 12);
        doc.rect(x, y, cardWidth, cardHeight).fill(m.bg).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
        doc.font("Roboto-Bold").fontSize(7).fillColor("#64748b").text(m.label, x + 8, y + 10, { width: cardWidth - 16 });
        doc.font("Roboto-Bold").fontSize(10).fillColor(m.color).text(m.value, x + 8, y + 26, { width: cardWidth - 16 });
      });

      y += cardHeight + 25;

      // Section 2: Recent Sales & Invoices
      doc.font("Roboto-Bold").fontSize(13).fillColor("#0f172a").text("2. Commercial Sales & Billing Breakdown", 40, y);
      y += 18;

      // Invoices Table Header
      doc.rect(40, y, 515, 20).fill("#1e293b");
      doc.font("Roboto-Bold").fontSize(8).fillColor("#ffffff");
      doc.text("INVOICE #", 50, y + 6);
      doc.text("CLIENT / ACCOUNT", 130, y + 6);
      doc.text("DATE", 310, y + 6);
      doc.text("STATUS", 390, y + 6);
      doc.text("AMOUNT (PKR)", 465, y + 6, { width: 80, align: "right" });
      y += 20;

      const invoices = data.sales.recentInvoices.slice(0, 5);
      if (invoices.length === 0) {
        doc.rect(40, y, 515, 22).fill("#f8fafc").strokeColor("#e2e8f0").stroke();
        doc.font("Roboto-Regular").fontSize(8).fillColor("#64748b").text("No recent commercial invoices recorded.", 50, y + 7);
        y += 22;
      } else {
        invoices.forEach((inv, idx) => {
          const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
          doc.rect(40, y, 515, 20).fill(rowBg).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
          doc.font("Roboto-Bold").fontSize(8).fillColor("#1e3a8a").text(inv.invoiceNumber, 50, y + 6);
          doc.font("Roboto-Regular").fontSize(8).fillColor("#1e293b").text(inv.clientName, 130, y + 6, { width: 170 });
          doc.font("Roboto-Regular").fontSize(8).fillColor("#64748b").text(inv.date, 310, y + 6);
          
          const statusColor = inv.status === "PAID" ? "#166534" : "#b45309";
          doc.font("Roboto-Bold").fontSize(7.5).fillColor(statusColor).text(inv.status, 390, y + 6);
          doc.font("Roboto-Bold").fontSize(8).fillColor("#0f172a").text(Math.round(inv.totalAmount).toLocaleString(), 465, y + 6, { width: 80, align: "right" });
          y += 20;
        });
      }

      y += 25;

      // Section 3: Service Complaints & Dispatch Queue
      doc.font("Roboto-Bold").fontSize(13).fillColor("#0f172a").text("3. Service, Repairs & Customer Complaints", 40, y);
      y += 18;

      // Complaint stats summary line
      const resRate = data.complaints.total > 0 ? Math.round((data.complaints.resolved / data.complaints.total) * 100) : 100;
      doc.rect(40, y, 515, 24).fill("#f1f5f9").strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.font("Roboto-Bold").fontSize(8).fillColor("#0f172a");
      doc.text(`Total Logged: ${data.complaints.total}`, 50, y + 8);
      doc.text(`Open: ${data.complaints.open}`, 160, y + 8);
      doc.text(`In Progress: ${data.complaints.inProgress}`, 250, y + 8);
      doc.text(`Resolved: ${data.complaints.resolved}`, 360, y + 8);
      doc.text(`Resolution Rate: ${resRate}%`, 450, y + 8, { width: 95, align: "right" });
      y += 24;

      const complaintsList = data.complaints.recentList.slice(0, 4);
      complaintsList.forEach((c, idx) => {
        const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(40, y, 515, 18).fill(rowBg).strokeColor("#e2e8f0").lineWidth(0.5).stroke();
        doc.font("Roboto-Bold").fontSize(7.5).fillColor("#0284c7").text(c.complaintNumber, 50, y + 5);
        doc.font("Roboto-Regular").fontSize(7.5).fillColor("#1e293b").text(c.customerName, 140, y + 5, { width: 200 });
        doc.font("Roboto-Bold").fontSize(7).fillColor("#475569").text(c.status, 360, y + 5);
        doc.font("Roboto-Regular").fontSize(7.5).fillColor("#0f172a").text(`PKR ${Math.round(c.amount).toLocaleString()}`, 465, y + 5, { width: 80, align: "right" });
        y += 18;
      });

      y += 25;

      // Section 4: Inventory & Warehouse Assets
      doc.font("Roboto-Bold").fontSize(13).fillColor("#0f172a").text("4. Warehouse Inventory & Physical Assets", 40, y);
      y += 18;

      doc.rect(40, y, 515, 24).fill("#f8fafc").strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.font("Roboto-Bold").fontSize(8).fillColor("#0f172a");
      doc.text(`Catalog SKUs: ${data.inventory.totalProducts}`, 50, y + 8);
      doc.text(`Total Stock Valuation: PKR ${Math.round(data.inventory.totalValuation).toLocaleString()}`, 200, y + 8);
      doc.text(`Low Stock Warnings: ${data.inventory.lowStockItems.length}`, 420, y + 8, { width: 125, align: "right" });
      y += 24;

      // Low stock table if any
      if (data.inventory.lowStockItems.length > 0) {
        data.inventory.lowStockItems.slice(0, 3).forEach((item, idx) => {
          const rowBg = idx % 2 === 0 ? "#ffffff" : "#fff1f2";
          doc.rect(40, y, 515, 18).fill(rowBg).strokeColor("#fecdd3").lineWidth(0.5).stroke();
          doc.font("Roboto-Bold").fontSize(7.5).fillColor("#991b1b").text(`[LOW STOCK] ${item.sku}`, 50, y + 5);
          doc.font("Roboto-Regular").fontSize(7.5).fillColor("#1e293b").text(item.name, 170, y + 5, { width: 230 });
          doc.font("Roboto-Bold").fontSize(7.5).fillColor("#991b1b").text(`On Hand: ${item.onHandQty} (Min: ${item.reorderLevel})`, 420, y + 5, { width: 125, align: "right" });
          y += 18;
        });
      }

      y += 25;

      // Section 5: Human Resources & Operational Payroll
      doc.font("Roboto-Bold").fontSize(13).fillColor("#0f172a").text("5. Human Resources & Active Workforce", 40, y);
      y += 18;

      doc.rect(40, y, 515, 24).fill("#f8fafc").strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.font("Roboto-Bold").fontSize(8).fillColor("#0f172a");
      doc.text(`Active Workforce: ${data.hrm.totalEmployees} Technical & Staff Members`, 50, y + 8);
      doc.text(`Monthly Payroll Commitment: PKR ${Math.round(data.hrm.totalPayrollAmount).toLocaleString()}`, 300, y + 8, { width: 245, align: "right" });
      y += 30;

      // Bottom Universal Footer
      const footerY = 790;
      doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#64748b");
      doc.text("Technicool Engineering Enterprise Operations  |  Multan, Pakistan  |  support@technicool.com.pk", 40, footerY + 6, { align: "left" });
      doc.font("Roboto-Bold").fontSize(7.5).fillColor("#2563eb");
      doc.text("Powered by OMNYSYNC (omnysync.com)", 350, footerY + 6, { align: "right", width: 205 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateSOAPDF(soaData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 35, size: "A4", font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      const formatDateShort = (d: any) => {
        if (!d) return "-";
        try {
          if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
            const [y, m, day] = d.split("-");
            return `${day}/${m}/${y.slice(-2)}`;
          }
          if (typeof d === "string" && /^\d{2}-\d{2}-\d{4}$/.test(d)) {
            const [day, m, y] = d.split("-");
            return `${day}/${m}/${y.slice(-2)}`;
          }
          const dateObj = new Date(d);
          if (isNaN(dateObj.getTime())) return String(d);
          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const year = String(dateObj.getFullYear()).slice(-2);
          return `${day}/${month}/${year}`;
        } catch {
          return String(d);
        }
      };

      const formatCurrency2 = (num: any) => {
        const val = Number(num) || 0;
        return val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      const drawTableHeader = (headerY: number) => {
        doc.rect(35, headerY, 525, 20).fill("#4688b9").stroke();
        doc.font("Roboto-Bold").fontSize(7).fillColor("#ffffff");
        doc.text("Date", 40, headerY + 6, { width: 45, align: "left" });
        doc.text("Document of\nReference", 88, headerY + 3, { width: 72, align: "left" });
        doc.text("Description", 165, headerY + 6, { width: 145, align: "left" });
        doc.text("Due", 315, headerY + 6, { width: 40, align: "left" });
        doc.text("Currency", 360, headerY + 6, { width: 35, align: "left" });
        doc.text("Debit", 400, headerY + 6, { width: 50, align: "right" });
        doc.text("Credit", 455, headerY + 6, { width: 50, align: "right" });
        doc.text("Balance", 510, headerY + 6, { width: 45, align: "right" });
      };

      // ================= PAGE 1 HEADER =================
      // 1. Top-Left: Company Info Block (Logo removed)
      const compY = 30;
      doc.font("Roboto-Bold").fontSize(9).fillColor("#0f172a").text("TECHNICOOL ENGINEERING", 35, compY);
      doc.font("Roboto-Regular").fontSize(6.8).fillColor("#475569");
      doc.text("Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.", 35, compY + 11, { width: 220 });
      doc.text("Phone No. +92-321-8304978", 35, compY + 28, { width: 220 });

      // 2. Top-Right: Statement Title & Document Info Block
      const titleText = "Statement";
      doc.font("Roboto-Bold").fontSize(18).fillColor("#27496d").text(titleText, 300, 28, { width: 260, align: "right" });

      const docDateStr = formatDateShort(new Date());
      const statementNo = soaData.statementNumber || (soaData.partyInfo?.id ? soaData.partyInfo.id.slice(0, 8).toUpperCase() : "86");
      const startDateStr = formatDateShort(soaData.period?.startDate);
      const endDateStr = formatDateShort(soaData.period?.endDate);

      const metaY = 54;
      const labelX = 370;
      const valX = 460;
      const valW = 100;

      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#475569");
      doc.text("Document Date", labelX, metaY);
      doc.font("Roboto-Bold").text(docDateStr, valX, metaY, { width: valW, align: "right" });

      doc.font("Roboto-Regular").text("Statement", labelX, metaY + 12);
      doc.font("Roboto-Bold").text(statementNo, valX, metaY + 12, { width: valW, align: "right" });

      doc.font("Roboto-Regular").text("Starting Date", labelX, metaY + 24);
      doc.font("Roboto-Bold").text(startDateStr, valX, metaY + 24, { width: valW, align: "right" });

      doc.font("Roboto-Regular").text("Ending Date", labelX, metaY + 36);
      doc.font("Roboto-Bold").text(endDateStr, valX, metaY + 36, { width: valW, align: "right" });

      // 3. Recipient Party Information (Left side at y = 110)
      const partyCode = soaData.partyInfo?.code || (soaData.partyType === "CUSTOMER" ? "CUS-000011" : soaData.partyType === "VENDOR" ? "VEN-000012" : soaData.partyType === "CONSOLIDATED" ? "PAR-360" : "EMP-000015");
      const partyName = (soaData.partyInfo?.name || "Valued Account").toUpperCase();
      
      let contactPerson = soaData.partyInfo?.contactPerson || "";
      if (contactPerson) {
        contactPerson = contactPerson.replace(/^MR\.?\s*/i, "").trim();
        if (contactPerson) contactPerson = `MR. ${contactPerson.toUpperCase()}`;
      }

      const partyAddress = soaData.partyInfo?.address || "MULTAN, PUNJAB, Pakistan";
      const partyPhone = soaData.partyInfo?.phone || "";

      let partyY = 110;
      doc.font("Roboto-Bold").fontSize(8).fillColor("#0f172a").text(partyCode, 35, partyY);
      partyY += 10;
      doc.font("Roboto-Bold").fontSize(8.5).fillColor("#0f172a").text(partyName, 35, partyY, { width: 260 });
      partyY += 11;
      if (contactPerson) {
        doc.font("Roboto-Bold").fontSize(7.5).fillColor("#334155").text(contactPerson, 35, partyY);
        partyY += 10;
      }
      doc.font("Roboto-Regular").fontSize(7).fillColor("#475569").text(partyAddress, 35, partyY, { width: 250 });
      partyY += 16;
      if (partyPhone) {
        doc.text(`Phone: ${partyPhone}`, 35, partyY);
        partyY += 10;
      }

      // ================= TABLE RENDERING =================
      let y = Math.max(partyY + 8, 175);
      drawTableHeader(y);
      y += 20;

      // Opening Balance Row
      const openingBalVal = Number(soaData.openingBalance) || 0;
      if (openingBalVal !== 0) {
        doc.rect(35, y, 525, 14).fill("#f8fafc").strokeColor("#e2e8f0").lineWidth(0.4).stroke();
        doc.font("Roboto-Bold").fontSize(7).fillColor("#475569").text("Opening balance", 165, y + 3.5, { width: 145 });
        doc.font("Roboto-Bold").fontSize(7).fillColor("#475569").text("PKR", 360, y + 3.5, { width: 35 });
        doc.font("Roboto-Bold").fontSize(7).fillColor("#0f172a").text(formatCurrency2(openingBalVal), 400, y + 3.5, { width: 50, align: "right" });
        y += 14;
      }

      // Transaction Rows
      const transactions = soaData.transactions || [];
      if (transactions.length === 0) {
        doc.rect(35, y, 525, 22).fill("#ffffff").strokeColor("#e2e8f0").lineWidth(0.4).stroke();
        doc.font("Roboto-Regular").fontSize(7.5).fillColor("#94a3b8").text("No transactions recorded during this statement period.", 40, y + 7, { align: "center", width: 515 });
        y += 22;
      } else {
        transactions.forEach((tx: any, idx: number) => {
          // Check for page break
          if (y > 750) {
            doc.addPage();
            doc.font("Roboto-Bold").fontSize(14).fillColor("#27496d").text("Statement", 35, 30);
            y = 48;
            drawTableHeader(y);
            y += 20;
          }

          const debitVal = tx.debit || 0;
          const creditVal = tx.credit ? -Math.abs(tx.credit) : 0;
          const runningBalVal = tx.runningBalance || 0;

          const isEven = idx % 2 === 0;
          const rowBg = isEven ? "#ffffff" : "#f8fafc";
          const rowHeight = (tx.description && tx.description.length > 55) ? 22 : 16;

          doc.rect(35, y, 525, rowHeight).fill(rowBg).strokeColor("#e2e8f0").lineWidth(0.3).stroke();

          // Date
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#334155").text(formatDateShort(tx.date), 40, y + 4, { width: 45 });

          // Document No / Document of Reference
          const docNo = tx.referenceNumber || tx.voucherNumber || tx.id || "-";
          doc.font("Roboto-Bold").fontSize(6.5).fillColor("#1e293b").text(docNo, 88, y + 4, { width: 72, ellipsis: true });

          // Description
          const desc = tx.description || tx.particulars || "Transaction";
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#1e293b").text(desc, 165, y + 4, { width: 145, height: rowHeight - 4, ellipsis: true });

          // Due Date
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#475569").text(formatDateShort(tx.dueDate || tx.date), 315, y + 4, { width: 40 });

          // Currency
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#475569").text("PKR", 360, y + 4, { width: 35 });

          // Debit
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#0f172a").text(formatCurrency2(debitVal), 400, y + 4, { width: 50, align: "right" });

          // Credit
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#0f172a").text(formatCurrency2(creditVal), 455, y + 4, { width: 50, align: "right" });

          // Running Total
          doc.font("Roboto-Bold").fontSize(6.5).fillColor("#0f172a").text(formatCurrency2(runningBalVal), 510, y + 4, { width: 45, align: "right" });

          y += rowHeight;
        });
      }

      // ================= FINAL CLOSING TOTAL BAR =================
      if (y > 745) {
        doc.addPage();
        y = 40;
      }

      y += 4;
      doc.rect(35, y, 525, 20).fill("#f1f5f9").strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.font("Roboto-Bold").fontSize(7.5).fillColor("#0f172a").text("Closing balance", 165, y + 6, { width: 145 });
      doc.font("Roboto-Bold").fontSize(7.5).fillColor("#0f172a").text("PKR", 360, y + 6, { width: 35 });
      const closingBalVal = Number(soaData.totals?.closingBalance ?? (transactions.length > 0 ? transactions[transactions.length - 1].runningBalance : soaData.openingBalance));
      doc.font("Roboto-Bold").fontSize(8).fillColor("#0f172a").text(formatCurrency2(closingBalVal), 400, y + 5.5, { width: 50, align: "right" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateMonthlySalarySheetPDF(data: { month: number; year: number; monthName: string; items: any[] }): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Landscape A4 for master salary sheet
      const doc = new PDFDocument({ margin: 30, size: "A4", layout: "landscape", font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      // Header Banner
      doc.rect(0, 0, 842, 65).fill("#0f172a");
      doc.font("Roboto-Bold").fontSize(16).fillColor("#ffffff").text("TECHNICOOL ENGINEERING", 30, 16);
      doc.font("Roboto-Regular").fontSize(10).fillColor("#93c5fd").text(`MASTER MONTHLY SALARY & ATTENDANCE SHEET — ${data.monthName.toUpperCase()} ${data.year}`, 30, 36);

      let y = 80;

      // Table Header (Width: 782)
      doc.rect(30, y, 782, 22).fill("#1e293b");
      doc.font("Roboto-Bold").fontSize(7.5).fillColor("#ffffff");
      doc.text("Emp #", 35, y + 6, { width: 45 });
      doc.text("Employee Name & Role", 85, y + 6, { width: 130 });
      doc.text("Base Salary", 220, y + 6, { width: 60, align: "right" });
      doc.text("Duty Days", 285, y + 6, { width: 45, align: "center" });
      doc.text("Absent", 335, y + 6, { width: 40, align: "center" });
      doc.text("Overtime", 380, y + 6, { width: 55, align: "right" });
      doc.text("Allowances", 440, y + 6, { width: 55, align: "right" });
      doc.text("Mess Exp.", 500, y + 6, { width: 55, align: "right" });
      doc.text("Adv. Deduct", 560, y + 6, { width: 55, align: "right" });
      doc.text("Net Payable", 620, y + 6, { width: 65, align: "right" });
      doc.text("Status", 690, y + 6, { width: 45, align: "center" });
      doc.text("Signature", 740, y + 6, { width: 65, align: "center" });

      y += 22;

      let totalBase = 0;
      let totalOvertime = 0;
      let totalAllowances = 0;
      let totalMess = 0;
      let totalAdv = 0;
      let totalNet = 0;

      data.items.forEach((item, idx) => {
        if (y > 510) {
          doc.addPage({ margin: 30, size: "A4", layout: "landscape", font: fontRegularPath });
          registerAppFonts(doc);
          y = 30;
        }

        const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(30, y, 782, 18).fill(bg);

        doc.font("Roboto-Bold").fontSize(7).fillColor("#64748b").text(item.employeeNo || "EMP", 35, y + 5, { width: 45 });
        doc.font("Roboto-Bold").fontSize(7.5).fillColor("#0f172a").text(item.name || "Staff", 85, y + 5, { width: 130 });
        doc.font("Roboto-Regular").fontSize(7).fillColor("#0f172a").text(Math.round(item.baseSalary).toLocaleString(), 220, y + 5, { width: 60, align: "right" });
        doc.font("Roboto-Regular").fontSize(7).fillColor("#059669").text(`${item.presentDays}/${item.totalDays || 30}`, 285, y + 5, { width: 45, align: "center" });
        doc.font("Roboto-Regular").fontSize(7).fillColor(item.absentDays > 0 ? "#e11d48" : "#64748b").text(`${item.absentDays || 0}`, 335, y + 5, { width: 40, align: "center" });
        doc.font("Roboto-Regular").fontSize(7).fillColor("#0284c7").text(item.overtimeAmount > 0 ? Math.round(item.overtimeAmount).toLocaleString() : "-", 380, y + 5, { width: 55, align: "right" });
        doc.font("Roboto-Regular").fontSize(7).fillColor("#0284c7").text(item.allowances > 0 ? Math.round(item.allowances).toLocaleString() : "-", 440, y + 5, { width: 55, align: "right" });
        doc.font("Roboto-Regular").fontSize(7).fillColor("#e11d48").text(item.messDeductions > 0 ? Math.round(item.messDeductions).toLocaleString() : "-", 500, y + 5, { width: 55, align: "right" });
        doc.font("Roboto-Regular").fontSize(7).fillColor("#e11d48").text(item.advanceDeductions > 0 ? Math.round(item.advanceDeductions).toLocaleString() : "-", 560, y + 5, { width: 55, align: "right" });
        doc.font("Roboto-Bold").fontSize(8).fillColor("#2563eb").text(`PKR ${Math.round(item.netPay).toLocaleString()}`, 620, y + 5, { width: 65, align: "right" });
        doc.font("Roboto-Bold").fontSize(6.5).fillColor(item.status === "PAID" ? "#059669" : "#d97706").text(item.status || "PENDING", 690, y + 5, { width: 45, align: "center" });
        doc.font("Roboto-Regular").fontSize(6.5).fillColor("#cbd5e1").text("____________", 740, y + 5, { width: 65, align: "center" });

        totalBase += Number(item.baseSalary || 0);
        totalOvertime += Number(item.overtimeAmount || 0);
        totalAllowances += Number(item.allowances || 0);
        totalMess += Number(item.messDeductions || 0);
        totalAdv += Number(item.advanceDeductions || 0);
        totalNet += Number(item.netPay || 0);

        y += 18;
      });

      // Total Summary Row
      y += 4;
      doc.rect(30, y, 782, 22).fill("#0f172a");
      doc.font("Roboto-Bold").fontSize(8).fillColor("#ffffff");
      doc.text("TOTALS", 85, y + 6);
      doc.text(`PKR ${Math.round(totalBase).toLocaleString()}`, 220, y + 6, { width: 60, align: "right" });
      doc.text(`PKR ${Math.round(totalOvertime).toLocaleString()}`, 380, y + 6, { width: 55, align: "right" });
      doc.text(`PKR ${Math.round(totalAllowances).toLocaleString()}`, 440, y + 6, { width: 55, align: "right" });
      doc.text(`PKR ${Math.round(totalMess).toLocaleString()}`, 500, y + 6, { width: 55, align: "right" });
      doc.text(`PKR ${Math.round(totalAdv).toLocaleString()}`, 560, y + 6, { width: 55, align: "right" });
      doc.text(`PKR ${Math.round(totalNet).toLocaleString()}`, 620, y + 6, { width: 65, align: "right" });

      // Signatures
      y += 40;
      doc.moveTo(50, y).lineTo(180, y).strokeColor("#94a3b8").lineWidth(0.5).stroke();
      doc.font("Roboto-Regular").fontSize(8).fillColor("#64748b").text("Prepared By (HR Officer)", 50, y + 4, { align: "center", width: 130 });

      doc.moveTo(350, y).lineTo(480, y).strokeColor("#94a3b8").lineWidth(0.5).stroke();
      doc.font("Roboto-Regular").fontSize(8).fillColor("#64748b").text("Verified By (Accounts Manager)", 350, y + 4, { align: "center", width: 130 });

      doc.moveTo(650, y).lineTo(780, y).strokeColor("#94a3b8").lineWidth(0.5).stroke();
      doc.font("Roboto-Regular").fontSize(8).fillColor("#64748b").text("Approved By (CEO / Director)", 650, y + 4, { align: "center", width: 130 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateQuotationPDF(quotationData: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      // TCE Logo Left
      let logoLoaded = false;
      try {
        let logoPath = path.resolve("LOGO.png");
        if (!fs.existsSync(logoPath)) {
          logoPath = path.resolve("public/logo.png");
        }
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, 40, { width: 70 });
          logoLoaded = true;
        }
      } catch (e) {
        console.error("Error loading logo image:", e);
      }

      if (!logoLoaded) {
        doc.save();
        doc.fillColor("#F28C28");
        doc.moveTo(60, 45)
           .bezierCurveTo(45, 55, 45, 75, 60, 85)
           .bezierCurveTo(63, 81, 63, 79, 60, 75)
           .bezierCurveTo(52, 69, 52, 61, 60, 55)
           .bezierCurveTo(63, 51, 63, 49, 60, 45)
           .closePath()
           .fill();
         
        doc.moveTo(100, 45)
           .bezierCurveTo(115, 55, 115, 75, 100, 85)
           .bezierCurveTo(97, 81, 97, 79, 100, 75)
           .bezierCurveTo(108, 69, 108, 61, 100, 55)
           .bezierCurveTo(97, 51, 97, 49, 100, 45)
           .closePath()
           .fill();

        doc.font("Roboto-Bold").fontSize(22).fillColor("#3A1984");
        doc.text("TCE", 60, 57, { width: 40, align: "center" });
        doc.restore();
      }

      // Right Side Header (Official TCE Letterhead)
      doc.font("Roboto-Bold").fontSize(22).fillColor("#3A1984").text("Technicool Engineering", 130, 38);
      doc.font("Roboto-Bold").fontSize(8).fillColor("#1f2937").text("MAKE YOUR DESIRE CLIMATE", 130, 64, { align: "left", width: 420 });

      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#374151");
      doc.text("Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.", 130, 76, { width: 420 });
      doc.text("NTN: G535752  |  STRN: 3277876376780  |  Web: www.technicool.com.pk  |  Mobile: 03218304978", 130, 87, { width: 420 });

      // Title Banner
      doc.rect(50, 102, 500, 20).fill("#1e293b"); // dark slate header
      doc.font("Roboto-Bold").fontSize(11).fillColor("#ffffff").text("PRICE QUOTATION / ESTIMATE", 50, 107, { align: "center", width: 500 });

      // Info metadata block
      doc.font("Roboto-Bold").fontSize(13).fillColor("#1f2937").text(`QUOTATION: ${quotationData.quotationNumber}`, 50, 130);
      doc.font("Roboto-Regular").fontSize(9.5).fillColor("#4b5563");
      doc.text(`Date: ${formatDateDisplay(quotationData.date, "en-GB")}`, 50, 148);
      doc.text(`Client Name: ${quotationData.clientName}`, 50, 162);
      if (quotationData.clientPhone) doc.text(`Client Phone: ${quotationData.clientPhone}`, 50, 176);
      if (quotationData.clientAddress) doc.text(`Client Address: ${quotationData.clientAddress}`, 50, 190, { width: 280 });

      if (quotationData.validUntil) {
        doc.text(`Valid Until: ${formatDateDisplay(quotationData.validUntil, "en-GB")}`, 340, 148);
      }
      doc.text(`Status: ${quotationData.status || "DRAFT"}`, 340, 162);
      doc.text(`NTN: G535752  |  STRN: 3277876376780`, 340, 176);

      // Subject Block
      let y = 220;
      if (quotationData.subjectHeading) {
        doc.font("Roboto-Bold").fontSize(11).fillColor("#1f2937").text(`Subject: ${quotationData.subjectHeading}`, 50, y);
        y += 15;
        if (quotationData.subjectDescription) {
          doc.font("Roboto-Regular").fontSize(9).fillColor("#4b5563").text(quotationData.subjectDescription, 50, y, { width: 500 });
          const textHeight = doc.heightOfString(quotationData.subjectDescription, { width: 500 });
          y += textHeight + 15;
        } else {
          y += 15;
        }
      }

      // Table columns header
      doc.font("Roboto-Bold").fontSize(10).fillColor("#1e3a8a");
      doc.text("Description", 50, y);
      doc.text("Qty", 300, y, { width: 50, align: "right" });
      doc.text("Price (PKR)", 380, y, { width: 80, align: "right" });
      doc.text("Total (PKR)", 475, y, { width: 75, align: "right" });

      // Table line
      doc.moveTo(50, y + 15).lineTo(550, y + 15).strokeColor("#1e3a8a").stroke();
      y += 25;

      doc.font("Roboto-Regular").fillColor("#1f2937");
      (quotationData.lineItems || []).forEach((item: any) => {
        const desc = item.product ? `[${item.product.sku}] ${item.product.name}` : (item.description || "Service Item");
        
        doc.fontSize(10).text(desc, 50, y, { width: 240 });
        doc.text(String(item.quantity), 300, y, { width: 50, align: "right" });
        doc.text(Math.round(Number(item.salesPrice)).toLocaleString("en-US"), 380, y, { width: 80, align: "right" });
        const lineTotal = Math.round(item.quantity * Number(item.salesPrice));
        doc.text(lineTotal.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });
        
        y += 20;

        if (item.extraFields) {
          try {
            const fields = typeof item.extraFields === "string" ? JSON.parse(item.extraFields) : item.extraFields;
            if (fields && Object.keys(fields).length > 0) {
              Object.entries(fields).forEach(([key, val]) => {
                if (key === "unit") return;
                doc.fontSize(8).fillColor("#6b7280").text(`  • ${key}: ${val}`, 60, y);
                y += 12;
              });
              doc.fillColor("#1f2937");
            }
          } catch (e) {}
        }
      });

      // Bottom Totals Line
      doc.moveTo(50, y + 5).lineTo(550, y + 5).strokeColor("#e5e7eb").stroke();
      y += 20;

      const meta = parseInvoiceMetadata(quotationData.notes, quotationData);
      const subtotal = meta.subtotalAmount;
      const discountAmount = meta.discountAmount;
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = meta.taxAmount;
      const computedTaxRate = meta.taxRate;
      const totalAmount = meta.totalAmount;

      // Print Totals
      doc.fontSize(10).fillColor("#4b5563");
      doc.text("Subtotal:", 320, y, { width: 140, align: "right" });
      doc.text(subtotal.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });

      if (discountAmount > 0) {
        y += 18;
        doc.fillColor("#b91c1c").text(`Discount (${meta.discountType === "PERCENTAGE" ? `${meta.discountPercent}%` : "Flat"}):`, 320, y, { width: 140, align: "right" });
        doc.text(`-${discountAmount.toLocaleString("en-US")}`, 475, y, { width: 75, align: "right" });
        doc.fillColor("#4b5563");
      }

      if (taxAmount > 0) {
        y += 18;
        doc.text(`Sales Tax (${computedTaxRate}%):`, 320, y, { width: 140, align: "right" });
        doc.text(taxAmount.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });
      }

      y += 18;
      doc.font("Roboto-Bold").fontSize(11).fillColor("#1f2937");
      doc.text("Estimated Total (PKR):", 320, y, { width: 140, align: "right" });
      doc.text(totalAmount.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });

      if (meta.userNotes) {
        y += 30;
        doc.font("Roboto-Bold").fontSize(10).fillColor("#1f2937").text("Notes / Terms:", 50, y);
        y += 15;
        doc.font("Roboto-Regular").fontSize(9).fillColor("#4b5563").text(meta.userNotes, 50, y, { width: 500 });
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateStockValuationPDF(data: {
  reportDate?: Date;
  totalValuation: number;
  totalItemsCount: number;
  items: Array<{
    sku: string;
    name: string;
    category?: string;
    onHandQty: number;
    averageCost: number;
    salesPrice?: number;
    totalValue: number;
  }>;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: "A4", font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      // Filter out zero and negative stock items strictly
      const inStockItems = (data.items || []).filter((item) => Number(item.onHandQty || 0) > 0);
      
      let computedTotalValuation = 0;
      let computedTotalUnits = 0;
      inStockItems.forEach((it) => {
        computedTotalValuation += Number(it.totalValue || 0);
        computedTotalUnits += Number(it.onHandQty || 0);
      });

      const drawHeader = (pageNumber?: number, totalPages?: number) => {
        // Logo
        let logoLoaded = false;
        try {
          let logoPath = path.resolve("LOGO.png");
          if (!fs.existsSync(logoPath)) {
            logoPath = path.resolve("public/logo.png");
          }
          if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 40, 35, { width: 65 });
            logoLoaded = true;
          }
        } catch (e) {
          console.error("Error loading logo image:", e);
        }

        if (!logoLoaded) {
          doc.save();
          doc.fillColor("#F28C28");
          doc.moveTo(48, 40)
             .bezierCurveTo(36, 48, 36, 68, 48, 76)
             .bezierCurveTo(51, 72, 51, 70, 48, 66)
             .bezierCurveTo(42, 61, 42, 54, 48, 49)
             .bezierCurveTo(51, 45, 51, 43, 48, 40)
             .closePath()
             .fill();
           
          doc.moveTo(82, 40)
             .bezierCurveTo(94, 48, 94, 68, 82, 76)
             .bezierCurveTo(79, 72, 79, 70, 82, 66)
             .bezierCurveTo(88, 61, 88, 54, 82, 49)
             .bezierCurveTo(79, 45, 79, 43, 82, 40)
             .closePath()
             .fill();

          doc.font("Roboto-Bold").fontSize(18).fillColor("#3A1984");
          doc.text("TCE", 48, 50, { width: 34, align: "center" });
          doc.restore();
        }

        // Company Details Right
        doc.font("Roboto-Bold").fontSize(20).fillColor("#3A1984").text("Technicool Engineering", 115, 34);
        doc.font("Roboto-Bold").fontSize(7.5).fillColor("#1f2937").text("MAKE YOUR DESIRE CLIMATE", 115, 57, { align: "left", width: 440 });

        doc.font("Roboto-Regular").fontSize(7.5).fillColor("#374151");
        doc.text("Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.", 115, 68, { width: 440 });
        doc.text("NTN: G535752  |  STRN: 3277876376780  |  Web: www.technicool.com.pk  |  Mobile: 03218304978", 115, 79, { width: 440 });

        // Title Banner
        doc.rect(40, 94, 515, 20).fill("#1e293b");
        doc.font("Roboto-Bold").fontSize(10).fillColor("#ffffff").text("INVENTORY STOCK ASSET VALUATION REPORT", 40, 99, { align: "center", width: 515 });
      };

      drawHeader();

      // Report Summary Cards / KPI Bar
      let y = 120;
      doc.rect(40, y, 515, 38).fill("#f8fafc");
      doc.rect(40, y, 515, 38).strokeColor("#e2e8f0").lineWidth(0.75).stroke();

      const genDate = data.reportDate ? new Date(data.reportDate) : new Date();
      const formattedGenDate = `${String(genDate.getDate()).padStart(2, "0")}/${String(genDate.getMonth() + 1).padStart(2, "0")}/${genDate.getFullYear()} ${genDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}`;

      // Card 1: Total Valuation
      doc.font("Roboto-Bold").fontSize(7).fillColor("#059669").text("TOTAL STOCK VALUATION", 55, y + 8);
      doc.font("Roboto-Bold").fontSize(12).fillColor("#047857").text(`PKR ${Math.round(computedTotalValuation).toLocaleString("en-US")}`, 55, y + 18);

      // Card 2: Total Units
      doc.font("Roboto-Bold").fontSize(7).fillColor("#0284c7").text("TOTAL IN-STOCK UNITS", 230, y + 8);
      doc.font("Roboto-Bold").fontSize(12).fillColor("#0369a1").text(`${computedTotalUnits.toLocaleString("en-US")} Units`, 230, y + 18);

      // Card 3: Active SKUs & Date
      doc.font("Roboto-Bold").fontSize(7).fillColor("#64748b").text("ACTIVE SKUs", 380, y + 8);
      doc.font("Roboto-Bold").fontSize(9).fillColor("#1e293b").text(`${inStockItems.length} Products`, 380, y + 18);
      doc.font("Roboto-Regular").fontSize(6.5).fillColor("#64748b").text(`Generated: ${formattedGenDate}`, 380, y + 28);

      y += 46;

      const drawTableHeader = (posY: number) => {
        doc.rect(40, posY, 515, 18).fill("#3A1984");
        doc.font("Roboto-Bold").fontSize(7.5).fillColor("#ffffff");
        doc.text("#", 44, posY + 5, { width: 16 });
        doc.text("SKU", 62, posY + 5, { width: 54 });
        doc.text("Product Description", 118, posY + 5, { width: 210 });
        doc.text("Category", 332, posY + 5, { width: 60 });
        doc.text("In Stock", 395, posY + 5, { width: 38, align: "right" });
        doc.text("Avg Cost (PKR)", 436, posY + 5, { width: 54, align: "right" });
        doc.text("Valuation (PKR)", 494, posY + 5, { width: 58, align: "right" });
      };

      drawTableHeader(y);
      y += 18;

      inStockItems.forEach((p, idx) => {
        doc.font("Roboto-Bold").fontSize(7.2);
        const descText = p.name || "Unnamed Product";
        const descHeight = doc.heightOfString(descText, { width: 210, lineGap: 1 });
        const rowHeight = Math.max(18, Math.ceil(descHeight) + 8);

        if (y + rowHeight > 750) {
          doc.addPage({ margin: 40, size: "A4", font: fontRegularPath });
          registerAppFonts(doc);
          drawHeader();
          y = 120;
          drawTableHeader(y);
          y += 18;
        }

        const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
        doc.rect(40, y, 515, rowHeight).fill(bg);
        doc.rect(40, y, 515, rowHeight).strokeColor("#f1f5f9").lineWidth(0.5).stroke();

        doc.font("Roboto-Regular").fontSize(7).fillColor("#64748b").text(String(idx + 1), 44, y + 5, { width: 16 });
        doc.font("Roboto-Bold").fontSize(7).fillColor("#2563eb").text(p.sku || "-", 62, y + 5, { width: 54 });
        
        // Full product name / model description without any truncation
        doc.font("Roboto-Bold").fontSize(7.2).fillColor("#0f172a").text(descText, 118, y + 5, { width: 210, lineGap: 1 });
        
        doc.font("Roboto-Regular").fontSize(6.8).fillColor("#64748b").text(p.category || "General", 332, y + 5, { width: 60 });
        doc.font("Roboto-Bold").fontSize(7.5).fillColor("#0f172a").text(Number(p.onHandQty || 0).toLocaleString(), 395, y + 5, { width: 38, align: "right" });
        doc.font("Roboto-Regular").fontSize(7).fillColor("#475569").text(Math.round(Number(p.averageCost || 0)).toLocaleString(), 436, y + 5, { width: 54, align: "right" });
        doc.font("Roboto-Bold").fontSize(7.5).fillColor("#059669").text(Math.round(Number(p.totalValue || 0)).toLocaleString(), 494, y + 5, { width: 58, align: "right" });

        y += rowHeight;
      });

      // Total Closing Bar
      if (y > 720) {
        doc.addPage({ margin: 40, size: "A4", font: fontRegularPath });
        registerAppFonts(doc);
        drawHeader();
        y = 120;
      }

      y += 5;
      doc.rect(40, y, 515, 20).fill("#1e293b");
      doc.font("Roboto-Bold").fontSize(8).fillColor("#ffffff");
      doc.text("TOTAL IN-STOCK VALUATION", 62, y + 6);
      doc.text(`${computedTotalUnits.toLocaleString()} Units`, 395, y + 6, { width: 38, align: "right" });
      doc.text(`PKR ${Math.round(computedTotalValuation).toLocaleString("en-US")}`, 465, y + 6, { width: 87, align: "right" });

      // Sign-off section
      y += 35;
      if (y > 750) {
        doc.addPage({ margin: 40, size: "A4", font: fontRegularPath });
        registerAppFonts(doc);
        y = 60;
      }

      doc.moveTo(50, y).lineTo(170, y).strokeColor("#94a3b8").lineWidth(0.5).stroke();
      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#64748b").text("Store Incharge / Inventory", 50, y + 4, { align: "center", width: 120 });

      doc.moveTo(235, y).lineTo(355, y).strokeColor("#94a3b8").lineWidth(0.5).stroke();
      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#64748b").text("Inventory Auditor / Accounts", 235, y + 4, { align: "center", width: 120 });

      doc.moveTo(420, y).lineTo(540, y).strokeColor("#94a3b8").lineWidth(0.5).stroke();
      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#64748b").text("Managing Director / CEO", 420, y + 4, { align: "center", width: 120 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}



