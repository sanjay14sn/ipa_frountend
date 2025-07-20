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
import {
  Search,
  Plus,
  Eye,
  Users,
  MapPin,
  Phone,
  Mail,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { User, getUserFromStorage } from "@/lib/auth";
import { Franchise } from "@/lib/data";

export default function FranchisesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
    if (userData) {
      fetchFranchises();
    }
  }, []);

  const fetchFranchises = async () => {
    try {
      const response = await fetch("/api/franchises");
      const data = await response.json();
      setFranchises(data.franchises || []);
    } catch (error) {
      console.error("Error fetching franchises:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFranchises = franchises.filter(
    (franchise) =>
      franchise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      franchise.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      franchise.owner.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    return status === "Active"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-gray-50 text-gray-600 border-gray-200";
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

  // If user is franchise, redirect them or show message
  if (user?.role === "franchise") {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            Access Denied
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You don't have permission to view all franchises.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Franchise Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage and monitor all franchise locations
          </p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add New Franchise
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Franchises
            </CardTitle>
            <Building2 className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {franchises.length}
            </div>
            <p className="text-xs text-gray-500">Across India</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Active Franchises
            </CardTitle>
            <Building2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {franchises.filter((f) => f.status === "Active").length}
            </div>
            <p className="text-xs text-gray-500">Currently operating</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {franchises.reduce((sum, f) => sum + f.students, 0)}
            </div>
            <p className="text-xs text-gray-500">All franchises</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-700">
              Total Course Instructors
            </CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {franchises.reduce((sum, f) => sum + f.courseInstructors, 0)}
            </div>
            <p className="text-xs text-gray-500">Across all franchises</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Franchises Table */}
      <Card className="border-gray-200">
        <CardHeader className="border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-gray-900">
                Franchise Locations
              </CardTitle>
              <CardDescription className="text-gray-600">
                Complete list of all franchise partners
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search franchises..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm border-gray-300 focus:border-gray-500"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-100">
                <TableHead className="text-gray-700 font-medium">
                  Franchise Details
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Owner & Contact
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Location
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Students
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Course Instructors
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Status
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Join Date
                </TableHead>
                <TableHead className="text-gray-700 font-medium">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFranchises.map((franchise) => (
                <TableRow
                  key={franchise.id}
                  className="border-gray-100 hover:bg-gray-50"
                >
                  <TableCell className="font-medium text-gray-900">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{franchise.name}</span>
                        {franchise.franchiseCode && (
                          <Badge variant="outline" className="text-xs">
                            {franchise.franchiseCode}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {franchise.type ||
                          franchise.franchiseeType ||
                          "Standard Franchise"}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-2">
                      <div className="text-gray-700 font-medium">
                        {franchise.contactPerson ||
                          franchise.owner ||
                          "Not specified"}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-700">
                          <Phone className="mr-1 h-3 w-3 text-gray-400" />
                          {franchise.phone}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Mail className="mr-1 h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-[200px]">
                            {franchise.email}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center text-gray-700">
                        <MapPin className="mr-1 h-3 w-3 text-gray-400" />
                        {franchise.city || franchise.location}
                      </div>
                      {franchise.pincode && (
                        <div className="text-sm text-gray-500">
                          PIN: {franchise.pincode}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center text-gray-700">
                      <Users className="mr-1 h-3 w-3 text-gray-400" />
                      {franchise.students || 0}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center text-gray-700">
                      <Users className="mr-1 h-3 w-3 text-gray-400" />
                      {franchise.courseInstructors || 0}
                    </div>
                  </TableCell>

                  <TableCell>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getStatusColor(franchise.status)}`}
                    >
                      {franchise.status}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-gray-600">
                    <div className="space-y-1">
                      <div>
                        {franchise.joinDate
                          ? new Date(franchise.joinDate).toLocaleDateString()
                          : "Not specified"}
                      </div>
                      {franchise.expiryDate && (
                        <div className="text-sm text-orange-600">
                          Expires:{" "}
                          {new Date(franchise.expiryDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-300 text-gray-700 hover:bg-gray-50 text-xs"
                      >
                        Edit
                      </Button>
                    </div>
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
