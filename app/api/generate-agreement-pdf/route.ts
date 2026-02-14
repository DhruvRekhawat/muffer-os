import { NextRequest, NextResponse } from "next/server";

const FULL_NDA_HTML = `
<div class="nda-body">
  <h1>MUFFER PARTNER AGREEMENT</h1>
  <p class="subtitle">(Non-Disclosure &amp; Terms of Engagement Combined)</p>

  <p>This Partner Agreement ("Agreement") is made between Devaxtrous Studios LLP (operating under the brand "Muffer"), having its registered office at 2nd Floor, JSV Hyundai Building CP-53, near Engineering College Chauraha, near CNG Petrol Pump, Lucknow, Uttar Pradesh 226021 ("Company"), and the undersigned creative partner ("Partner").</p>

  <p>This Agreement combines the terms of the Non-Disclosure Agreement (NDA) and the Partner Terms of Engagement, collectively governing the relationship between Muffer and its freelance creative partners, including editors, actors, designers, writers, and similar contributors.</p>

  <div class="section">
    <h2>1. Confidentiality &amp; Non-Disclosure</h2>
    <p>The Partner acknowledges that all materials, raw footage, project briefs, client information, or any related assets shared by Muffer constitute Confidential Information.</p>
    <p>The Partner agrees to:</p>
    <ol>
      <li>Use such information solely for performing assigned Muffer projects.</li>
      <li>Not share, disclose, copy, or repurpose any material for personal or external use.</li>
      <li>Delete all files within seven (7) days after completion unless explicitly authorized in writing.</li>
      <li>Keep all project files secure and private at all times.</li>
    </ol>
    <p>All intellectual property, including deliverables and work-in-progress files, shall remain the sole property of Muffer and/or its clients.</p>
  </div>

  <div class="section">
    <h2>2. Non-Circumvention</h2>
    <p>The Partner shall not contact, solicit, or work directly with any Muffer client—introduced through or known via Muffer—for independent or outside projects without prior written consent from Muffer for a period of twelve (12) months after their last project engagement.</p>
  </div>

  <div class="section">
    <h2>3. Ownership</h2>
    <p>All raw materials, edits, deliverables, and creative outputs remain the exclusive property of Muffer and/or its clients. The Partner shall not publish, display, or include any part of the work in a public or private portfolio without written permission from the Company.</p>
  </div>

  <div class="section">
    <h2>4. Relationship of the Parties</h2>
    <ul>
      <li>The Partner operates as an independent contractor, not an employee of Muffer.</li>
      <li>The Partner is responsible for their own taxes, equipment, and workspace.</li>
      <li>Nothing in this Agreement shall create an employment, joint venture, or agency relationship.</li>
    </ul>
  </div>

  <div class="section">
    <h2>5. Assignment &amp; Delivery</h2>
    <p>Each assignment will include a brief specifying deliverables, deadline, and compensation.</p>
    <ul>
      <li>Work must be submitted within the agreed Turnaround Time (TAT).</li>
      <li>Muffer may request up to two (2) reasonable revisions without additional charge.</li>
      <li>Consistent delays or missed deadlines may result in reduced payout or removal from active projects.</li>
    </ul>
  </div>

  <div class="section">
    <h2>6. Quality &amp; Performance Standards</h2>
    <p>To uphold Muffer's promise of "Ab Suffer Nahi, Muffer Karo," the Partner agrees to:</p>
    <ul>
      <li>Maintain high creative and technical standards.</li>
      <li>Use only licensed or royalty-free assets and software.</li>
      <li>Follow brand and formatting SOPs provided by Muffer.</li>
      <li>Avoid the use of AI tools or external contractors without written permission.</li>
    </ul>
    <p>Performance is tracked via QC ratings (Technical, Creativity, Timeliness, Communication). Partners maintaining an average QC ≥ 80% become eligible for advanced project tiers and bonuses.</p>
  </div>

  <div class="section">
    <h2>7. Communication &amp; Conduct</h2>
    <ul>
      <li>Communication must be through official Muffer channels (WhatsApp Business, Email, or Project Dashboard).</li>
      <li>Partners must respond within reasonable time frames (typically within 4 hours during active projects).</li>
      <li>Professionalism and respectful communication are mandatory.</li>
      <li>Repeated unresponsiveness or misconduct may lead to immediate removal from active projects.</li>
    </ul>
  </div>

  <div class="section">
    <h2>8. Payment Terms</h2>
    <ul>
      <li>Payments are processed between the 10th and 15th of each month for work completed and approved in the previous month.</li>
      <li>Payments are made via UPI or bank transfer.</li>
      <li>Late or incomplete submissions may incur deductions of 10–50%, depending on impact.</li>
      <li>Rejected work due to non-compliance will not be paid.</li>
      <li>Muffer may offer bonuses for early delivery, creative excellence, or positive client ratings.</li>
    </ul>
  </div>

  <div class="section">
    <h2>9. Incentives &amp; Partner Growth Path</h2>
    <p>Tiers: Rookie (&lt;5 projects) – access to basic briefs; Pro (5+ projects / QC ≥75%) – priority allocation; Elite (20+ projects / QC ≥85%) – direct client projects, revenue bonuses.</p>
  </div>

  <div class="section">
    <h2>10. Termination</h2>
    <p>Muffer may terminate collaboration immediately if the Partner breaches confidentiality or ownership, misses multiple deadlines, misuses project data, or engages in unprofessional behavior.</p>
  </div>

  <div class="section">
    <h2>11. Data Security</h2>
    <p>The Partner agrees to maintain secure file handling, avoid public file-sharing links unless approved, and report any suspected data breach immediately to Muffer's operations team.</p>
  </div>

  <div class="section">
    <h2>12. Governing Law &amp; Jurisdiction</h2>
    <p>This Agreement shall be governed by and interpreted under the laws of India. All disputes shall fall under the exclusive jurisdiction of the courts in Lucknow, Uttar Pradesh.</p>
  </div>

  <div class="section">
    <h2>13. Duration &amp; Survival</h2>
    <p>This Agreement becomes effective upon digital acceptance and remains valid for two (2) years from the date of last project completion. Clauses regarding confidentiality, ownership, and non-circumvention shall survive termination indefinitely.</p>
  </div>

  <div class="section">
    <h2>14. Acceptance</h2>
    <p>By digitally signing or accepting this Agreement, the Partner confirms that they have read, understood, and agreed to abide by all the above terms.</p>
  </div>
</div>
`;

const NDA_HTML_TEMPLATE = (
  fullName: string,
  fathersName: string | undefined,
  checkboxes: string[],
  signedAt: string
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Muffer Partner Agreement</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 11px; line-height: 1.5; color: #333; max-width: 700px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
    h2 { font-size: 13px; margin-top: 14px; margin-bottom: 6px; }
    p { margin: 6px 0; }
    ul, ol { margin: 6px 0; padding-left: 20px; }
    .section { margin-bottom: 12px; }
    .nda-body { margin-bottom: 20px; }
    .signature { margin-top: 24px; padding-top: 16px; border-top: 1px solid #ccc; }
    .checkbox-item { margin: 4px 0; }
  </style>
</head>
<body>
  ${FULL_NDA_HTML}
  <h2>Terms acknowledged</h2>
  <ul>
    ${checkboxes.map((c) => `<li class="checkbox-item">${escapeHtml(c)}</li>`).join("")}
  </ul>
  <div class="signature">
    <p><strong>Signed by:</strong> ${escapeHtml(fullName)}</p>
    ${fathersName ? `<p><strong>Father's Name:</strong> ${escapeHtml(fathersName)}</p>` : ""}
    <p><strong>Signed at:</strong> ${escapeHtml(signedAt)}</p>
    <p><strong>Partner name:</strong> ${escapeHtml(fullName)}</p>
    <p><strong>Date:</strong> ${escapeHtml(signedAt)}</p>
  </div>
</body>
</html>
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
    const fathersName = typeof body.fathersName === "string" ? body.fathersName.trim() || undefined : undefined;
    const checkboxes = Array.isArray(body.checkboxes)
      ? body.checkboxes.filter((c: unknown) => typeof c === "string")
      : [];
    if (!fullName) {
      return NextResponse.json({ error: "fullName required" }, { status: 400 });
    }
    const signedAt = new Date().toISOString();

    let puppeteer: typeof import("puppeteer");
    try {
      puppeteer = await import("puppeteer");
    } catch {
      return NextResponse.json(
        { error: "PDF generation not available (puppeteer not installed)" },
        { status: 503 }
      );
    }

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    try {
      const page = await browser.newPage();
      await page.setContent(
        NDA_HTML_TEMPLATE(fullName, fathersName, checkboxes, signedAt),
        { waitUntil: "networkidle0" }
      );
      const pdfBuffer = await page.pdf({
        format: "A4",
        margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        printBackground: true,
      });
      return new NextResponse(new Blob([pdfBuffer as BlobPart], { type: "application/pdf" }), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="muffer-partner-agreement-${Date.now()}.pdf"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("generate-agreement-pdf error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}
