import { NextRequest, NextResponse } from "next/server";

const NDA_HTML_TEMPLATE = (fullName: string, checkboxes: string[], signedAt: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Muffer Partner Agreement</title>
  <style>
    body { font-family: system-ui, sans-serif; font-size: 12px; line-height: 1.5; color: #333; max-width: 700px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 18px; margin-bottom: 8px; }
    h2 { font-size: 14px; margin-top: 16px; margin-bottom: 6px; }
    p { margin: 8px 0; }
    ul { margin: 8px 0; padding-left: 20px; }
    .signature { margin-top: 24px; padding-top: 16px; border-top: 1px solid #ccc; }
    .checkbox-item { margin: 6px 0; }
  </style>
</head>
<body>
  <h1>Muffer Partner Agreement</h1>
  <p><strong>Signed by:</strong> ${escapeHtml(fullName)}</p>
  <p><strong>Signed at:</strong> ${escapeHtml(signedAt)}</p>
  <h2>Terms acknowledged</h2>
  <ul>
    ${checkboxes.map((c) => `<li class="checkbox-item">${escapeHtml(c)}</li>`).join("")}
  </ul>
  <div class="signature">
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
      await page.setContent(NDA_HTML_TEMPLATE(fullName, checkboxes, signedAt), {
        waitUntil: "networkidle0",
      });
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
