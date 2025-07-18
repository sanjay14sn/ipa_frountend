"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Trophy,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function FranchiseDetails() {
  const params = useParams();
  const franchiseId = params.id as string;
  const [franchise, setFranchise] = useState<any>(null);
  const [franchiseStudents, setFranchiseStudents] = useState([]);
  const [franchiseCourseInstructors, setFranchiseCourseInstructors] = useState(
    []
  );
  const [franchiseOrders, setFranchiseOrders] = useState([]);
  const [franchiseContests, setFranchiseContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [franchiseId]);

  const fetchData = async () => {
    try {
      const [franchisesRes, studentsRes, cisRes, ordersRes, contestsRes] =
        await Promise.all([
          fetch(`/api/franchises?franchiseId=${franchiseId}`),
          fetch("/api/students"),
          fetch("/api/course-instructors"),
          fetch("/api/orders"),
          fetch("/api/contests"),
        ]);

      const [franchisesData, studentsData, cisData, ordersData, contestsData] =
        await Promise.all([
          franchisesRes.json(),
          studentsRes.json(),
          cisRes.json(),
          ordersRes.json(),
          contestsRes.json(),
        ]);

      setFranchise(franchisesData.franchise || null);
      setFranchiseStudents(
        (studentsData.students || []).filter(
          (s: any) => s.franchiseId === franchiseId
        )
      );
      setFranchiseCourseInstructors(
        (cisData.courseInstructors || []).filter(
          (ci: any) => ci.franchiseId === franchiseId
        )
      );
      setFranchiseOrders(
        (ordersData.orders || []).filter(
          (o: any) => o.franchiseId === franchiseId
        )
      );
      setFranchiseContests(contestsData.contests || []); // All contests for now
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
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

  if (!franchise) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Franchise Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The requested franchise could not be found.
          </p>
          <Link href="/admin/franchises">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Franchises
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/franchises">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {franchise.name}
            </h1>
            <p className="text-muted-foreground">
              Franchise Details & Management
            </p>
          </div>
        </div>
        <Badge
          variant={franchise.status === "Active" ? "default" : "secondary"}
        >
          {franchise.status}
        </Badge>
      </div>

      {/* Franchise Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Franchise Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Owner:</span>
                <span>{franchise.owner}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Location:</span>
                <span>{franchise.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Join Date:</span>
                <span>{franchise.joinDate}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Email:</span>
                <span>{franchise.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Phone:</span>
                <span>{franchise.phone}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{franchiseStudents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Course Instructors
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {franchiseCourseInstructors.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{franchiseOrders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contests</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{franchiseContests.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="students" className="space-y-4">
        <TabsList>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="instructors">Course Instructors</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="contests">Contests</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Students ({franchiseStudents.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Enrollment Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {franchiseStudents.map((student: any) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.name}
                      </TableCell>
                      <TableCell>{student.age}</TableCell>
                      <TableCell>{student.level}</TableCell>
                      <TableCell>{student.enrollmentDate}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            student.status === "Active"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {student.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="instructors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Course Instructors ({franchiseCourseInstructors.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {franchiseCourseInstructors.map((ci: any) => (
                    <TableRow key={ci.id}>
                      <TableCell className="font-medium">{ci.name}</TableCell>
                      <TableCell>{ci.programName}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ci.status === "Approved" ? "default" : "secondary"
                          }
                        >
                          {ci.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{ci.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders ({franchiseOrders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {franchiseOrders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.id}</TableCell>
                      <TableCell>{order.type}</TableCell>
                      <TableCell>{order.amount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === "Delivered"
                              ? "default"
                              : order.status === "Pending"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.orderDate}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Available Contests ({franchiseContests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contest Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {franchiseContests.map((contest: any) => (
                    <TableRow key={contest.id}>
                      <TableCell className="font-medium">
                        {contest.name}
                      </TableCell>
                      <TableCell>{contest.level}</TableCell>
                      <TableCell>{contest.date}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            contest.status === "Registration Open"
                              ? "default"
                              : contest.status === "Upcoming"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {contest.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
