"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, Download, Printer, Loader2, FileText } from "lucide-react";

export default function SignedAgreementPage() {
  const { user, isLoading } = useAuth();
  const hiring = useQuery(api.editorHiring.getMyEditorHiring, {});

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">Please sign in.</p>
      </div>
    );
  }

  if (user.role !== "EDITOR" && user.role !== "PM") {
    return (
      <div className="text-center py-20">
        <p className="text-zinc-400">This page is only for editors and PMs.</p>
      </div>
    );
  }

  const pdfUrl = hiring?.hiring?.signedAgreementPdfUrl;

  const handlePrint = () => {
    if (pdfUrl) {
      const w = window.open(pdfUrl, "_blank", "width=800,height=600");
      if (w) {
        w.onload = () => {
          w.print();
          w.close();
        };
      } else {
        window.location.href = pdfUrl;
      }
    }
  };

  const handleDownload = () => {
    if (pdfUrl) {
      const a = document.createElement("a");
      a.href = pdfUrl;
      a.download = "muffer-partner-agreement-signed.pdf";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <CheckCircle className="w-7 h-7 text-emerald-400" />
            Agreement Signed
          </h1>
          <p className="text-zinc-400 mt-1">
            Your Muffer Partner Agreement has been signed successfully.
          </p>
        </div>
      </div>

      <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Signed Agreement
        </h2>

        {pdfUrl ? (
          <>
            <p className="text-sm text-zinc-400">
              View, print, or download your signed agreement below.
            </p>

            <div className="aspect-3/4 max-h-[500px] rounded-lg border border-zinc-800 overflow-hidden bg-zinc-950">
              <iframe
                src={pdfUrl}
                title="Signed Muffer Partner Agreement"
                className="w-full h-full"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handlePrint}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="outline"
                  className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                >
                  Open in new tab
                </Button>
              </a>
            </div>
          </>
        ) : (
          <div className="p-6 rounded-lg bg-zinc-800/50 border border-zinc-700">
            <p className="text-sm text-zinc-400">
              Your agreement has been signed. The PDF may take a moment to appear.
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              If the PDF does not load, you can still access your dashboard and start working on projects.
            </p>
          </div>
        )}

        <div className="pt-4 border-t border-zinc-800">
          <Link href="/dashboard">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
