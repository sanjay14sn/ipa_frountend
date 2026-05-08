"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Loader2, AlertCircle, Award, Search, Calendar } from "lucide-react";
import {
  getAllCIGraduations,
  CIGraduationsByFranchise,
} from "@/services/course-instructor.service";
import { format } from "date-fns";

export function AllGraduationsView() {
  const [graduations, setGraduations] = useState<CIGraduationsByFranchise>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadGraduations();
  }, []);

  const loadGraduations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllCIGraduations();
      setGraduations(data);
    } catch (err: any) {
      setError(err.message || "Failed to load graduations");
    } finally {
      setLoading(false);
    }
  };

  const filteredGraduations = React.useMemo(() => {
    if (!searchTerm) return graduations;

    const filtered: CIGraduationsByFranchise = {};
    Object.entries(graduations).forEach(([franchiseName, grads]) => {
      const matchingGrads = grads.filter(
        (grad) =>
          grad.instructorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          grad.instructorCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          grad.levelName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          franchiseName.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matchingGrads.length > 0) {
        filtered[franchiseName] = matchingGrads;
      }
    });
    return filtered;
  }, [graduations, searchTerm]);

  const totalGraduations = Object.values(graduations).reduce(
    (sum, grads) => sum + grads.length,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Award className="h-6 w-6 text-primary" />
            All CI Graduations
          </h2>
          <p className="text-gray-600 mt-1">
            Total: {totalGraduations} graduation(s) across{" "}
            {Object.keys(graduations).length} franchise(s)
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by instructor name, code, level, or franchise..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {Object.keys(filteredGraduations).length === 0 ? (
        <div className="text-center py-12">
          <Award className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm
              ? "No graduations found matching your search."
              : "No graduations recorded yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(filteredGraduations).map(
            ([franchiseName, franchiseGrads]) => (
              <Card key={franchiseName}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{franchiseName}</span>
                    <Badge variant="secondary">
                      {franchiseGrads.length} graduation(s)
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {franchiseGrads.map((grad) => (
                      <div
                        key={
                          grad.id ??
                          `${grad.instructorCode}-${grad.levelName}`
                        }
                        className="flex items-start justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {grad.instructorName}
                            </span>
                            <Badge variant="outline">{grad.instructorCode}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {grad.levelName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(
                                new Date(
                                  grad.graduationDate ??
                                    grad.graduatedAt ??
                                   0,
                                ),
                                "MMM dd, yyyy",
                              )}
                            </span>
                          </div>
                          {grad.certificateNumber && (
                            <p className="text-sm text-gray-500 mt-1 font-mono">
                              Cert: {grad.certificateNumber}
                            </p>
                          )}
                          {grad.notes && (
                            <p className="text-sm text-gray-500 mt-1">
                              {grad.notes}
                            </p>
                          )}
                        </div>
                        {grad.marksObtained !== undefined &&
                          grad.marksObtained !== null && (
                            <Badge
                              variant={
                                grad.marksObtained >= 80 ? "default" : "secondary"
                              }
                            >
                              {grad.marksObtained}%
                            </Badge>
                          )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>
      )}
    </div>
  );
}

