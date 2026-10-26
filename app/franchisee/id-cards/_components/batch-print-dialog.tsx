"use client";

import React, { useState } from "react";
import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getStudentLevelName } from "@/components/students/student-helpers";
import { uploadedFileSrc } from "@/lib/uploads";
import { formatDate } from "@/lib/date-utils";
import type { StudentData } from "@/services/student-list.service";

interface BatchPrintDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStudents: StudentData[];
  centreName: string;
}

export function BatchPrintDialog({
  open,
  onOpenChange,
  selectedStudents,
  centreName,
}: BatchPrintDialogProps) {
  const [printSide, setPrintSide] = useState<"both" | "front" | "back">("both");

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const cardsHtml = selectedStudents
      .map((student) => {
        const photoUrl = student.photoPath ? uploadedFileSrc(student.photoPath) : null;
        const initials = student.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();
        const levelName = getStudentLevelName(student);
        const dob = student.dateOfBirth ? formatDate(student.dateOfBirth) : "—";
        const contactNo = student.fatherContactNo || student.motherContactNo || "—";
        const address = student.residentialAddress || "—";

        const photoHtml = photoUrl
          ? `<img src="${photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
          : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: #015924; background: #f1f5f9;">${initials}</div>`;

        const frontHtml = `
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

        const backHtml = `
          <div class="card card-back">
            <div class="back-header">
              <div class="row">
                <span class="label">Date of Birth</span>
                <span class="colon">:</span>
                <span class="val">${dob}</span>
              </div>
              <div class="row">
                <span class="label">Contact No</span>
                <span class="colon">:</span>
                <span class="val">${contactNo}</span>
              </div>
              <div class="row">
                <span class="label">Address</span>
                <span class="colon">:</span>
                <span class="val uppercase">${address.replace(/\n/g, "<br/>")}</span>
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

        if (printSide === "front") return frontHtml;
        if (printSide === "back") return backHtml;
        return frontHtml + backHtml;
      })
      .join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Batch ID Cards Print - ${selectedStudents.length} Students</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              display: grid;
              grid-template-columns: repeat(2, 85.6mm);
              grid-gap: 8mm;
              justify-content: center;
            }
            .card {
              position: relative;
              width: 85.6mm;
              height: 54mm;
              overflow: hidden;
              page-break-inside: avoid;
              border: 1px dashed #cbd5e1;
              box-sizing: border-box;
            }
            .card-front {
              background-image: url('/templates/id-card-template.png');
              background-size: cover;
              background-position: center;
            }
            .card-back {
              background: #ffffff;
              padding: 4mm 6mm;
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
              font-size: 10pt;
              font-weight: 800;
              color: #0f172a;
              text-transform: uppercase;
              margin: 0 0 3px 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .roll {
              font-size: 7.5pt;
              font-weight: 700;
              color: #334155;
              margin: 0 0 2px 0;
            }
            .centre {
              font-size: 7.5pt;
              font-weight: 800;
              color: #015924;
              margin: 0 0 2px 0;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .level {
              font-size: 6.5pt;
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
              margin-bottom: 1.5mm;
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
              margin-bottom: 1mm;
            }
            .inst-item {
              font-size: 6.2pt;
              font-weight: 600;
              color: #1e293b;
              margin-bottom: 0.8mm;
            }
            .pill-box {
              border: 1.2px solid #0f172a;
              border-radius: 9999px;
              padding: 1.2mm 2mm;
              text-align: center;
              font-size: 6.5pt;
              font-weight: 800;
              color: #0f172a;
              margin: 0 auto;
              width: 85%;
            }
          </style>
        </head>
        <body>
          ${cardsHtml}
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            Batch Print ID Cards
          </DialogTitle>
          <DialogDescription>
            Ready to print {selectedStudents.length} selected student ID card(s).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Select Sides to Print</Label>
            <RadioGroup
              value={printSide}
              onValueChange={(v) => setPrintSide(v as "both" | "front" | "back")}
              className="grid grid-cols-3 gap-2"
            >
              <div className="flex items-center space-x-2 border rounded-lg p-2.5 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="both" id="both-side" />
                <Label htmlFor="both-side" className="text-xs cursor-pointer font-medium">
                  Both Sides
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-2.5 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="front" id="front-side" />
                <Label htmlFor="front-side" className="text-xs cursor-pointer font-medium">
                  Front Only
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-2.5 cursor-pointer hover:bg-muted/50">
                <RadioGroupItem value="back" id="back-side" />
                <Label htmlFor="back-side" className="text-xs cursor-pointer font-medium">
                  Back Only
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="bg-muted/40 p-3 rounded-lg border text-xs space-y-1">
            <p className="font-semibold text-foreground">Print Specifications:</p>
            <p className="text-muted-foreground">• Layout: A4 Grid (85.6mm × 54mm standard badge size)</p>
            <p className="text-muted-foreground">• Centre: {centreName || "IPA Franchise Centre"}</p>
            <p className="text-muted-foreground">• Total Cards: {selectedStudents.length}</p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Proceed to Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
