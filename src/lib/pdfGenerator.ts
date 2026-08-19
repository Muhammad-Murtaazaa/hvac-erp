import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import QRCode from "qrcode";

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

      // Header
      doc.fontSize(22).fillColor("#1e3a8a").text("HVAC Service & Trading ERP", { align: "left" });
      doc.fontSize(10).fillColor("#4b5563").text("Cloud Ledger-Synchronized Invoice Document", { align: "left" });
      doc.moveDown();

      // Horizontal line
      doc.moveTo(50, 95).lineTo(550, 95).strokeColor("#e5e7eb").stroke();

      // Info metadata block
      doc.font("Roboto-Bold").fontSize(14).fillColor("#1f2937").text(`INVOICE: ${invoiceData.invoiceNumber}`, 50, 110);
      doc.font("Roboto-Regular").fontSize(10).fillColor("#4b5563");
      doc.text(`Date: ${new Date(invoiceData.date).toLocaleDateString()}`, 50, 130);
      doc.text(`Client Name: ${invoiceData.clientName}`, 50, 145);
      if (invoiceData.clientPhone) doc.text(`Client Phone: ${invoiceData.clientPhone}`, 50, 160);
      if (invoiceData.clientAddress) doc.text(`Client Address: ${invoiceData.clientAddress}`, 50, 175);

      if (invoiceData.deliveryOrder) {
        doc.text(`Ref Delivery Order: ${invoiceData.deliveryOrder.doNumber}`, 350, 130);
      }
      doc.text(`Status: ${invoiceData.status}`, 350, 145);
      doc.text(`NTN: G535752`, 350, 160);
      doc.text(`STRN: 3277876376780`, 350, 175);

      // Subject Block
      let y = 210;
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

      const subtotal = Math.round(invoiceData.lineItems.reduce((acc: number, item: any) => acc + (item.quantity * Number(item.salesPrice)), 0));
      const totalAmount = Math.round(Number(invoiceData.totalAmount));
      const taxAmount = Math.round(Math.max(0, totalAmount - subtotal));
      const computedTaxRate = subtotal > 0 ? Math.round((taxAmount / subtotal) * 100) : 0;
      const amountPaid = Math.round(Number(invoiceData.amountPaid || 0));
      const balance = Math.round(totalAmount - amountPaid);

      // Print Totals
      doc.fontSize(10).fillColor("#4b5563");
      doc.text("Subtotal:", 320, y, { width: 140, align: "right" });
      doc.text(subtotal.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });

      if (taxAmount > 0) {
        y += 18;
        doc.text(`Sales Tax (${computedTaxRate}%):`, 320, y, { width: 140, align: "right" });
        doc.text(taxAmount.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });
      }

      y += 18;
      doc.font("Roboto-Bold").fontSize(10).fillColor("#1f2937");
      doc.text("Total Invoice Amount:", 320, y, { width: 140, align: "right" });
      doc.text(totalAmount.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });

      y += 18;
      doc.font("Roboto-Regular").fontSize(10).fillColor("#4b5563");
      doc.text("Amount Paid:", 320, y, { width: 140, align: "right" });
      doc.text(amountPaid.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });

      y += 18;
      doc.font("Roboto-Bold").fontSize(11).fillColor("#b91c1c").text("Balance Due (PKR):", 320, y, { width: 140, align: "right" });
      doc.text(balance.toLocaleString("en-US"), 475, y, { width: 75, align: "right" });

      if (invoiceData.notes) {
        y += 30;
        doc.font("Roboto-Bold").fontSize(10).fillColor("#1f2937").text("Notes:", 50, y);
        y += 15;
        doc.font("Roboto-Regular").fontSize(9).fillColor("#4b5563").text(invoiceData.notes, 50, y, { width: 500 });
      }

      // Footer notice
      doc.font("Roboto-Regular").fontSize(8).fillColor("#9ca3af").text("Generated automatically from the HVAC ERP general ledger. System source of truth.", 50, 720, { align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export function generateDeliveryOrderPDF(doData: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      doc.fontSize(22).fillColor("#047857").text("HVAC Delivery Order", { align: "left" });
      doc.fontSize(10).fillColor("#4b5563").text("Official Dispatch & Delivery Challan Record", { align: "left" });
      doc.moveDown();

      doc.moveTo(50, 95).lineTo(550, 95).strokeColor("#e5e7eb").stroke();

      doc.font("Roboto-Bold").fontSize(14).fillColor("#1f2937").text(`DO NUMBER: ${doData.doNumber}`, 50, 110);
      doc.font("Roboto-Regular").fontSize(10).fillColor("#4b5563");
      doc.text(`Date: ${new Date(doData.date).toLocaleDateString()}`, 50, 130);
      doc.text(`Client Name: ${doData.clientName}`, 50, 145);
      doc.text(`Client Phone: ${doData.clientPhone}`, 50, 160);
      doc.text(`Delivery Address: ${doData.deliveryAddress}`, 50, 175);
      doc.text(`DO Status: ${doData.status}`, 310, 130);
      if (doData.poNumber) {
        doc.text(`Ref PO Number: ${doData.poNumber}`, 310, 145);
      }

      // Generate and embed QR code
      try {
        const rawHost = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || process.env.NEXTAUTH_URL || "https://hvac-erp-bay.vercel.app";
        const baseUrl = rawHost.startsWith("http") ? rawHost : `https://${rawHost}`;
        const confirmUrl = `${baseUrl}/delivery/confirm/${doData.id}`;
        const qrBuffer = await QRCode.toBuffer(confirmUrl, {
          errorCorrectionLevel: "H",
          margin: 1,
          width: 80,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        doc.image(qrBuffer, 465, 105, { width: 75 });
        doc.fontSize(7).fillColor("#6b7280").text("Scan to Confirm Receipt", 450, 182, { width: 105, align: "center" });
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
      doc.text("Office No . 22 Inside Aneesa Centre Opp. MashAllah Electronics Khanewal Road Multan.", 50, 722, { align: "center", width: 500 });
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
      doc.font("Roboto-Regular").fontSize(10).text(new Date(complaintData.date).toLocaleDateString("en-GB"), 380, 130);
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
      doc.text("Office No . 22 Inside Aneesa Centre Opp. MashAllah Electronics Khanewal Road Multan.", 50, 722, { align: "center", width: 500 });
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
      doc.text("Office No . 22 Inside Aneesa Centre Opp. MashAllah Electronics Khanewal Road Multan.", 50, 722, { align: "center", width: 500 });
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
      const doc = new PDFDocument({ margin: 40, size: "A4", font: fontRegularPath });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", (err) => reject(err));

      registerAppFonts(doc);

      // 1. Universal Header
      doc.font("Roboto-Bold").fontSize(18).fillColor("#0f172a").text("TECHNICOOL ENGINEERING", 40, 40);
      doc.font("Roboto-Bold").fontSize(8).fillColor("#64748b").text("MAKE YOUR DESIRE CLIMATE", 40, 60);

      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#475569");
      doc.text("OFFICE NO. 22 INSIDE ANEESA CENTRE OPP. MASHALLAH ELECTRONICS KHANEWAL ROAD MULTAN", 40, 72);
      doc.text("NTN: G535752  |  STRN: 3277876376780  |  Web: www.technicool.com.pk  |  Mobile: 03218304978", 40, 83);

      doc.moveTo(40, 96).lineTo(555, 96).strokeColor("#0f172a").lineWidth(1.5).stroke();

      // 2. Title & Party Details
      doc.font("Roboto-Bold").fontSize(12).fillColor("#0f172a").text("STATEMENT OF ACCOUNT", 40, 108);
      
      const partyTypeLabel = soaData.partyType === "CUSTOMER" ? "Client / Customer" : soaData.partyType === "VENDOR" ? "Vendor / Supplier" : "Staff Member";
      doc.rect(40, 126, 515, 45).fill("#f8fafc").strokeColor("#e2e8f0").lineWidth(0.5).stroke();
      
      doc.font("Roboto-Bold").fontSize(8).fillColor("#475569").text(`${partyTypeLabel.toUpperCase()} DETAILS:`, 50, 134);
      doc.font("Roboto-Bold").fontSize(10).fillColor("#0f172a").text(soaData.partyInfo.name || "Valued Party", 50, 146);
      if (soaData.partyInfo.phone) {
        doc.font("Roboto-Regular").fontSize(8).fillColor("#64748b").text(`Phone: ${soaData.partyInfo.phone}`, 50, 158);
      }

      doc.font("Roboto-Bold").fontSize(8).fillColor("#475569").text("STATEMENT PERIOD:", 360, 134);
      doc.font("Roboto-Regular").fontSize(8).fillColor("#0f172a").text(`${soaData.period.startDate} to ${soaData.period.endDate}`, 360, 146);
      doc.font("Roboto-Bold").fontSize(8).fillColor("#0284c7").text(`Opening Balance: PKR ${Math.round(soaData.openingBalance).toLocaleString()}`, 360, 158);

      // 3. Table Header
      let y = 182;
      doc.rect(40, y, 515, 18).fill("#0f172a").stroke();
      doc.font("Roboto-Bold").fontSize(7.5).fillColor("#ffffff");
      doc.text("Date", 46, y + 5);
      doc.text("Ref / Voucher", 96, y + 5);
      doc.text("Type", 160, y + 5);
      doc.text("Description & Particulars", 210, y + 5, { width: 170 });
      doc.text("Debit (PKR)", 385, y + 5, { width: 50, align: "right" });
      doc.text("Credit (PKR)", 440, y + 5, { width: 50, align: "right" });
      doc.text("Balance (PKR)", 495, y + 5, { width: 55, align: "right" });

      y += 18;

      // Table Rows
      const transactions = soaData.transactions || [];
      if (transactions.length === 0) {
        doc.rect(40, y, 515, 25).fill("#ffffff").strokeColor("#e2e8f0").lineWidth(0.5).stroke();
        doc.font("Roboto-Regular").fontSize(8).fillColor("#94a3b8").text("No transactions recorded during this period.", 50, y + 8, { align: "center", width: 495 });
        y += 25;
      } else {
        transactions.forEach((tx: any, idx: number) => {
          if (y > 730) {
            doc.addPage();
            y = 40;
            // Repeat table header
            doc.rect(40, y, 515, 18).fill("#0f172a").stroke();
            doc.font("Roboto-Bold").fontSize(7.5).fillColor("#ffffff");
            doc.text("Date", 46, y + 5);
            doc.text("Ref / Voucher", 96, y + 5);
            doc.text("Type", 160, y + 5);
            doc.text("Description & Particulars", 210, y + 5, { width: 170 });
            doc.text("Debit (PKR)", 385, y + 5, { width: 50, align: "right" });
            doc.text("Credit (PKR)", 440, y + 5, { width: 50, align: "right" });
            doc.text("Balance (PKR)", 495, y + 5, { width: 55, align: "right" });
            y += 18;
          }

          const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
          doc.rect(40, y, 515, 18).fill(rowBg).strokeColor("#e2e8f0").lineWidth(0.5).stroke();

          doc.font("Roboto-Regular").fontSize(7).fillColor("#475569").text(tx.date, 46, y + 5);
          doc.font("Roboto-Bold").fontSize(7).fillColor("#0f172a").text(tx.referenceNumber || "-", 96, y + 5, { width: 60 });
          doc.font("Roboto-Regular").fontSize(6.5).fillColor("#64748b").text(tx.docType || "JV", 160, y + 5);
          doc.font("Roboto-Regular").fontSize(7).fillColor("#1e293b").text(tx.description || "-", 210, y + 5, { width: 170, ellipsis: true });

          doc.font("Roboto-Bold").fontSize(7).fillColor(tx.debit > 0 ? "#0f172a" : "#94a3b8").text(tx.debit > 0 ? Math.round(tx.debit).toLocaleString() : "-", 385, y + 5, { width: 50, align: "right" });
          doc.font("Roboto-Bold").fontSize(7).fillColor(tx.credit > 0 ? "#0f172a" : "#94a3b8").text(tx.credit > 0 ? Math.round(tx.credit).toLocaleString() : "-", 440, y + 5, { width: 50, align: "right" });
          
          doc.font("Roboto-Bold").fontSize(7.5).fillColor(tx.runningBalance >= 0 ? "#0284c7" : "#e11d48").text(Math.round(tx.runningBalance).toLocaleString(), 495, y + 5, { width: 55, align: "right" });

          y += 18;
        });
      }

      // Summary Box
      y += 10;
      doc.rect(40, y, 515, 26).fill("#f1f5f9").strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.font("Roboto-Bold").fontSize(8).fillColor("#0f172a");
      doc.text(`Total Period Debits: PKR ${Math.round(soaData.totals?.totalDebit || 0).toLocaleString()}`, 50, y + 9);
      doc.text(`Total Period Credits: PKR ${Math.round(soaData.totals?.totalCredit || 0).toLocaleString()}`, 230, y + 9);
      
      const closeBal = Math.round(soaData.totals?.closingBalance || 0);
      const closeLabel = closeBal > 0 ? "Net Receivable" : closeBal < 0 ? "Net Payable / Advance" : "Settled";
      doc.font("Roboto-Bold").fontSize(9).fillColor(closeBal >= 0 ? "#0284c7" : "#e11d48").text(`Closing Balance: PKR ${Math.abs(closeBal).toLocaleString()} (${closeLabel})`, 380, y + 9, { width: 165, align: "right" });

      // Bottom Universal Footer
      const footerY = 790;
      doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor("#cbd5e1").lineWidth(0.5).stroke();
      doc.font("Roboto-Regular").fontSize(7.5).fillColor("#64748b");
      doc.text("Technicool Engineering Enterprise Operations  |  Financial Sub-Ledger System", 40, footerY + 6, { align: "left" });
      doc.font("Roboto-Bold").fontSize(7.5).fillColor("#2563eb");
      doc.text("Official Statement of Account", 350, footerY + 6, { align: "right", width: 205 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}


