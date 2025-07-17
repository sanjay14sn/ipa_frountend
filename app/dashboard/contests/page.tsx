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
import { Plus, Calendar, Users, Trophy, MapPin } from "lucide-react";
import { User, getUserFromStorage } from "@/lib/auth";
import { Contest } from "@/lib/data";

export default function ContestsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [contests, setContests] = useState<Contest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
    if (userData) {
      fetchContests();
    }
  }, []);

  const fetchContests = async () => {
    try {
      const response = await fetch("/api/contests");
      const data = await response.json();
      setContests(data.contests || []);
    } catch (error) {
      console.error("Error fetching contests:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Upcoming":
        return "default";
      case "Registration Open":
        return "default";
      case "Completed":
        return "secondary";
      case "Cancelled":
        return "destructive";
      default:
        return "secondary";
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
            Contests & Competitions
          </h1>
          <p className="text-muted-foreground">
            {user?.role === "admin"
              ? "Manage contests and track participation across franchises"
              : "View available contests and manage registrations"}
          </p>
        </div>
        {user?.role === "admin" && (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Contest
          </Button>
        )}
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Contests</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="ongoing">Registration Open</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Contest Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Contests
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{contests.length}</div>
                <p className="text-xs text-muted-foreground">This year</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
                <Calendar className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contests.filter((c) => c.status === "Upcoming").length}
                </div>
                <p className="text-xs text-muted-foreground">Next 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Registration Open
                </CardTitle>
                <Users className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    contests.filter((c) => c.status === "Registration Open")
                      .length
                  }
                </div>
                <p className="text-xs text-muted-foreground">Available now</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Participants
                </CardTitle>
                <Users className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {contests.reduce((sum, c) => sum + c.participants, 0)}
                </div>
                <p className="text-xs text-muted-foreground">All contests</p>
              </CardContent>
            </Card>
          </div>

          {/* Contests Table */}
          <Card>
            <CardHeader>
              <CardTitle>Contest List</CardTitle>
              <CardDescription>
                {user?.role === "admin"
                  ? "Manage all contests and competitions"
                  : "Available contests for registration"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contest Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Levels</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registration Deadline</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contests.map((contest) => (
                    <TableRow key={contest.id}>
                      <TableCell className="font-medium">
                        {contest.name}
                      </TableCell>
                      <TableCell>
                        {new Date(contest.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="mr-1 h-3 w-3" />
                          {contest.location}
                        </div>
                      </TableCell>
                      <TableCell>{contest.participants}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {contest.levels.map((level, index) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {level}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(contest.status) as any}>
                          {contest.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(
                          contest.registrationDeadline
                        ).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {user?.role === "admin" ? (
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              View Results
                            </Button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            {contest.status === "Registration Open" ? (
                              <Button size="sm">Register</Button>
                            ) : contest.status === "Upcoming" ? (
                              <Button variant="outline" size="sm" disabled>
                                Registered
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm">
                                View Results
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Contests</CardTitle>
              <CardDescription>
                Contests scheduled for the future
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contest Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Registration Deadline</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contests
                    .filter((c) => c.status === "Upcoming")
                    .map((contest) => (
                      <TableRow key={contest.id}>
                        <TableCell className="font-medium">
                          {contest.name}
                        </TableCell>
                        <TableCell>
                          {new Date(contest.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{contest.location}</TableCell>
                        <TableCell>
                          {new Date(
                            contest.registrationDeadline
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {user?.role === "admin" ? (
                            <Button variant="outline" size="sm">
                              Manage
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" disabled>
                              Registered
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ongoing">
          <Card>
            <CardHeader>
              <CardTitle>Registration Open</CardTitle>
              <CardDescription>
                Contests currently accepting registrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contest Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Registration Deadline</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contests
                    .filter((c) => c.status === "Registration Open")
                    .map((contest) => (
                      <TableRow key={contest.id}>
                        <TableCell className="font-medium">
                          {contest.name}
                        </TableCell>
                        <TableCell>
                          {new Date(contest.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{contest.location}</TableCell>
                        <TableCell>
                          {new Date(
                            contest.registrationDeadline
                          ).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {user?.role === "admin" ? (
                            <Button variant="outline" size="sm">
                              Manage
                            </Button>
                          ) : (
                            <Button size="sm">Register Now</Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Completed Contests</CardTitle>
              <CardDescription>Past contests and their results</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contest Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Participants</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contests
                    .filter((c) => c.status === "Completed")
                    .map((contest) => (
                      <TableRow key={contest.id}>
                        <TableCell className="font-medium">
                          {contest.name}
                        </TableCell>
                        <TableCell>
                          {new Date(contest.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{contest.location}</TableCell>
                        <TableCell>{contest.participants}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Results
                          </Button>
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
