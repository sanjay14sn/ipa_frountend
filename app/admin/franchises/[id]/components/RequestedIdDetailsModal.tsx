"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, CreditCard, MapPin, Phone } from "lucide-react";
import { RequestedIdDetail } from "@/services/student.service";

interface RequestedIdDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  details: RequestedIdDetail[];
}

export default function RequestedIdDetailsModal({
  open,
  onOpenChange,
  loading,
  details,
}: RequestedIdDetailsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" /> ID Cards To Be
            Issued
          </DialogTitle>
          <DialogDescription>
            {details.length} student{details.length !== 1 ? "s" : ""} requested
            IDs for this franchise
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Loading...
          </div>
        ) : details.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No ID requests found for this franchise.
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Date of Birth</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Father Contact</TableHead>
                  <TableHead>Mother Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((d, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell>{d.rollNo}</TableCell>
                    <TableCell>
                      {new Date(d.dateOfBirth).toLocaleDateString()}
                    </TableCell>
                    <TableCell
                      className="max-w-[260px] truncate"
                      title={d.residentialAddress}
                    >
                      {d.residentialAddress}
                    </TableCell>
                    <TableCell>{d.fatherContactNo}</TableCell>
                    <TableCell>{d.motherContactNo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-4 py-3 border-t text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" /> {details[0]?.franchiseName} •{" "}
              {details[0]?.franchiseeAddress}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
