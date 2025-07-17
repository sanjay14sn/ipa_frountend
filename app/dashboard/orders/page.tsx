"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Package,
  Award,
  FileText,
  Calendar,
  DollarSign,
} from "lucide-react";
import { User, getUserFromStorage } from "@/lib/auth";
import { Order } from "@/lib/data";

export default function OrdersPage() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
    if (userData) {
      fetchOrders(userData);
    }
  }, []);

  const fetchOrders = async (userData: User) => {
    try {
      const franchiseParam =
        userData.role === "franchise"
          ? `?franchiseId=${userData.franchiseId}`
          : "";
      const response = await fetch(`/api/orders${franchiseParam}`);
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.franchise.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.items.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Pending":
        return "destructive";
      case "Processing":
        return "secondary";
      case "Shipped":
        return "default";
      case "Delivered":
        return "default";
      default:
        return "secondary";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Materials":
        return Package;
      case "Contest Certificates":
        return Award;
      case "Grading Certificates":
        return FileText;
      default:
        return Package;
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {user?.role === "admin" ? "Orders Management" : "My Orders"}
        </h1>
        <p className="text-muted-foreground">
          {user?.role === "admin"
            ? "Track and manage all franchise orders"
            : "Track your franchise orders"}
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Orders</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
          <TabsTrigger value="contest">Contest Certificates</TabsTrigger>
          <TabsTrigger value="grading">Grading Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle>Search Orders</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order ID, franchise, or items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Orders Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Orders
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orders.length}</div>
                <p className="text-xs text-muted-foreground">
                  {user?.role === "admin" ? "All franchises" : "Your franchise"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Calendar className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {orders.filter((o) => o.status === "Pending").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {
                    orders.filter(
                      (o) =>
                        o.status === "Pending" &&
                        new Date(o.expectedDelivery) <
                          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                    ).length
                  }{" "}
                  urgent
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  This Month
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    orders.filter((o) => {
                      const orderDate = new Date(o.orderDate);
                      const thisMonth = new Date();
                      return (
                        orderDate.getMonth() === thisMonth.getMonth() &&
                        orderDate.getFullYear() === thisMonth.getFullYear()
                      );
                    }).length
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Orders this month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Delivered</CardTitle>
                <Package className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {orders.filter((o) => o.status === "Delivered").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Successfully delivered
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                {user?.role === "admin" ? "All Orders" : "Your Orders"}
              </CardTitle>
              <CardDescription>
                {user?.role === "admin"
                  ? "Orders from all franchises"
                  : "Your franchise order history"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    {user?.role === "admin" && <TableHead>Franchise</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const TypeIcon = getTypeIcon(order.type);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.id}
                        </TableCell>
                        {user?.role === "admin" && (
                          <TableCell>{order.franchise}</TableCell>
                        )}
                        <TableCell>
                          <div className="flex items-center">
                            <TypeIcon className="mr-2 h-4 w-4" />
                            {order.type}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {order.items}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.amount}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status) as any}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.expectedDelivery}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Material Orders</CardTitle>
              <CardDescription>
                Orders for abacus sets, workbooks, and learning materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    {user?.role === "admin" && <TableHead>Franchise</TableHead>}
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders
                    .filter((o) => o.type === "Materials")
                    .map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.id}
                        </TableCell>
                        {user?.role === "admin" && (
                          <TableCell>{order.franchise}</TableCell>
                        )}
                        <TableCell>{order.items}</TableCell>
                        <TableCell className="font-medium">
                          {order.amount}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status) as any}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.expectedDelivery}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contest">
          <Card>
            <CardHeader>
              <CardTitle>Contest Certificate Orders</CardTitle>
              <CardDescription>
                Orders for contest participation and achievement certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    {user?.role === "admin" && <TableHead>Franchise</TableHead>}
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders
                    .filter((o) => o.type === "Contest Certificates")
                    .map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.id}
                        </TableCell>
                        {user?.role === "admin" && (
                          <TableCell>{order.franchise}</TableCell>
                        )}
                        <TableCell>{order.items}</TableCell>
                        <TableCell className="font-medium">
                          {order.amount}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status) as any}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.expectedDelivery}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grading">
          <Card>
            <CardHeader>
              <CardTitle>Grading Certificate Orders</CardTitle>
              <CardDescription>
                Orders for level completion and grading certificates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    {user?.role === "admin" && <TableHead>Franchise</TableHead>}
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders
                    .filter((o) => o.type === "Grading Certificates")
                    .map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">
                          {order.id}
                        </TableCell>
                        {user?.role === "admin" && (
                          <TableCell>{order.franchise}</TableCell>
                        )}
                        <TableCell>{order.items}</TableCell>
                        <TableCell className="font-medium">
                          {order.amount}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status) as any}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.expectedDelivery}</TableCell>
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
