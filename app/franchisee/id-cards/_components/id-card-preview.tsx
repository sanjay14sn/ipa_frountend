"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Download,
  Printer,
  Upload,
  RotateCcw,
  Building2,
  User as UserIcon,
  Repeat,
  FileText,
  Calendar,
  Phone,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { uploadedFileSrc } from "@/lib/uploads";
import { formatDate } from "@/lib/date-utils";
import { getStudentLevelName } from "@/components/students/student-helpers";
import type { StudentData } from "@/services/student-list.service";

interface IdCardPreviewProps {
  student: StudentData | null;
  defaultCentreName?: string;
}

export function IdCardPreview({ student, defaultCentreName = "" }: IdCardPreviewProps) {
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");
  const [centreName, setCentreName] = useState(defaultCentreName);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Back side fields (dynamically prefilled from student profile)
  const [backDob, setBackDob] = useState("");
  const [backContactNo, setBackContactNo] = useState("");
  const [backAddress, setBackAddress] = useState("");

  // Sync default centre name when student or user context updates
  useEffect(() => {
    if (student?.franchiseName) {
      setCentreName(student.franchiseName);
    } else if (defaultCentreName) {
      setCentreName(defaultCentreName);
    }
  }, [student, defaultCentreName]);

  // Sync back side data when student changes
  useEffect(() => {
    if (student) {
      const formattedDob = student.dateOfBirth ? formatDate(student.dateOfBirth) : "";
      setBackDob(formattedDob !== "-" ? formattedDob : "");
      setBackContactNo(student.fatherContactNo || student.motherContactNo || "");
      setBackAddress(student.residentialAddress || "");
    } else {
      setBackDob("");
      setBackContactNo("");
      setBackAddress("");
    }
    setCustomPhotoUrl(null);
  }, [student]);

  const levelName = student ? getStudentLevelName(student) : "";
  const photoUrl = customPhotoUrl || (student?.photoPath ? uploadedFileSrc(student.photoPath) : null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, or WebP).");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setCustomPhotoUrl(objectUrl);
    toast.success("Custom photo applied to preview!");
  };

  const handleResetPhoto = () => {
    setCustomPhotoUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Helper to draw punch holes on any 1024x673 canvas
   */
  const drawPunchHoles = (ctx: CanvasRenderingContext2D) => {
    const drawSlot = (cx: number, cy: number, pw: number, ph: number) => {
      ctx.save();
      ctx.beginPath();
      if ("roundRect" in ctx && typeof ctx.roundRect === "function") {
        ctx.roundRect(cx - pw / 2, cy - ph / 2, pw, ph, pw / 2);
      } else {
        ctx.rect(cx - pw / 2, cy - ph / 2, pw, ph);
      }
      ctx.fillStyle = "#e2e8f0";
      ctx.fill();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    };
    drawSlot(25, 335, 16, 92);
    drawSlot(999, 335, 16, 92);
  };

  /**
   * Generates Front Side Canvas
   */
  const renderFrontSideCanvas = async (canvas: HTMLCanvasElement): Promise<void> => {
    if (!student) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not initialize 2D canvas context");

    // 1. Load Background Template
    const templateImg = new Image();
    templateImg.crossOrigin = "anonymous";

    await new Promise<void>((resolve, reject) => {
      templateImg.onload = () => resolve();
      templateImg.onerror = () => reject(new Error("Failed to load ID card template"));
      templateImg.src = "/templates/id-card-template.png";
    });

    ctx.drawImage(templateImg, 0, 0, 1024, 673);

    // 2. Draw Student Photo (x: 88, y: 280, w: 215, h: 255)
    const photoBox = { x: 88, y: 280, w: 215, h: 255, r: 12 };

    if (photoUrl) {
      try {
        const photoImg = new Image();
        photoImg.crossOrigin = "anonymous";

        await new Promise<void>((resolve, reject) => {
          photoImg.onload = () => resolve();
          photoImg.onerror = () => reject(new Error("Failed to load photo"));
          photoImg.src = photoUrl;
        });

        ctx.save();
        ctx.beginPath();
        if ("roundRect" in ctx && typeof ctx.roundRect === "function") {
          ctx.roundRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h, photoBox.r);
        } else {
          ctx.rect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);
        }
        ctx.clip();

        const imgRatio = photoImg.width / photoImg.height;
        const boxRatio = photoBox.w / photoBox.h;
        let renderW = photoBox.w;
        let renderH = photoBox.h;
        let renderX = photoBox.x;
        let renderY = photoBox.y;

        if (imgRatio > boxRatio) {
          renderW = photoBox.h * imgRatio;
          renderX = photoBox.x - (renderW - photoBox.w) / 2;
        } else {
          renderH = photoBox.w / imgRatio;
          renderY = photoBox.y - (renderH - photoBox.h) / 2;
        }

        ctx.drawImage(photoImg, renderX, renderY, renderW, renderH);
        ctx.restore();

        // Border around photo
        ctx.save();
        ctx.beginPath();
        if ("roundRect" in ctx && typeof ctx.roundRect === "function") {
          ctx.roundRect(photoBox.x, photoBox.y, photoBox.w, photoBox.h, photoBox.r);
        } else {
          ctx.rect(photoBox.x, photoBox.y, photoBox.w, photoBox.h);
        }
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      } catch {
        drawFallbackAvatar(ctx, photoBox, student.name);
      }
    } else {
      drawFallbackAvatar(ctx, photoBox, student.name);
    }

    // 3. Draw Text Details
    const textX = 330;
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 32px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillText(student.name.toUpperCase(), textX, 330);

    ctx.fillStyle = "#334155";
    ctx.font = "600 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillText(`Roll No: ${student.rollNo || "N/A"}`, textX, 385);

    ctx.fillStyle = "#015924";
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    ctx.fillText(`Centre: ${centreName || "IPA Franchise Centre"}`, textX, 435);

    if (levelName && levelName !== "N/A") {
      ctx.fillStyle = "#64748b";
      ctx.font = "500 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      ctx.fillText(`Level: ${levelName}`, textX, 480);
    }
  };

  /**
   * Generates Back Side Canvas (Date of birth, Contact No, Address, Instructions, Pill)
   */
  const renderBackSideCanvas = (canvas: HTMLCanvasElement): void => {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not initialize 2D canvas context");

    // 1. Clean White Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1024, 673);

    // 2. Outer Card Border
    ctx.save();
    ctx.beginPath();
    if ("roundRect" in ctx && typeof ctx.roundRect === "function") {
      ctx.roundRect(2, 2, 1020, 669, 24);
    } else {
      ctx.rect(2, 2, 1020, 669);
    }
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 3. Punch Holes
    drawPunchHoles(ctx);

    // 4. Details Header Section
    ctx.fillStyle = "#0f172a";

    // Date of Birth
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Date of Birth", 70, 75);
    ctx.fillText(":", 255, 75);
    ctx.fillText(backDob || "—", 285, 75);

    // Contact No
    ctx.fillText("Contact No", 70, 135);
    ctx.fillText(":", 255, 135);
    ctx.fillText(backContactNo || "—", 285, 135);

    // Address (supports multi-line wrap)
    ctx.fillText("Address", 70, 195);
    ctx.fillText(":", 255, 195);

    const addressLines = (backAddress || "—")
      .split("\n")
      .flatMap((line) => {
        if (line.length <= 42) return [line];
        const words = line.split(" ");
        const chunks: string[] = [];
        let curr = "";
        for (const w of words) {
          if ((curr + " " + w).trim().length <= 42) {
            curr = (curr + " " + w).trim();
          } else {
            chunks.push(curr);
            curr = w;
          }
        }
        if (curr) chunks.push(curr);
        return chunks;
      });

    let addrY = 195;
    for (const line of addressLines.slice(0, 3)) {
      ctx.fillText(line.toUpperCase(), 285, addrY);
      addrY += 35;
    }

    // 5. Instructions Section
    ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillText("Instructions", 70, 335);

    // Underline
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(70, 345);
    ctx.lineTo(215, 345);
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    ctx.font = "600 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.fillText(
      "1.  It is to be surrendered on completion of course with IPA.",
      70,
      385
    );
    ctx.fillText(
      "2.  Loss of card to be reported immediately to corporate office.",
      70,
      430
    );
    ctx.fillText(
      "3.  The card is property of Ideal Play Abacus India Pvt. Ltd.",
      70,
      475
    );

    // 6. Rounded Pill at Bottom: "If found, please return to the corporate office"
    const pillW = 620;
    const pillH = 58;
    const pillX = (1024 - pillW) / 2;
    const pillY = 555;

    ctx.save();
    ctx.beginPath();
    if ("roundRect" in ctx && typeof ctx.roundRect === "function") {
      ctx.roundRect(pillX, pillY, pillW, pillH, 29);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.strokeStyle = "#0f172a";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 21px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("If found, please return to the corporate office", pillX + pillW / 2, pillY + pillH / 2);
    ctx.restore();
  };

  /**
   * Handles downloading Front, Back, or Both sides
   */
  const handleDownload = async (sideToDownload: "front" | "back") => {
    if (!student) {
      toast.error("Please select a student first.");
      return;
    }

    setIsGenerating(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 673;

      if (sideToDownload === "front") {
        await renderFrontSideCanvas(canvas);
      } else {
        renderBackSideCanvas(canvas);
      }

      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate image file.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const filename = `${student.rollNo || student.name}_ID_Card_${sideToDownload.toUpperCase()}.png`.replace(
          /\s+/g,
          "_"
        );
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success(`Downloaded: ${filename}`);
      }, "image/png");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error generating ID card";
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const drawFallbackAvatar = (
    ctx: CanvasRenderingContext2D,
    box: { x: number; y: number; w: number; h: number; r: number },
    name: string
  ) => {
    ctx.save();
    ctx.beginPath();
    if ("roundRect" in ctx && typeof ctx.roundRect === "function") {
      ctx.roundRect(box.x, box.y, box.w, box.h, box.r);
    } else {
      ctx.rect(box.x, box.y, box.w, box.h);
    }
    ctx.fillStyle = "#f1f5f9";
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 3;
    ctx.stroke();

    const initials =
      name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase() || "IPA";
    ctx.fillStyle = "#015924";
    ctx.font = "bold 56px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials, box.x + box.w / 2, box.y + box.h / 2);
    ctx.restore();
  };

  /**
   * Handles opening a standalone print window for standard CR80 ID Card dimensions.
   * Can print active side or double-sided.
   */
  const handlePrint = (mode: "active" | "both") => {
    if (!student) {
      toast.error("Please select a student first.");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Please allow popups to print the ID card.");
      return;
    }

    const initials = student.name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    const photoHtml = photoUrl
      ? `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
      : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 38px; font-weight: bold; color: #015924; background: #f1f5f9;">${initials}</div>`;

    const frontCardHtml = `
      <div class="card card-front">
        <div class="photo">${photoHtml}</div>
        <div class="details">
          <div class="name">${student.name}</div>
          <div class="roll">Roll No: ${student.rollNo || "N/A"}</div>
          <div class="centre">Centre: ${centreName || "IPA Franchise Centre"}</div>
          ${levelName && levelName !== "N/A" ? `<div class="level">Level: ${levelName}</div>` : ""}
        </div>
      </div>
    `;

    const backCardHtml = `
      <div class="card card-back">
        <div class="back-header">
          <div class="row">
            <span class="label">Date of Birth</span>
            <span class="colon">:</span>
            <span class="val">${backDob || "—"}</span>
          </div>
          <div class="row">
            <span class="label">Contact No</span>
            <span class="colon">:</span>
            <span class="val">${backContactNo || "—"}</span>
          </div>
          <div class="row">
            <span class="label">Address</span>
            <span class="colon">:</span>
            <span class="val uppercase">${(backAddress || "—").replace(/\n/g, "<br/>")}</span>
          </div>
        </div>

        <div class="instructions-section">
          <div class="inst-title">Instructions</div>
          <div class="inst-item">1. It is to be surrendered on completion of course with IPA.</div>
          <div class="inst-item">2. Loss of card to be reported immediately to corporate office.</div>
          <div class="inst-item">3. The card is property of Ideal Play Abacus India Pvt. Ltd.</div>
        </div>

        <div class="pill-box">
          If found, please return to the corporate office
        </div>
      </div>
    `;

    let cardsHtml = "";
    if (mode === "both") {
      cardsHtml = frontCardHtml + backCardHtml;
    } else if (activeSide === "front") {
      cardsHtml = frontCardHtml;
    } else {
      cardsHtml = backCardHtml;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${student.name} - ID Card</title>
          <style>
            @page {
              size: 85.6mm 54mm;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card {
              position: relative;
              width: 85.6mm;
              height: 54mm;
              box-sizing: border-box;
              overflow: hidden;
              page-break-after: always;
            }
            .card-front {
              background-image: url('/templates/id-card-template.png');
              background-size: cover;
              background-position: center;
            }
            .card-back {
              background: #ffffff;
              padding: 4mm 6mm;
              border: 1px solid #cbd5e1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
            }
            .photo {
              position: absolute;
              left: 8.6%;
              top: 41.6%;
              width: 21%;
              height: 38%;
              border-radius: 4px;
              overflow: hidden;
              border: 1px solid #cbd5e1;
            }
            .details {
              position: absolute;
              left: 32.2%;
              top: 43%;
              right: 28%;
            }
            .name {
              font-size: 11pt;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              margin: 0 0 4px 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .roll {
              font-size: 8pt;
              font-weight: 700;
              color: #334155;
              margin: 0 0 3px 0;
            }
            .centre {
              font-size: 8pt;
              font-weight: 800;
              color: #015924;
              margin: 0 0 3px 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .level {
              font-size: 7pt;
              font-weight: 600;
              color: #64748b;
              margin: 0;
            }
            /* Back styles */
            .back-header {
              font-size: 7.5pt;
              color: #0f172a;
            }
            .row {
              display: flex;
              margin-bottom: 2mm;
            }
            .label {
              width: 22mm;
              font-weight: 700;
            }
            .colon {
              width: 3mm;
              font-weight: 700;
            }
            .val {
              flex: 1;
              font-weight: 700;
            }
            .uppercase {
              text-transform: uppercase;
            }
            .instructions-section {
              margin-top: 1mm;
            }
            .inst-title {
              font-size: 7.5pt;
              font-weight: 800;
              text-decoration: underline;
              margin-bottom: 1.5mm;
            }
            .inst-item {
              font-size: 6.2pt;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 1mm;
            }
            .pill-box {
              border: 1.2px solid #0f172a;
              border-radius: 9999px;
              padding: 1.5mm 3mm;
              text-align: center;
              font-size: 6.8pt;
              font-weight: 800;
              color: #0f172a;
              margin: 0 auto;
              width: 80%;
            }
          </style>
        </head>
        <body>
          ${cardsHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* CARD PREVIEW CONTAINER */}
      <Card className="overflow-hidden border-border/80 shadow-md">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Live Card Preview</CardTitle>
                <Tabs
                  value={activeSide}
                  onValueChange={(v) => setActiveSide(v as "front" | "back")}
                  className="w-auto"
                >
                  <TabsList className="h-7 p-0.5 bg-muted">
                    <TabsTrigger value="front" className="text-xs h-6 px-2.5">
                      Front Side
                    </TabsTrigger>
                    <TabsTrigger value="back" className="text-xs h-6 px-2.5">
                      Back Side
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <CardDescription className="text-xs mt-0.5">
                {activeSide === "front"
                  ? "Front: Photo, Name, Roll No & Dynamic Centre"
                  : "Back: Date of Birth, Contact No, Address & Official Instructions"}
              </CardDescription>
            </div>

            {student && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() => handleDownload(activeSide)}
                  disabled={isGenerating}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm text-xs h-8"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Download {activeSide === "front" ? "Front" : "Back"} (PNG)
                </Button>
                <Button
                  onClick={() => handlePrint("both")}
                  variant="outline"
                  size="sm"
                  className="font-medium text-xs h-8"
                >
                  <Printer className="mr-1.5 h-3.5 w-3.5" />
                  Print Both Sides
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center bg-slate-50/50">
          {student ? (
            <div className="w-full max-w-[620px]">
              {/* FLIP TOGGLE BUTTON ROW */}
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveSide((prev) => (prev === "front" ? "back" : "front"))}
                  className="h-7 text-xs text-muted-foreground hover:text-emerald-700 gap-1.5"
                >
                  <Repeat className="h-3.5 w-3.5" />
                  Flip to {activeSide === "front" ? "Back Side" : "Front Side"}
                </Button>
              </div>

              {/* CARD CONTAINER (Aspect ratio: 1024 / 673) */}
              {activeSide === "front" ? (
                /* FRONT SIDE */
                <div
                  className="relative w-full rounded-2xl shadow-xl overflow-hidden border border-slate-300 select-none bg-cover bg-center transition-all duration-300 hover:shadow-2xl"
                  style={{
                    aspectRatio: "1024 / 673",
                    backgroundImage: "url('/templates/id-card-template.png')",
                  }}
                >
                  {/* Photo in Left Area (x: 8.6%, y: 41.6%, w: 21%, h: 37.9%) */}
                  <div className="absolute left-[8.6%] top-[41.6%] w-[21%] h-[37.9%] rounded-xl overflow-hidden border-2 border-slate-300/90 shadow-sm bg-slate-100 flex items-center justify-center">
                    {photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photoUrl}
                        alt={student.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <UserIcon className="h-9 w-9 text-emerald-800/40" />
                        <span className="text-[10px] font-bold text-emerald-900/60 uppercase mt-0.5">
                          {student.name
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details on Right (x: 32.2%, y: 43%, right: 28%) */}
                  <div className="absolute left-[32.2%] top-[43%] right-[28%] flex flex-col justify-start">
                    <h3 className="text-base sm:text-lg md:text-xl font-black tracking-wide text-slate-900 uppercase truncate leading-tight">
                      {student.name}
                    </h3>

                    <div className="mt-1 sm:mt-1.5 flex items-center gap-1 text-xs sm:text-sm md:text-base font-bold text-slate-700">
                      <span className="text-slate-500 font-medium">Roll No:</span>
                      <span className="font-mono tracking-tight">{student.rollNo || "N/A"}</span>
                    </div>

                    <div className="mt-1 flex items-center gap-1 text-xs sm:text-sm md:text-base font-bold text-emerald-800">
                      <span className="text-emerald-900/70 font-medium">Centre:</span>
                      <span className="truncate">{centreName || "IPA Franchise Centre"}</span>
                    </div>

                    {levelName && levelName !== "N/A" && (
                      <div className="mt-1 text-[11px] sm:text-xs font-semibold text-slate-500">
                        <span>Level: </span>
                        <span className="text-slate-700">{levelName}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* BACK SIDE */
                <div
                  className="relative w-full rounded-2xl shadow-xl overflow-hidden border border-slate-300 select-none bg-white transition-all duration-300 hover:shadow-2xl p-[5%] flex flex-col justify-between"
                  style={{
                    aspectRatio: "1024 / 673",
                  }}
                >
                  {/* Punch Holes Indicators */}
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-2.5 h-14 rounded-full bg-slate-200 border border-slate-300" />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2.5 h-14 rounded-full bg-slate-200 border border-slate-300" />

                  {/* Top Details */}
                  <div className="space-y-2 text-xs sm:text-sm md:text-base text-slate-900 font-bold px-2 sm:px-4">
                    <div className="grid grid-cols-12 gap-1 items-start">
                      <span className="col-span-4 sm:col-span-3 text-slate-800">Date of Birth</span>
                      <span className="col-span-1">:</span>
                      <span className="col-span-7 sm:col-span-8 text-slate-900 font-semibold">{backDob || "—"}</span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 items-start">
                      <span className="col-span-4 sm:col-span-3 text-slate-800">Contact No</span>
                      <span className="col-span-1">:</span>
                      <span className="col-span-7 sm:col-span-8 text-slate-900 font-semibold">{backContactNo || "—"}</span>
                    </div>

                    <div className="grid grid-cols-12 gap-1 items-start">
                      <span className="col-span-4 sm:col-span-3 text-slate-800">Address</span>
                      <span className="col-span-1">:</span>
                      <div className="col-span-7 sm:col-span-8 text-slate-900 font-semibold uppercase leading-snug line-clamp-3">
                        {backAddress || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Middle Instructions */}
                  <div className="px-2 sm:px-4 pt-1">
                    <h4 className="text-xs sm:text-sm font-black underline text-slate-900 tracking-wide uppercase">
                      Instructions
                    </h4>
                    <ol className="mt-1 space-y-0.5 text-[10px] sm:text-xs md:text-sm font-semibold text-slate-800 leading-tight">
                      <li>1. It is to be surrendered on completion of course with IPA.</li>
                      <li>2. Loss of card to be reported immediately to corporate office.</li>
                      <li>3. The card is property of Ideal Play Abacus India Pvt. Ltd.</li>
                    </ol>
                  </div>

                  {/* Bottom Pill Box */}
                  <div className="mx-auto w-[90%] sm:w-[85%] border-2 border-slate-900 rounded-full py-1 sm:py-1.5 px-3 text-center">
                    <span className="text-[11px] sm:text-xs md:text-sm font-extrabold text-slate-900 tracking-tight">
                      If found, please return to the corporate office
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 px-1">
                <span>Card: 1024 × 673 px (CR80 Standard)</span>
                <span className="font-medium text-emerald-700 capitalize">
                  Viewing: {activeSide} side
                </span>
              </div>
            </div>
          ) : (
            <div className="py-16 text-center text-muted-foreground flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-muted/60 flex items-center justify-center mb-3">
                <UserIcon className="h-8 w-8 text-muted-foreground/60" />
              </div>
              <h4 className="font-semibold text-foreground text-base">No Student Selected</h4>
              <p className="text-xs max-w-sm text-muted-foreground mt-1">
                Select a student from the directory on the right to preview, customize, and generate both front and back sides.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CARD CUSTOMIZATION CONTROLS */}
      {student && (
        <Card className="border-border/80 shadow-sm">
          <CardHeader className="py-3 px-4 sm:px-6 border-b bg-muted/10">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-emerald-600" />
              Card Customization & Data Fields
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-5">
            {/* Front Customization */}
            <div>
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                Front Side Details
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="centre-input" className="text-xs font-medium">
                    Centre Name (Dynamic)
                  </Label>
                  <Input
                    id="centre-input"
                    value={centreName}
                    onChange={(e) => setCentreName(e.target.value)}
                    placeholder="e.g. Mylapore Main Center"
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Dynamically auto-filled from your franchise profile.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Student Photo</Label>
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      id="photo-upload-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      Upload / Replace Photo
                    </Button>
                    {customPhotoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={handleResetPhoto}
                      >
                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        Reset
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {customPhotoUrl
                      ? "Custom preview photo loaded."
                      : student.photoPath
                      ? "Using existing profile photo."
                      : "No profile photo uploaded. You can upload one here for the card."}
                  </p>
                </div>
              </div>
            </div>

            {/* Back Customization */}
            <div className="pt-3 border-t">
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                Back Side Details
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="back-dob-input" className="text-xs font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    Date of Birth
                  </Label>
                  <Input
                    id="back-dob-input"
                    value={backDob}
                    onChange={(e) => setBackDob(e.target.value)}
                    placeholder="DD-MM-YYYY"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="back-contact-input" className="text-xs font-medium flex items-center gap-1">
                    <Phone className="h-3 w-3 text-muted-foreground" />
                    Contact No
                  </Label>
                  <Input
                    id="back-contact-input"
                    value={backContactNo}
                    onChange={(e) => setBackContactNo(e.target.value)}
                    placeholder="e.g. 9004400350"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-1">
                  <Label htmlFor="back-address-input" className="text-xs font-medium flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    Residential Address
                  </Label>
                  <Textarea
                    id="back-address-input"
                    value={backAddress}
                    onChange={(e) => setBackAddress(e.target.value)}
                    placeholder="Flat / Building, Street, City"
                    rows={2}
                    className="text-xs resize-none"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
