"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Eraser, Loader2, PenLine, Type, Undo2 } from "lucide-react";
// eslint-disable-next-line no-restricted-imports -- SW-P11 sanctioned raw-dialog exemption: the signature pad needs raw Dialog (canvas focus/pointer handling; no standard header/footer).
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { buildTypedSignatureSvg } from "./typed-signature";

const ESIGNATURE_CONSENT_VERSION = "v1";

const ESIGNATURE_CONSENT_TEXT =
  "By clicking Adopt & Sign, I agree that this signature and initials will be the electronic representation of my signature for all purposes when I (or my agent) use them on documents, including legally binding contracts — just the same as a pen-and-paper signature.";

export type ESignatureMethod = "drawn" | "typed";

export interface ESignatureResult {
  svg: string;
  method: ESignatureMethod;
  consentVersion: string;
}

export interface ESignaturePadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
  onAdopt: (result: ESignatureResult) => Promise<void> | void;
  submitting?: boolean;
}

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;

export function ESignaturePad({
  open,
  onOpenChange,
  defaultName = "",
  onAdopt,
  submitting = false,
}: ESignaturePadProps) {
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const [activeTab, setActiveTab] = useState<ESignatureMethod>("drawn");
  const [typedName, setTypedName] = useState(defaultName);
  const [hasStrokes, setHasStrokes] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  useEffect(() => {
    if (open) {
      setTypedName(defaultName);
      setActiveTab("drawn");
      setHasStrokes(false);
      setConsentAccepted(false);
    }
  }, [open, defaultName]);

  const handleClear = useCallback(() => {
    signatureRef.current?.clear();
    setHasStrokes(false);
  }, []);

  const handleUndo = useCallback(() => {
    const pad = signatureRef.current;
    if (!pad) return;
    const points = pad.toData();
    if (points.length === 0) return;
    points.pop();
    pad.fromData(points);
    setHasStrokes(points.length > 0);
  }, []);

  const typedPreviewSvg = useMemo(() => {
    const trimmed = typedName.trim();
    if (!trimmed) return null;
    return buildTypedSignatureSvg(trimmed);
  }, [typedName]);

  const canAdopt = useMemo(() => {
    if (!consentAccepted) return false;
    if (activeTab === "drawn") return hasStrokes;
    return typedName.trim().length > 0;
  }, [activeTab, consentAccepted, hasStrokes, typedName]);

  const handleAdopt = useCallback(async () => {
    if (!canAdopt) return;
    let svg: string;
    if (activeTab === "drawn") {
      const pad = signatureRef.current;
      if (!pad || pad.isEmpty()) return;
      const dataUrl = pad.toDataURL("image/svg+xml");
      const commaIdx = dataUrl.indexOf(",");
      svg = atob(dataUrl.slice(commaIdx + 1));
    } else {
      const trimmed = typedName.trim();
      if (!trimmed) return;
      svg = buildTypedSignatureSvg(trimmed);
    }
    await onAdopt({
      svg,
      method: activeTab,
      consentVersion: ESIGNATURE_CONSENT_VERSION,
    });
  }, [activeTab, canAdopt, onAdopt, typedName]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Adopt your e-signature</DialogTitle>
          <DialogDescription>
            Draw your signature or type your name. You can clear and try again
            as many times as you like before adopting.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ESignatureMethod)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="drawn">
              <PenLine className="mr-2 h-4 w-4" /> Draw
            </TabsTrigger>
            <TabsTrigger value="typed">
              <Type className="mr-2 h-4 w-4" /> Type
            </TabsTrigger>
          </TabsList>

          <TabsContent value="drawn" className="space-y-3">
            <div className="rounded-xl border border-border bg-muted/20 p-2">
              <div className="relative mx-auto w-full max-w-[600px] overflow-hidden rounded-lg border border-dashed border-border bg-card">
                <SignatureCanvas
                  ref={(instance) => {
                    signatureRef.current = instance;
                  }}
                  penColor="#111111"
                  minWidth={0.6}
                  maxWidth={2.2}
                  throttle={16}
                  canvasProps={{
                    width: CANVAS_WIDTH,
                    height: CANVAS_HEIGHT,
                    className: "block w-full touch-none bg-card",
                  }}
                  onEnd={() => setHasStrokes(true)}
                />
                <span className="pointer-events-none absolute bottom-2 left-3 text-xs text-muted-foreground">
                  Sign above the line
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={!hasStrokes || submitting}
              >
                <Undo2 className="mr-2 h-4 w-4" /> Undo
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={!hasStrokes || submitting}
              >
                <Eraser className="mr-2 h-4 w-4" /> Clear
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="typed" className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="esignature-typed-name">Your legal name</Label>
              <Input
                id="esignature-typed-name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder="Full name"
                maxLength={120}
                autoComplete="off"
                disabled={submitting}
              />
            </div>
            <div className="rounded-xl border border-border bg-muted/20 p-2">
              <div className="flex h-[120px] items-center justify-center rounded-lg border border-dashed border-border bg-card px-4">
                {typedPreviewSvg ? (
                  <div
                    aria-label={`Signature preview for ${typedName.trim()}`}
                    className="max-h-[100px] w-full max-w-[520px] [&>svg]:h-full [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: typedPreviewSvg }}
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Start typing to preview your signature
                  </span>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
          <div className="flex items-start gap-2">
            <Checkbox
              id="esignature-consent"
              checked={consentAccepted}
              onCheckedChange={(value) => setConsentAccepted(value === true)}
              disabled={submitting}
            />
            <Label
              htmlFor="esignature-consent"
              className={cn(
                "text-xs leading-relaxed text-muted-foreground",
                "cursor-pointer",
              )}
            >
              {ESIGNATURE_CONSENT_TEXT}
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAdopt}
            disabled={!canAdopt || submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Adopt &amp; Sign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
