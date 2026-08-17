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
        const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
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
      doc.font("Roboto-Bold").fontSize(10).fillColor("#000000").text("Customer:", 50, 135, { underline: true });
      doc.font("Roboto-Regular").fontSize(10).text(complaintData.customerName || "", 110, 135);
      doc.moveTo(110, 145).lineTo(310, 145).strokeColor("#000000").lineWidth(1).stroke();

      doc.font("Roboto-Bold").fontSize(10).text("Site:", 50, 160, { underline: true });
      doc.font("Roboto-Regular").fontSize(9).text(complaintData.customerAddress || "", 85, 160, { width: 225, height: 25 });
      doc.moveTo(85, 170).lineTo(310, 170).strokeColor("#000000").stroke();
      doc.moveTo(50, 185).lineTo(310, 185).strokeColor("#000000").stroke();

      // Right metadata
      doc.font("Roboto-Bold").fontSize(10).text("Date:", 340, 135);
      doc.font("Roboto-Regular").fontSize(10).text(new Date(complaintData.date).toLocaleDateString("en-GB"), 380, 135);
      doc.moveTo(380, 145).lineTo(550, 145).strokeColor("#000000").stroke();

      doc.font("Roboto-Bold").fontSize(10).text("Location:", 340, 155);
      doc.moveTo(395, 165).lineTo(550, 165).strokeColor("#000000").stroke();

      doc.font("Roboto-Bold").fontSize(10).text("Complaint #", 340, 175);
      doc.font("Roboto-Regular").fontSize(10).text(complaintData.complaintNumber || "", 410, 175);
      doc.moveTo(410, 185).lineTo(550, 185).strokeColor("#000000").stroke();

      // Reported Problem
      doc.font("Roboto-Bold").fontSize(10).text("Reported Problem:", 50, 205);
      doc.font("Roboto-Regular").fontSize(9).text(complaintData.description || "", 150, 205, { width: 400 });
      doc.moveTo(150, 215).lineTo(550, 215).strokeColor("#000000").stroke();

      // Table Grid
      let tableY = 240;
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
        doc.moveTo(50, tableY + i * 20).lineTo(550, tableY + i * 20).strokeColor("#000000").lineWidth(1).stroke();
      }
      // Draw vertical lines
      let currX = 50;
      doc.moveTo(currX, tableY).lineTo(currX, tableY + 120).strokeColor("#000000").stroke(); // far left
      currX += colWidths[0];
      doc.moveTo(currX, tableY).lineTo(currX, tableY + 120).strokeColor("#000000").stroke(); // col 1 divider
      currX += colWidths[1];
      doc.moveTo(currX, tableY).lineTo(currX, tableY + 120).strokeColor("#000000").stroke(); // col 2 divider
      currX += colWidths[2];
      doc.moveTo(currX, tableY).lineTo(currX, tableY + 120).strokeColor("#000000").stroke(); // col 3 divider
      currX += colWidths[3];
      doc.moveTo(currX, tableY).lineTo(currX, tableY + 120).strokeColor("#000000").stroke(); // far right

      // Fill in text
      doc.font("Roboto-Regular").fontSize(9).fillColor("#000000");
      for (let r = 0; r < 6; r++) {
        const yPos = tableY + r * 20 + 5;
        doc.text(rowLabels[r][0], 55, yPos, { width: 120 });
        doc.text(rowLabels[r][1], 305, yPos, { width: 120 });
      }

      // Remarks
      let currentY = tableY + 140;
      doc.font("Roboto-Bold").fontSize(10).text("Technician Remarks.", 50, currentY, { underline: true });
      doc.font("Roboto-Regular").fontSize(9).text(complaintData.remarks || "", 50, currentY + 15, { width: 500 });
      doc.moveTo(50, currentY + 30).lineTo(550, currentY + 30).strokeColor("#000000").stroke();

      currentY += 45;
      doc.font("Roboto-Bold").fontSize(10).text("Customer remarks:", 50, currentY, { underline: true });
      doc.moveTo(50, currentY + 30).lineTo(550, currentY + 30).strokeColor("#000000").stroke();

      // Footer signatures
      currentY += 80;
      doc.font("Roboto-Bold").fontSize(11).text("Technician", 50, currentY);
      doc.font("Roboto-Regular").fontSize(9).text("Sign .......................", 50, currentY + 20);
      const techNameStr = complaintData.technician?.name || "";
      doc.text(`Name: ${techNameStr}`, 50, currentY + 35);

      doc.font("Roboto-Bold").fontSize(11).text("Verified by client", 380, currentY);
      doc.font("Roboto-Regular").fontSize(9).text("Sign & stamp .......................", 380, currentY + 20);
      const clientNameStr = complaintData.customerName || "";
      doc.text(`Name: ${clientNameStr}`, 380, currentY + 35);

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

