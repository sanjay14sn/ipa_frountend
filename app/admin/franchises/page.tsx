"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Building2,
  Users,
  GraduationCap,
  ShoppingCart,
  Eye,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  CreditCard,
  BookOpen,
  Briefcase,
  IdCard,
  Home,
  IndianRupee,
} from "lucide-react";
import Link from "next/link";

export default function AdminFranchises() {
  const [selectedFranchise, setSelectedFranchise] = useState<string | null>(
    null
  );
  const [franchises, setFranchises] = useState([]);
  const [students, setStudents] = useState([]);
  const [courseInstructors, setCourseInstructors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [franchisesRes, studentsRes, cisRes, ordersRes] = await Promise.all(
        [
          fetch("/api/franchises"),
          fetch("/api/students"),
          fetch("/api/course-instructors"),
          fetch("/api/orders"),
        ]
      );

      const [franchisesData, studentsData, cisData, ordersData] =
        await Promise.all([
          franchisesRes.json(),
          studentsRes.json(),
          cisRes.json(),
          ordersRes.json(),
        ]);

      setFranchises(franchisesData.franchises || []);
      setStudents(studentsData.students || []);
      setCourseInstructors(cisData.courseInstructors || []);
      setOrders(ordersData.orders || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFranchiseStats = (franchiseId: string) => {
    const franchiseStudents = students.filter(
      (student: any) => student.franchiseId === franchiseId
    );
    const franchiseCourseInstructors = courseInstructors.filter(
      (ci: any) => ci.franchiseId === franchiseId
    );
    const franchiseOrders = orders.filter(
      (order: any) => order.franchiseId === franchiseId
    );

    return {
      students: franchiseStudents.length,
      courseInstructors: franchiseCourseInstructors.length,
      orders: franchiseOrders.length,
      pendingOrders: franchiseOrders.filter(
        (order: any) => order.status === "Pending"
      ).length,
    };
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Manage Franchises
          </h1>
          <p className="text-muted-foreground">
            View and manage all franchises in the system ({franchises.length}{" "}
            total)
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add New Franchise
        </Button>
      </div>

      <div className="grid gap-6">
        {franchises.map((franchise: any) => {
          const stats = getFranchiseStats(franchise.id);

          return (
            <Card key={franchise.id} className="w-full">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-xl">
                          {franchise.name}
                        </CardTitle>
                        {franchise.franchiseCode && (
                          <Badge variant="outline" className="text-xs">
                            <IdCard className="w-3 h-3 mr-1" />
                            {franchise.franchiseCode}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {franchise.city || franchise.location}
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-1" />
                          {franchise.email}
                        </div>
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-1" />
                          {franchise.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge
                      variant={
                        franchise.status === "Active" ? "default" : "secondary"
                      }
                    >
                      {franchise.status}
                    </Badge>
                    <Link href={`/admin/franchises/${franchise.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Enhanced Owner & Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                      <User className="w-4 h-4 mr-2" />
                      Owner Information
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium">
                          {franchise.contactPerson ||
                            franchise.owner ||
                            "Not specified"}
                        </p>
                      </div>
                      {franchise.educationalQualification && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Education
                          </p>
                          <p className="text-sm">
                            {franchise.educationalQualification}
                          </p>
                        </div>
                      )}
                      {franchise.presentOccupation && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Occupation
                          </p>
                          <p className="text-sm">
                            {franchise.presentOccupation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                      <Home className="w-4 h-4 mr-2" />
                      Address Details
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Centre Address
                        </p>
                        <p className="text-sm">
                          {franchise.address || "Not provided"}
                        </p>
                        {franchise.pincode && (
                          <p className="text-sm text-muted-foreground">
                            PIN: {franchise.pincode}
                          </p>
                        )}
                      </div>
                      {franchise.communicationAddress && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Communication Address
                          </p>
                          <p className="text-sm">
                            {franchise.communicationAddress}
                          </p>
                          {franchise.communicationPincode && (
                            <p className="text-sm text-muted-foreground">
                              PIN: {franchise.communicationPincode}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-gray-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-2" />
                      Timeline & Details
                    </h4>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Joined</p>
                        <p className="font-medium">
                          {franchise.joinDate
                            ? new Date(franchise.joinDate).toLocaleDateString()
                            : "Not specified"}
                        </p>
                      </div>
                      {franchise.expiryDate && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Expires
                          </p>
                          <p className="text-sm">
                            {new Date(
                              franchise.expiryDate
                            ).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                      {franchise.reference && (
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Reference
                          </p>
                          <p className="text-sm">{franchise.reference}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Information */}
                {franchise.paymentDetails && (
                  <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Payment Details
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {franchise.paymentDetails.franchiseeFee && (
                        <div className="text-center p-3 bg-green-50 border border-green-200 rounded-lg">
                          <IndianRupee className="w-4 h-4 mx-auto mb-1 text-green-600" />
                          <div className="text-lg font-bold text-green-700">
                            ₹
                            {parseFloat(
                              franchise.paymentDetails.franchiseeFee
                            ).toLocaleString()}
                          </div>
                          <div className="text-xs text-green-600">
                            Franchise Fee
                          </div>
                        </div>
                      )}
                      {franchise.paymentDetails.kitCost && (
                        <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <BookOpen className="w-4 h-4 mx-auto mb-1 text-blue-600" />
                          <div className="text-lg font-bold text-blue-700">
                            ₹
                            {parseFloat(
                              franchise.paymentDetails.kitCost
                            ).toLocaleString()}
                          </div>
                          <div className="text-xs text-blue-600">Kit Cost</div>
                        </div>
                      )}
                      {franchise.paymentDetails.monthlyFee && (
                        <div className="text-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                          <Calendar className="w-4 h-4 mx-auto mb-1 text-purple-600" />
                          <div className="text-lg font-bold text-purple-700">
                            ₹
                            {parseFloat(
                              franchise.paymentDetails.monthlyFee
                            ).toLocaleString()}
                          </div>
                          <div className="text-xs text-purple-600">
                            Monthly Fee
                          </div>
                        </div>
                      )}
                      {franchise.paymentDetails.installments && (
                        <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                          <CreditCard className="w-4 h-4 mx-auto mb-1 text-orange-600" />
                          <div className="text-lg font-bold text-orange-700">
                            {franchise.paymentDetails.installments}
                          </div>
                          <div className="text-xs text-orange-600">
                            Installments
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Statistics */}
                <div className="border-t pt-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Performance Statistics
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <Users className="h-5 w-5 mx-auto mb-2 text-blue-600" />
                      <div className="text-2xl font-bold">{stats.students}</div>
                      <div className="text-xs text-muted-foreground">
                        Students
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <GraduationCap className="h-5 w-5 mx-auto mb-2 text-green-600" />
                      <div className="text-2xl font-bold">
                        {stats.courseInstructors}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Course Instructors
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <ShoppingCart className="h-5 w-5 mx-auto mb-2 text-purple-600" />
                      <div className="text-2xl font-bold">{stats.orders}</div>
                      <div className="text-xs text-muted-foreground">
                        Total Orders
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <ShoppingCart className="h-5 w-5 mx-auto mb-2 text-orange-600" />
                      <div className="text-2xl font-bold">
                        {stats.pendingOrders}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Pending Orders
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
