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
      const siteVal = (meta.site || invoiceData.site || "").trim();
      let leftY = 148;
      doc.text(`Date: ${formatDateDisplay(invoiceData.date, "en-GB")}`, 50, leftY);
      leftY += 14;
      if (siteVal) {
        doc.text(`Site: ${siteVal}`, 50, leftY);
        leftY += 14;
      }
      doc.text(`Client Name: ${invoiceData.clientName}`, 50, leftY);
      leftY += 14;
      if (invoiceData.clientPhone) {
        doc.text(`Client Phone: ${invoiceData.clientPhone}`, 50, leftY);
        leftY += 14;
      }
      if (invoiceData.clientAddress) {
        doc.text(`Client Address: ${invoiceData.clientAddress}`, 50, leftY, { width: 280 });
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
      doc.text(`Date: ${formatDateDisplay(doData.date, "en-GB")}`, 50, 148);
      doc.text(`Client Name: ${doData.clientName}`, 50, 162);
      if (doData.clientPhone) doc.text(`Client Phone: ${doData.clientPhone}`, 50, 176);
      if (doData.deliveryAddress) doc.text(`Delivery Address: ${doData.deliveryAddress}`, 50, 190, { width: 280 });

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
      const doc = new PDFDocument({ margins: { top: 50, bottom: 30, left: 50, right: 50 }, font: fontRegularPath });
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
        // Draw orange crescent left
        doc.fillColor("#F28C28");
        doc.moveTo(60, 45)
           .bezierCurveTo(45, 55, 45, 75, 60, 85)
           .bezierCurveTo(63, 81, 63, 79, 60, 75)
           .bezierCurveTo(52, 69, 52, 61, 60, 55)
           .bezierCurveTo(63, 51, 63, 49, 60, 45)
           .closePath()
           .fill();
           
        // Draw orange crescent right
        doc.moveTo(100, 45)
           .bezierCurveTo(115, 55, 115, 75, 100, 85)
           .bezierCurveTo(97, 81, 97, 79, 100, 75)
           .bezierCurveTo(108, 69, 108, 61, 100, 55)
           .bezierCurveTo(97, 51, 97, 49, 100, 45)
           .closePath()
           .fill();

        // Draw TCE Text
        doc.font("Roboto-Bold").fontSize(22).fillColor("#3A1984");
        doc.text("TCE", 60, 57, { width: 40, align: "center" });
        doc.restore();
      }

      // Right Side Header
      doc.font("Roboto-Bold").fontSize(24).fillColor("#3A1984").text("Technicool Engineering", 130, 48);
      doc.font("Roboto-Regular").fontSize(8).fillColor("#1f2937").text("MAKE YOUR DESIRE CLIMATE", 130, 75, { align: "right", width: 420 });

      // Title
      doc.rect(50, 95, 500, 20).fillAndStroke("#e5e7eb", "#000000");
      doc.font("Roboto-Bold").fontSize(11).fillColor("#000000").text("Complaint Sheet", 50, 100, { align: "center", width: 500, underline: true });

      // Left metadata
      doc.font("Roboto-Bold").fontSize(10).fillColor("#000000").text("Customer:", 50, 130, { underline: true });
      doc.font("Roboto-Regular").fontSize(10).text(complaintData.customerName || "", 115, 130);
      doc.moveTo(115, 140).lineTo(310, 140).strokeColor("#000000").lineWidth(1).stroke();

      doc.font("Roboto-Bold").fontSize(10).text("Cell #:", 50, 150, { underline: true });
      doc.font("Roboto-Regular").fontSize(10).text(complaintData.customerPhone || "", 115, 150);
      doc.moveTo(115, 160).lineTo(310, 160).strokeColor("#000000").stroke();

      doc.font("Roboto-Bold").fontSize(10).text("Site:", 50, 170, { underline: true });
      doc.font("Roboto-Regular").fontSize(9).text(complaintData.customerAddress || "", 85, 170, { width: 225, height: 25 });
      doc.moveTo(85, 180).lineTo(310, 180).strokeColor("#000000").stroke();
      doc.moveTo(50, 195).lineTo(310, 195).strokeColor("#000000").stroke();

      // Right metadata
      doc.font("Roboto-Bold").fontSize(10).text("Date:", 340, 130);
      doc.font("Roboto-Regular").fontSize(10).text(formatDateDisplay(complaintData.date, "en-GB"), 380, 130);
      doc.moveTo(380, 140).lineTo(550, 140).strokeColor("#000000").stroke();

      doc.font("Roboto-Bold").fontSize(10).text("Location:", 340, 150);
      doc.moveTo(395, 160).lineTo(550, 160).strokeColor("#000000").stroke();

      doc.font("Roboto-Bold").fontSize(10).text("Complaint #", 340, 170);
      doc.font("Roboto-Regular").fontSize(10).text(complaintData.complaintNumber || "", 410, 170);
      doc.moveTo(410, 180).lineTo(550, 180).strokeColor("#000000").stroke();

      // Reported Problem
      doc.font("Roboto-Bold").fontSize(10).text("Reported Problem:", 50, 205);
      doc.font("Roboto-Regular").fontSize(9).text(complaintData.description || "", 150, 205, { width: 400 });
      doc.moveTo(150, 215).lineTo(550, 215).strokeColor("#000000").stroke();

      // Table Grid
      let tableY = 230;
      const colWidths = [130, 120, 130, 120];
      const rowLabels = [
        ["Indoor Unit Model #", "Outdoor Model #"],
        ["Indoor Serial #", "Outdoor Serial #"],
        ["Grill Temperature", "Voltage"],
        ["Room Temperature", "Amp"],
        ["Room Size", "Ambient Temperature"],
        ["Remote Set Temperature", "Gas Pressure"]
      ];

      // Draw horizontal lines
      for (let i = 0; i <= 6; i++) {
        doc.moveTo(50, tableY + i * 18).lineTo(550, tableY + i * 18).strokeColor("#000000").lineWidth(1).stroke();
      }
      // Draw vertical lines
      const tableHeight = 6 * 18;
      let currX = 50;
      doc.moveTo(currX, tableY).lineTo(currX, tableY + tableHeight).strokeColor("#000000").stroke(); // far left
      currX += colWidths[0];
      doc.moveTo(currX, tableY).lineTo(currX, tableY + tableHeight).strokeColor("#000000").stroke(); // col 1 divider
      currX += colWidths[1];
      doc.moveTo(currX, tableY).lineTo(currX, tableY + tableHeight).strokeColor("#000000").stroke(); // col 2 divider
      currX += colWidths[2];
      doc.moveTo(currX, tableY).lineTo(currX, tableY + tableHeight).strokeColor("#000000").stroke(); // col 3 divider
      currX += colWidths[3];
      doc.moveTo(currX, tableY).lineTo(currX, tableY + tableHeight).strokeColor("#000000").stroke(); // far right

      // Fill in text
      doc.font("Roboto-Regular").fontSize(8.5).fillColor("#000000");
      for (let r = 0; r < 6; r++) {
        const yPos = tableY + r * 18 + 4;
        doc.text(rowLabels[r][0], 55, yPos, { width: 120 });
        doc.text(rowLabels[r][1], 305, yPos, { width: 120 });
      }

      // Remarks Section with ample writing lines
      let currentY = tableY + tableHeight + 15;
      doc.font("Roboto-Bold").fontSize(10).text("Technician Remarks.", 50, currentY, { underline: true });
      if (complaintData.remarks) {
        doc.font("Roboto-Regular").fontSize(9).text(complaintData.remarks, 50, currentY + 14, { width: 500 });
      }
      // 4 horizontal lines for Technician remarks
      for (let l = 1; l <= 4; l++) {
        doc.moveTo(50, currentY + l * 18 + 2).lineTo(550, currentY + l * 18 + 2).strokeColor("#000000").lineWidth(0.5).stroke();
      }

      currentY += 88;
      doc.font("Roboto-Bold").fontSize(10).text("Customer remarks:", 50, currentY, { underline: true });
      // 4 horizontal lines for Customer remarks
      for (let l = 1; l <= 4; l++) {
        doc.moveTo(50, currentY + l * 18 + 2).lineTo(550, currentY + l * 18 + 2).strokeColor("#000000").lineWidth(0.5).stroke();
      }

      // Signatures pinned at bottom right above footer
      const sigY = 635;
      doc.font("Roboto-Bold").fontSize(10.5).text("Technician", 50, sigY);
      doc.font("Roboto-Regular").fontSize(9).text("Sign .......................", 50, sigY + 18);
      const techNameStr = complaintData.technician?.name || "";
      doc.text(`Name: ${techNameStr}`, 50, sigY + 34);

      doc.font("Roboto-Bold").fontSize(10.5).text("Verified by client", 360, sigY);
      doc.font("Roboto-Regular").fontSize(9).text("Sign & stamp .......................", 360, sigY + 18);
      const clientNameStr = complaintData.customerName || "";
      doc.text(`Name: ${clientNameStr}`, 360, sigY + 34);

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
          const dateObj = new Date(d);
          if (isNaN(dateObj.getTime())) return String(d);
          const day = String(dateObj.getDate()).padStart(2, "0");
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const year = String(dateObj.getFullYear()).slice(-2);
          return `${month}/${day}/${year}`;
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
        doc.text("Posting\nDate", 40, headerY + 3, { width: 45, align: "left" });
        doc.text("Document\nNo.", 88, headerY + 3, { width: 72, align: "left" });
        doc.text("Description", 165, headerY + 6, { width: 172, align: "left" });
        doc.text("Due Date", 342, headerY + 6, { width: 45, align: "left" });
        doc.text("Original\nAmount", 390, headerY + 3, { width: 55, align: "right" });
        doc.text("Remaining\nAmount", 448, headerY + 3, { width: 42, align: "right" });
        doc.text("Running Total", 492, headerY + 6, { width: 64, align: "right" });
      };

      // ================= PAGE 1 HEADER =================
      // 1. Top-Left Statement Title
      doc.font("Roboto-Bold").fontSize(22).fillColor("#27496d").text("Statement", 35, 35);

      // 2. Document Info Metadata Block (under Statement title)
      const docDateStr = formatDateShort(new Date());
      const statementNo = soaData.statementNumber || (soaData.partyInfo?.id ? soaData.partyInfo.id.slice(0, 8).toUpperCase() : "86");
      const startDateStr = formatDateShort(soaData.period?.startDate);
      const endDateStr = formatDateShort(soaData.period?.endDate);

      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#334155");
      doc.text("Document Date", 35, 66);
      doc.font("Roboto-Bold").text(docDateStr, 115, 66);

      doc.font("Roboto-Regular").text("Statement", 35, 78);
      doc.font("Roboto-Bold").text(statementNo, 115, 78);

      doc.font("Roboto-Regular").text("Starting Date", 35, 90);
      doc.font("Roboto-Bold").text(startDateStr, 115, 90);

      doc.font("Roboto-Regular").text("Ending Date", 35, 102);
      doc.font("Roboto-Bold").text(endDateStr, 115, 102);

      // 3. Top-Right Company Header Block
      let logoLoaded = false;
      try {
        let logoPath = path.resolve("LOGO.png");
        if (!fs.existsSync(logoPath)) logoPath = path.resolve("public/logo.png");
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 395, 30, { width: 90 });
          logoLoaded = true;
        }
      } catch (e) {
        console.error("Logo load error in SOA:", e);
      }

      const compY = logoLoaded ? 70 : 35;
      doc.font("Roboto-Bold").fontSize(8.5).fillColor("#1e3a8a").text("AIR CONDITIONERS", 395, compY, { align: "left" });
      doc.font("Roboto-Bold").fontSize(9).fillColor("#0f172a").text("TECHNICOOL ENGINEERING", 395, compY + 12, { align: "left" });

      doc.font("Roboto-Regular").fontSize(7).fillColor("#475569");
      doc.text("Office No.22 Inside Aneesa Center Opp, MashAllah Electronics Khanewal Road Multan.", 395, compY + 23, { width: 165, align: "left" });
      doc.text("Phone No. +92-321-8304978  |  +92-300-8636100", 395, compY + 44, { width: 165, align: "left" });

      // 4. Recipient Party Information (Left side at y = 120)
      const partyCode = soaData.partyInfo?.code || (soaData.partyType === "CUSTOMER" ? "CUS-000011" : soaData.partyType === "VENDOR" ? "VEN-000012" : "EMP-000015");
      const partyName = (soaData.partyInfo?.name || "Valued Account").toUpperCase();
      const contactPerson = soaData.partyInfo?.contactPerson ? `MR. ${soaData.partyInfo.contactPerson.toUpperCase()}` : null;
      const partyAddress = soaData.partyInfo?.address || "MULTAN, PUNJAB, Pakistan";
      const partyPhone = soaData.partyInfo?.phone || "";

      let partyY = 122;
      doc.font("Roboto-Bold").fontSize(8).fillColor("#0f172a").text(partyCode, 35, partyY);
      partyY += 10;
      doc.font("Roboto-Bold").fontSize(8.5).fillColor("#0f172a").text(partyName, 35, partyY, { width: 260 });
      partyY += 11;
      if (contactPerson) {
        doc.font("Roboto-Bold").fontSize(7.5).fillColor("#334155").text(contactPerson, 35, partyY);
        partyY += 10;
      }
      doc.font("Roboto-Regular").fontSize(7).fillColor("#475569").text(partyAddress, 35, partyY, { width: 250 });
      partyY += 18;
      if (partyPhone) {
        doc.text(`Phone: ${partyPhone}`, 35, partyY);
        partyY += 10;
      }

      // ================= TABLE RENDERING =================
      let y = Math.max(partyY + 6, 185);
      drawTableHeader(y);
      y += 20;

      // Opening Balance Row
      const openingBalVal = Number(soaData.openingBalance) || 0;
      doc.rect(35, y, 525, 14).fill("#f8fafc").strokeColor("#e2e8f0").lineWidth(0.4).stroke();
      doc.font("Roboto-Bold").fontSize(7).fillColor("#475569").text("Entries PKR", 40, y + 3.5);
      doc.font("Roboto-Bold").fontSize(7).fillColor("#0f172a").text(formatCurrency2(openingBalVal), 492, y + 3.5, { width: 64, align: "right" });
      y += 14;

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

          // Calculate signed original amount
          let origAmount = 0;
          if (soaData.partyType === "VENDOR") {
            if (tx.debit > 0) origAmount = -Number(tx.debit); // payment to vendor
            else origAmount = Number(tx.credit); // bill from vendor
          } else {
            if (tx.debit > 0) origAmount = Number(tx.debit); // invoice to customer
            else origAmount = -Number(tx.credit); // payment from customer
          }

          const isEven = idx % 2 === 0;
          const rowBg = isEven ? "#ffffff" : "#f8fafc";
          const rowHeight = (tx.description && tx.description.length > 55) ? 22 : 16;

          doc.rect(35, y, 525, rowHeight).fill(rowBg).strokeColor("#e2e8f0").lineWidth(0.3).stroke();

          // Date
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#334155").text(formatDateShort(tx.date), 40, y + 4, { width: 45 });

          // Document No.
          const docNo = tx.referenceNumber || tx.voucherNumber || tx.id || "-";
          doc.font("Roboto-Bold").fontSize(6.5).fillColor("#1e293b").text(docNo, 88, y + 4, { width: 72, ellipsis: true });

          // Description
          const desc = tx.description || tx.particulars || "Transaction";
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#1e293b").text(desc, 165, y + 4, { width: 172, height: rowHeight - 4, ellipsis: true });

          // Due Date
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#475569").text(formatDateShort(tx.dueDate || tx.date), 342, y + 4, { width: 45 });

          // Original Amount
          const origAmtStr = formatCurrency2(origAmount);
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#0f172a").text(origAmtStr, 390, y + 4, { width: 55, align: "right" });

          // Remaining Amount (0.00)
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#64748b").text("0.00", 448, y + 4, { width: 42, align: "right" });

          // Running Total
          const runBalStr = formatCurrency2(tx.runningBalance);
          doc.font("Roboto-Bold").fontSize(6.5).fillColor("#0f172a").text(runBalStr, 492, y + 4, { width: 64, align: "right" });

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
      doc.font("Roboto-Bold").fontSize(8).fillColor("#0f172a").text("Total PKR", 380, y + 6, { width: 100, align: "right" });
      const closingBalVal = Number(soaData.totals?.closingBalance ?? (transactions.length > 0 ? transactions[transactions.length - 1].runningBalance : soaData.openingBalance));
      doc.font("Roboto-Bold").fontSize(8.5).fillColor("#0f172a").text(formatCurrency2(closingBalVal), 485, y + 5.5, { width: 70, align: "right" });

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



