"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CheckCircle, FileText, Loader2 } from "lucide-react";
import { PrinciplesModals } from "@/components/onboarding/PrinciplesModals";
import { TestTaskSelection } from "@/components/onboarding/TestTaskSelection";

function parseCommaList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const NDA_CHECKBOXES_FOR_PDF = [
  "I understand Muffer is output-based pay, not hourly",
  "I understand Accept = TAT clock starts",
  "I understand 2 revision cycles are included per project",
  "I understand extra revision payout applies only for client scope change",
  "I understand revisions due to missed guidelines/typos are unpaid",
  "I understand uncommunicated delay of 60+ minutes triggers reliability deductions",
  "I understand extension requests must be made 2+ hours before deadline",
  "I understand \"done\" means approved final delivery, not first export",
  "I agree to confidentiality and licensed/original assets only",
];

export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const hiring = useQuery(api.editorHiring.getMyEditorHiring, {});
  const updateDetails = useMutation(api.editorHiring.updateMyOnboardingDetails);
  const acceptNda = useMutation(api.editorHiring.acceptNda);
  const createTestProject = useMutation(api.editorHiring.createTestProject);
  const completePrinciples = useMutation(api.editorHiring.completePrinciples);
  const selectTestTask = useMutation(api.editorHiring.selectTestTask);
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);

  const [phone, setPhone] = useState("");
  const [skills, setSkills] = useState("");
  const [tools, setTools] = useState("");
  const [experience, setExperience] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");
  const [formSaved, setFormSaved] = useState(false);

  const [ndaChecked, setNdaChecked] = useState(false);
  const [ndaName, setNdaName] = useState("");
  const [ndaFathersName, setNdaFathersName] = useState("");
  const [ndaIAgree, setNdaIAgree] = useState("");
  const [ndaFullName, setNdaFullName] = useState("");
  const [ndaViewedToEndEditor, setNdaViewedToEndEditor] = useState(false);
  const [ndaOpen, setNdaOpen] = useState(false);
  const [ndaOpenedOnce, setNdaOpenedOnce] = useState(false);
  const [ndaViewedToEnd, setNdaViewedToEnd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [creatingTest, setCreatingTest] = useState(false);

  const ndaScrollRef = useRef<HTMLDivElement | null>(null);

  const statusLabel = useMemo(() => {
    const s = hiring?.hiring?.status;
    if (!s) return null;
    if (s === "ONBOARDING") return { text: "Onboarding", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" };
    if (s === "READY_FOR_REVIEW") return { text: "Submitted (awaiting admin)", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
    if (s === "APPROVED") return { text: "Approved", className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    if (s === "REJECTED") return { text: "Rejected", className: "bg-red-500/10 text-red-400 border-red-500/20" };
    return { text: s, className: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" };
  }, [hiring?.hiring?.status]);

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

  const isEditor = user.role === "EDITOR";
  const isPM = user.role === "PM";

  if (isEditor && !hiring?.hiring?.principlesCompletedAt) {
    return (
      <PrinciplesModals
        onComplete={async () => {
          await completePrinciples({});
        }}
      />
    );
  }

  if (isEditor && hiring?.hiring?.principlesCompletedAt && !hiring?.hiring?.testTaskType) {
    return (
      <div className="space-y-6 animate-fade-in">
        <TestTaskSelection
          onSelect={async (type, deadlineHours) => {
            await selectTestTask({ type, deadlineHours });
          }}
        />
      </div>
    );
  }

  const handleSave = async () => {
    // Validate required fields
    if (!phone.trim()) {
      alert("Please enter your phone number");
      return;
    }
    if (!skills.trim()) {
      alert("Please enter your skills");
      return;
    }
    if (!experience.trim()) {
      alert("Please tell us about your experience");
      return;
    }
    if (!country.trim()) {
      alert("Please enter your country");
      return;
    }
    if (!city.trim()) {
      alert("Please enter your city");
      return;
    }
    if (!addressLine1.trim()) {
      alert("Please enter your address");
      return;
    }

    setSaving(true);
    try {
      await updateDetails({
        phone: phone || undefined,
        skills: skills ? parseCommaList(skills) : undefined,
        tools: tools ? parseCommaList(tools) : undefined,
        experience: experience || undefined,
        addressLine1: addressLine1 || undefined,
        addressLine2: addressLine2 || undefined,
        city: city || undefined,
        state: state || undefined,
        postalCode: postalCode || undefined,
        country: country || undefined,
      });
      setFormSaved(true);
    } finally {
      setSaving(false);
    }
  };

  // Check if user data is already saved (for initial load)
  const hasSubmittedDetails = user?.phone && user?.skills && user?.experience && user?.country && user?.city && user?.addressLine1;
  
  // Use formSaved state or check if user has already submitted
  const shouldShowSummary = formSaved || (hiring?.hiring?.status !== "ONBOARDING" && hasSubmittedDetails);

  const handleAccept = async () => {
    if (!ndaOpenedOnce) return;
    if (!ndaViewedToEnd) return;
    if (!ndaChecked) return;
    if (!ndaName.trim()) return;
    setAccepting(true);
    try {
      await acceptNda({ fullName: ndaName.trim() });
    } finally {
      setAccepting(false);
    }
  };

  const handleCreateTestProject = async () => {
    setCreatingTest(true);
    try {
      await createTestProject({});
    } finally {
      setCreatingTest(false);
    }
  };

  const showNdaCard = isPM;
  const showNdaDialog = showNdaCard;
  const showEditorNdaMultiStep = isEditor && hiring?.hiring?.status === "APPROVED" && !hiring?.hiring?.ndaAcceptedAt;
  const ndaEditorCanSign =
    ndaViewedToEndEditor &&
    ndaFullName.trim().length > 0 &&
    ndaFathersName.trim().length > 0 &&
    ndaIAgree.trim().toLowerCase() === "i agree";

  const handleNdaSignEditor = async () => {
    if (!ndaEditorCanSign || accepting) return;
    await handleNdaSign(ndaFullName.trim(), ndaFathersName.trim());
  };

  const handleNdaSign = async (fullName: string, fathersName?: string) => {
    let storageId: string | undefined;
    try {
      const pdfRes = await fetch("/api/generate-agreement-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          fathersName: fathersName?.trim() || undefined,
          checkboxes: NDA_CHECKBOXES_FOR_PDF,
        }),
      });
      if (pdfRes.ok) {
        const pdfBlob = await pdfRes.blob();
        const uploadUrl = await generateUploadUrl({});
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/pdf" },
          body: pdfBlob,
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          storageId = data.storageId;
        }
      }
    } catch {
      // Continue without PDF
    }
    setAccepting(true);
    try {
      await acceptNda({
        fullName: fullName.trim(),
        fathersName: fathersName?.trim() || undefined,
        ...(storageId && { signedAgreementStorageId: storageId as Id<"_storage"> }),
      });
      window.location.href = "/onboarding/signed";
    } finally {
      setAccepting(false);
    }
  };

  // Approved editor, NDA not signed: show ONLY NDA signing interface
  if (showEditorNdaMultiStep) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Sign Muffer Partner Agreement</h1>
            <p className="text-zinc-400 mt-1">
              Read the full agreement below, then enter your details and type &quot;I Agree&quot; to sign.
            </p>
          </div>
          {statusLabel && (
            <Badge className={statusLabel.className}>{statusLabel.text}</Badge>
          )}
        </div>

        <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-200">Muffer Partner Agreement</h2>
          <div
            ref={ndaScrollRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              const isBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
              if (isBottom) setNdaViewedToEndEditor(true);
            }}
            className="max-h-[320px] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-4 text-sm text-zinc-300 leading-6"
          >
            <div className="space-y-4">
              <p>
                This Partner Agreement (&quot;Agreement&quot;) is made between Devaxtrous Studios LLP (operating under the brand &quot;Muffer&quot;), having its registered office at 2nd Floor, JSV Hyundai Building CP-53, near Engineering College Chauraha, near CNG Petrol Pump, Lucknow, Uttar Pradesh 226021 (&quot;Company&quot;), and the undersigned creative partner (&quot;Partner&quot;).
              </p>
              <p>This Agreement combines the terms of the Non-Disclosure Agreement (NDA) and the Partner Terms of Engagement, collectively governing the relationship between Muffer and its freelance creative partners.</p>
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">1. Confidentiality &amp; Non-Disclosure</h4>
                <p>The Partner acknowledges that all materials, raw footage, project briefs, client information, or any related assets shared by Muffer constitute Confidential Information. The Partner agrees to use such information solely for performing assigned Muffer projects; not share, disclose, copy, or repurpose any material for personal or external use; delete all files within seven (7) days after completion unless explicitly authorized in writing; and keep all project files secure and private at all times.</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">2. Non-Circumvention</h4>
                <p>The Partner shall not contact, solicit, or work directly with any Muffer client for independent or outside projects without prior written consent from Muffer for twelve (12) months after their last project engagement.</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">3. Ownership</h4>
                <p>All raw materials, edits, deliverables, and creative outputs remain the exclusive property of Muffer and/or its clients. The Partner shall not publish, display, or include any part of the work in a public or private portfolio without written permission.</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">4. Relationship of the Parties</h4>
                <p>The Partner operates as an independent contractor, not an employee of Muffer. The Partner is responsible for their own taxes, equipment, and workspace.</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">5. Assignment &amp; Delivery</h4>
                <p>Work must be submitted within the agreed Turnaround Time (TAT). Muffer may request up to two (2) reasonable revisions without additional charge. Consistent delays or missed deadlines may result in reduced payout or removal from active projects.</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">6. Quality &amp; Performance Standards</h4>
                <p>The Partner agrees to maintain high creative and technical standards, use only licensed or royalty-free assets and software, follow brand and formatting SOPs, and avoid the use of AI tools or external contractors without written permission.</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">7. Communication &amp; Conduct</h4>
                <p>Communication must be through official Muffer channels. Partners must respond within reasonable time frames. Professionalism and respectful communication are mandatory.</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">8. Payment Terms</h4>
                <p>Payments are processed between the 10th and 15th of each month for work completed and approved in the previous month. Payments are made via UPI or bank transfer.</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">9. Termination</h4>
                <p>Muffer may terminate collaboration immediately if the Partner breaches confidentiality or ownership, misses multiple deadlines, misuses project data, or engages in unprofessional behavior.</p>
              </div>
              <div>
                <h4 className="font-semibold text-zinc-200 mb-2">10. Governing Law &amp; Jurisdiction</h4>
                <p>This Agreement shall be governed by and interpreted under the laws of India. All disputes shall fall under the exclusive jurisdiction of the courts in Lucknow, Uttar Pradesh.</p>
              </div>
              <div className="pt-4 text-center text-xs text-zinc-500">
                End of agreement. Scroll to bottom to enable signing.
              </div>
            </div>
          </div>

          {ndaViewedToEndEditor && (
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
              ✓ Reached end — you may sign below
            </Badge>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Full name</label>
              <Input
                value={ndaFullName}
                onChange={(e) => setNdaFullName(e.target.value)}
                placeholder={user.name ?? "Your full legal name"}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Father&apos;s name</label>
              <Input
                value={ndaFathersName}
                onChange={(e) => setNdaFathersName(e.target.value)}
                placeholder="Father's full name"
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-300">Type &quot;I Agree&quot; to confirm</label>
            <Input
              value={ndaIAgree}
              onChange={(e) => setNdaIAgree(e.target.value)}
              placeholder="I Agree"
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

          <Button
            onClick={handleNdaSignEditor}
            disabled={!ndaEditorCanSign || accepting}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white"
          >
            {accepting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Sign &amp; Accept
              </>
            )}
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">
            {isEditor ? "Editor Onboarding" : "PM Onboarding"}
          </h1>
          <p className="text-zinc-400 mt-1">
            {isEditor
              ? "Complete your details and submit the test project. After admin approval, you'll sign the NDA."
              : "Complete your details and accept the NDA. After admin approval, you’ll be able to manage projects."}
          </p>
        </div>
        {statusLabel && (
          <Badge className={statusLabel.className}>
            {statusLabel.text}
          </Badge>
        )}
      </div>

      <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-4">
        <h2 className="text-lg font-semibold text-zinc-200">1) Your details</h2>
        {!shouldShowSummary ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91..."
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Country</label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="India"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Skills (comma-separated)</label>
                <Input
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  placeholder="Premiere Pro, After Effects, Shorts..."
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Tools (comma-separated)</label>
                <Input
                  value={tools}
                  onChange={(e) => setTools(e.target.value)}
                  placeholder="Premiere, AE, DaVinci..."
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Experience</label>
              <Textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder="Tell us briefly about your experience..."
                className="bg-zinc-800 border-zinc-700 text-zinc-100 min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Address line 1</label>
                <Input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street, area"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Address line 2</label>
                <Input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, landmark"
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">City</label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">State</label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">Postal code</label>
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-zinc-100"
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save details"}
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Phone</p>
                  <p className="text-sm text-zinc-300">{phone || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Country</p>
                  <p className="text-sm text-zinc-300">{country || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {skills ? parseCommaList(skills).map((skill) => (
                      <span key={skill} className="inline-block px-2 py-1 text-xs bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                        {skill}
                      </span>
                    )) : <p className="text-sm text-zinc-400">—</p>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 mb-1">Tools</p>
                  <div className="flex flex-wrap gap-2">
                    {tools ? parseCommaList(tools).map((tool) => (
                      <span key={tool} className="inline-block px-2 py-1 text-xs bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                        {tool}
                      </span>
                    )) : <p className="text-sm text-zinc-400">—</p>}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-1">Experience</p>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{experience || "—"}</p>
              </div>

              <div>
                <p className="text-xs text-zinc-500 mb-1">Address</p>
                <p className="text-sm text-zinc-300">
                  {[addressLine1, addressLine2, city, state, postalCode, country]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setFormSaved(false)}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Edit details
            </Button>
          </>
        )}
      </Card>

      {isEditor && (
        <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-200">2) Test project</h2>
          <p className="text-sm text-zinc-400">
            Your test project won&apos;t appear in the Projects list. Create it below, then open it to submit your deliverable in the milestone form (Google Drive link + notes) — not in chat.
          </p>
          {!shouldShowSummary ? (
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <p className="text-sm text-yellow-300">
                ✓ Please fill and save your details above first (all fields marked are required).
              </p>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {hiring?.testProject?.slug ? (
                <Link href={`/projects/${hiring.testProject.slug}`}>
                  <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    Open test project
                  </Button>
                </Link>
              ) : (
                <Button
                  onClick={handleCreateTestProject}
                  disabled={creatingTest}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {creatingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create test project"}
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      {isEditor && hiring?.hiring?.status === "APPROVED" && hiring?.hiring?.ndaAcceptedAt && (
        <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-200">3) NDA</h2>
          <p className="text-sm text-emerald-400">You&apos;ve signed the NDA. You&apos;re all set.</p>
        </Card>
      )}

      {showNdaCard && (
        <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-4">
          <h2 className="text-lg font-semibold text-zinc-200">{isEditor ? "3) Sign NDA (after approval)" : "2) Agreement (Digital)"}</h2>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNdaOpen(true);
                setNdaOpenedOnce(true);
              }}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              <FileText className="w-4 h-4 mr-2" />
              Open agreement (required)
            </Button>
            {ndaViewedToEnd && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                ✅ Reached end
              </Badge>
            )}
            {hiring?.hiring?.ndaAcceptedAt && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Accepted
              </Badge>
            )}
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={ndaChecked}
              onChange={(e) => setNdaChecked(e.target.checked)}
              disabled={!ndaOpenedOnce || !ndaViewedToEnd}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="text-sm text-zinc-300">
                I have read and agree to the Muffer Partner Agreement.
              </p>
              <p className="text-xs text-zinc-500">
                This records your typed full name and a timestamp. You must open the agreement and scroll to the end before signing.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-400">Type your full name</label>
            <Input
              value={ndaName}
              onChange={(e) => setNdaName(e.target.value)}
              placeholder={user.name}
              disabled={!ndaOpenedOnce || !ndaViewedToEnd}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>

          <Button
            onClick={handleAccept}
            disabled={accepting || !ndaOpenedOnce || !ndaViewedToEnd || !ndaChecked || !ndaName.trim()}
            className="bg-linear-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white"
          >
            {accepting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                {isPM ? "Accept agreement & submit for approval" : "Accept agreement"}
              </>
            )}
          </Button>
        </Card>
      )}

      {isPM && (
        <Card className="p-6 bg-zinc-900/50 border-zinc-800 space-y-3">
          <h2 className="text-lg font-semibold text-zinc-200">3) Approval</h2>
          <p className="text-sm text-zinc-400">
            Once you&apos;re approved by an admin, you&apos;ll be able to start getting projects. Please stay active on
            email/WhatsApp — the admin may reach out for additional info.
          </p>
        </Card>
      )}

      {showNdaDialog && (
        <AlertDialog open={ndaOpen} onOpenChange={setNdaOpen}>
          <AlertDialogContent className="w-[95vw] h-[95vh] max-w-none p-0 overflow-hidden min-h-0">
            <div className="flex flex-col h-full min-h-0">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between gap-3">
                <AlertDialogHeader className="p-0 text-left">
                  <AlertDialogTitle>Muffer Partner Agreement</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter className="p-0">
                  {ndaViewedToEnd && (
                    <Badge className="mr-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                      ✅ Reached end
                    </Badge>
                  )}
                  <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                    Close
                  </AlertDialogCancel>
                </AlertDialogFooter>
              </div>

              <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-950/60">
                <p className="text-sm text-zinc-300">
                  Scroll to the end to enable signing.
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Once you reach the bottom, you can close this and complete the signature fields.
                </p>
              </div>

              <div
                ref={ndaScrollRef}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  const isBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8;
                  if (isBottom) setNdaViewedToEnd(true);
                }}
                className="flex-1 min-h-0 overflow-y-auto bg-zinc-950 px-6 py-6"
              >
                <div className="max-w-4xl mx-auto space-y-5 text-zinc-200">
                  <div>
                    <h3 className="text-xl font-semibold">MUFFER PARTNER AGREEMENT</h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      (Non-Disclosure &amp; Terms of Engagement Combined)
                    </p>
                  </div>

                  <p className="text-sm leading-6 text-zinc-300">
                    This Partner Agreement (“Agreement”) is made between Devaxtrous Studios LLP
                    (operating under the brand “Muffer”), having its registered office at 2nd Floor, JSV Hyundai
                    Building CP-53, near Engineering College Chauraha, near CNG Petrol Pump,
                    Lucknow, Uttar Pradesh 226021 (“Company”), and the undersigned creative partner (“Partner”).
                  </p>

                  <p className="text-sm leading-6 text-zinc-300">
                    This Agreement combines the terms of the Non-Disclosure Agreement (NDA) and the
                    Partner Terms of Engagement, collectively governing the relationship between Muffer and
                    its freelance creative partners, including editors, actors, designers, writers, and similar contributors.
                  </p>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">1. Confidentiality &amp; Non-Disclosure</h4>
                    <p className="text-sm leading-6 text-zinc-300">
                      The Partner acknowledges that all materials, raw footage, project briefs, client information,
                      or any related assets shared by Muffer constitute Confidential Information.
                    </p>
                    <p className="text-sm leading-6 text-zinc-300">The Partner agrees to:</p>
                    <ol className="list-decimal pl-5 space-y-2 text-sm text-zinc-300 leading-6">
                      <li>Use such information solely for performing assigned Muffer projects.</li>
                      <li>Not share, disclose, copy, or repurpose any material for personal or external use.</li>
                      <li>Delete all files within seven (7) days after completion unless explicitly authorized in writing.</li>
                      <li>Keep all project files secure and private at all times.</li>
                    </ol>
                    <p className="text-sm leading-6 text-zinc-300">
                      All intellectual property, including deliverables and work-in-progress files, shall remain the sole property of Muffer and/or its clients.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">2. Non-Circumvention</h4>
                    <p className="text-sm leading-6 text-zinc-300">
                      The Partner shall not contact, solicit, or work directly with any Muffer client—introduced through or known via Muffer—for independent or outside projects
                      without prior written consent from Muffer for a period of twelve (12) months after their last project engagement.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">3. Ownership</h4>
                    <p className="text-sm leading-6 text-zinc-300">
                      All raw materials, edits, deliverables, and creative outputs remain the exclusive property of Muffer and/or its clients.
                      The Partner shall not publish, display, or include any part of the work in a public or private portfolio without written permission from the Company.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">4. Relationship of the Parties</h4>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 leading-6">
                      <li>The Partner operates as an independent contractor, not an employee of Muffer.</li>
                      <li>The Partner is responsible for their own taxes, equipment, and workspace.</li>
                      <li>Nothing in this Agreement shall create an employment, joint venture, or agency relationship.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">5. Assignment &amp; Delivery</h4>
                    <p className="text-sm leading-6 text-zinc-300">
                      Each assignment will include a brief specifying deliverables, deadline, and compensation.
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 leading-6">
                      <li>Work must be submitted within the agreed Turnaround Time (TAT).</li>
                      <li>Muffer may request up to two (2) reasonable revisions without additional charge.</li>
                      <li>Consistent delays or missed deadlines may result in reduced payout or removal from active projects.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">6. Quality &amp; Performance Standards</h4>
                    <p className="text-sm leading-6 text-zinc-300">
                      To uphold Muffer’s promise of “Ab Suffer Nahi, Muffer Karo,” the Partner agrees to:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 leading-6">
                      <li>Maintain high creative and technical standards.</li>
                      <li>Use only licensed or royalty-free assets and software.</li>
                      <li>Follow brand and formatting SOPs provided by Muffer.</li>
                      <li>Avoid the use of AI tools or external contractors without written permission.</li>
                    </ul>
                    <p className="text-sm leading-6 text-zinc-300">
                      Performance is tracked via QC ratings (Technical, Creativity, Timeliness, Communication).
                      Partners maintaining an average QC ≥ 80% become eligible for advanced project tiers and bonuses.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">7. Communication &amp; Conduct</h4>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 leading-6">
                      <li>Communication must be through official Muffer channels (WhatsApp Business, Email, or Project Dashboard).</li>
                      <li>Partners must respond within reasonable time frames (typically within 4 hours during active projects).</li>
                      <li>Professionalism and respectful communication are mandatory.</li>
                      <li>Repeated unresponsiveness or misconduct may lead to immediate removal from active projects.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">8. Payment Terms</h4>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 leading-6">
                      <li>Payments are processed between the 10th and 15th of each month for work completed and approved in the previous month.</li>
                      <li>Payments are made via UPI or bank transfer.</li>
                      <li>Late or incomplete submissions may incur deductions of 10–50%, depending on impact.</li>
                      <li>Rejected work due to non-compliance will not be paid.</li>
                      <li>Muffer may offer bonuses for early delivery, creative excellence, or positive client ratings.</li>
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">9. Incentives &amp; Partner Growth Path</h4>
                    <div className="rounded-lg border border-zinc-800 overflow-hidden">
                      <div className="grid grid-cols-3 bg-zinc-900/40 text-sm font-medium text-zinc-200">
                        <div className="p-3 border-r border-zinc-800">Tier</div>
                        <div className="p-3 border-r border-zinc-800">Criteria</div>
                        <div className="p-3">Benefits</div>
                      </div>
                      <div className="grid grid-cols-3 text-sm text-zinc-300">
                        <div className="p-3 border-t border-r border-zinc-800">Rookie</div>
                        <div className="p-3 border-t border-r border-zinc-800">&lt; 5 projects</div>
                        <div className="p-3 border-t border-zinc-800">Access to basic briefs, training feedback</div>

                        <div className="p-3 border-t border-r border-zinc-800">Pro</div>
                        <div className="p-3 border-t border-r border-zinc-800">5+ projects / QC ≥ 75%</div>
                        <div className="p-3 border-t border-zinc-800">Priority allocation, early payouts</div>

                        <div className="p-3 border-t border-r border-zinc-800">Elite</div>
                        <div className="p-3 border-t border-r border-zinc-800">20+ projects / QC ≥ 85%</div>
                        <div className="p-3 border-t border-zinc-800">Direct client projects, revenue bonuses</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">10. Termination</h4>
                    <p className="text-sm leading-6 text-zinc-300">
                      Muffer may terminate collaboration immediately if the Partner:
                    </p>
                    <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-300 leading-6">
                      <li>Breaches confidentiality or ownership clauses,</li>
                      <li>Misses multiple deadlines or abandons assignments,</li>
                      <li>Misuses or leaks project data, or</li>
                      <li>Engages in unprofessional behavior.</li>
                    </ul>
                    <p className="text-sm leading-6 text-zinc-300">
                      Payments for approved deliverables will be honored. Rejected or incomplete tasks will not be compensated.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">11. Data Security</h4>
                    <p className="text-sm leading-6 text-zinc-300">
                      The Partner agrees to maintain secure file handling, avoid public file-sharing links unless approved, and report any suspected data breach immediately to Muffer’s operations team.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">12. Governing Law &amp; Jurisdiction</h4>
                    <p className="text-sm leading-6 text-zinc-300">
                      This Agreement shall be governed by and interpreted under the laws of India.
                      All disputes shall fall under the exclusive jurisdiction of the courts in Lucknow, Uttar Pradesh.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">13. Duration &amp; Survival</h4>
                    <p className="text-sm leading-6 text-zinc-300">
                      This Agreement becomes effective upon digital acceptance and remains valid for two (2) years from the date of last project completion.
                      Clauses regarding confidentiality, ownership, and non-circumvention shall survive termination indefinitely.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">14. Acceptance</h4>
                    <p className="text-sm leading-6 text-zinc-300">
                      By digitally signing or accepting this Agreement through a Google Form, email confirmation, or other online acknowledgment,
                      the Partner confirms that they have read, understood, and agreed to abide by all the above terms.
                    </p>
                  </div>

                  <div className="rounded-lg border border-zinc-800 p-4 space-y-2">
                    <p className="text-sm text-zinc-200 font-medium">Authorized Signatory for Muffer</p>
                    <p className="text-sm text-zinc-300">Devang Tewari</p>
                    <p className="text-sm text-zinc-300">Founder, Devaxtrous Studios LLP</p>
                    <p className="text-sm text-zinc-400">
                      Registered Office: 2nd Floor, JSV Hyundai Building CP-53, near Engineering College Chauraha, near CNG Petrol Pump, Lucknow – 226021
                    </p>
                  </div>

                  <div className="rounded-lg border border-zinc-800 p-4 space-y-2">
                    <p className="text-sm text-zinc-200 font-medium">Partner Details</p>
                    <p className="text-sm text-zinc-300">Partner Name: ________________________________</p>
                    <p className="text-sm text-zinc-300">Date: ______________________________________</p>
                    <p className="text-sm text-zinc-300">Signature (Digital/Physical): __________________</p>
                  </div>

                  <div className="pt-6 text-center text-xs text-zinc-500">
                    End of agreement.
                  </div>
                </div>
              </div>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
