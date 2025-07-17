"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Users, GraduationCap, Award } from "lucide-react";
import { User, getUserFromStorage } from "@/lib/auth";
import { Faculty, FACULTY } from "@/lib/data";

export default function FacultyPage() {
  const [user, setUser] = useState<User | null>(null);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
    if (userData) {
      fetchFaculty(userData);
    }
  }, []);

  const fetchFaculty = async (userData: User) => {
    try {
      // Filter faculty based on user role
      const filteredFaculty =
        userData.role === "franchise"
          ? FACULTY.filter((f) => f.franchiseId === userData.franchiseId)
          : FACULTY;

      setFaculty(filteredFaculty);
    } catch (error) {
      console.error("Error fetching faculty:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFaculty = faculty.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.certification.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.franchiseName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCertificationColor = (certification: string) => {
    switch (certification) {
      case "Senior Abacus Instructor":
        return "bg-purple-100 text-purple-800";
      case "Master Abacus Instructor":
        return "bg-red-100 text-red-800";
      case "Certified Abacus Trainer":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {user?.role === "admin" ? "All Faculty" : "My Faculty"}
          </h1>
          <p className="text-muted-foreground">
            {user?.role === "admin"
              ? "Manage faculty across all franchises"
              : "Manage your franchise faculty"}
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Faculty
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{faculty.length}</div>
            <p className="text-xs text-muted-foreground">
              {user?.role === "admin"
                ? "Across all franchises"
                : "In your franchise"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Senior Instructors
            </CardTitle>
            <Award className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                faculty.filter(
                  (f) =>
                    f.certification.includes("Senior") ||
                    f.certification.includes("Master")
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Experienced faculty</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Experience
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {faculty.length > 0
                ? Math.round(
                    faculty.reduce((sum, f) => sum + f.experience, 0) /
                      faculty.length
                  )
                : 0}{" "}
              years
            </div>
            <p className="text-xs text-muted-foreground">Teaching experience</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Faculty Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Faculty List</CardTitle>
              <CardDescription>
                {user?.role === "admin"
                  ? "All faculty across franchises"
                  : "Your franchise faculty"}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search faculty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Certification</TableHead>
                <TableHead>Experience</TableHead>
                <TableHead>Specialization</TableHead>
                {user?.role === "admin" && <TableHead>Franchise</TableHead>}
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFaculty.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>
                    <Badge
                      className={getCertificationColor(member.certification)}
                      variant="secondary"
                    >
                      {member.certification}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.experience} years</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {member.specialization.map((spec, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  {user?.role === "admin" && (
                    <TableCell>{member.franchiseName}</TableCell>
                  )}
                  <TableCell>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
