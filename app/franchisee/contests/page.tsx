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
import { Search, Trophy, Calendar, MapPin, Users, Clock } from "lucide-react";
import { getUserFromStorage } from "@/lib/auth";
import { CONTESTS } from "@/lib/data";

export default function FranchiseeContestsPage() {
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const userData = getUserFromStorage();
    setUser(userData);
  }, []);

  if (!user || !user.franchiseId) {
    return <div>Loading...</div>;
  }

  const filteredContests = CONTESTS.filter(
    (contest) =>
      contest.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contest.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contest.levels.some((level) =>
        level.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Upcoming":
        return "bg-blue-100 text-blue-800";
      case "Registration Open":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const upcomingContests = CONTESTS.filter(
    (contest) => contest.status === "Upcoming"
  ).length;
  const openRegistration = CONTESTS.filter(
    (contest) => contest.status === "Registration Open"
  ).length;
  const completedContests = CONTESTS.filter(
    (contest) => contest.status === "Completed"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contests</h1>
          <p className="text-muted-foreground">
            Participate in contests and competitions - {user.franchiseName}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Contests
            </CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{CONTESTS.length}</div>
            <p className="text-xs text-muted-foreground">Available contests</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Registration Open
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRegistration}</div>
            <p className="text-xs text-muted-foreground">Register now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingContests}</div>
            <p className="text-xs text-muted-foreground">Soon to start</p>
          </CardContent>
        </Card>
      </div>

      {/* Contest Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Contest Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {["Upcoming", "Registration Open", "Completed", "Cancelled"].map(
              (status) => {
                const count = CONTESTS.filter(
                  (contest) => contest.status === status
                ).length;

                return (
                  <div
                    key={status}
                    className="text-center p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="text-xl font-bold">{count}</div>
                    <div className="text-sm text-muted-foreground">
                      {status}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </CardContent>
      </Card>

      {/* Featured Contests */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CONTESTS.filter(
          (contest) =>
            contest.status === "Registration Open" ||
            contest.status === "Upcoming"
        )
          .slice(0, 3)
          .map((contest) => (
            <Card key={contest.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{contest.name}</CardTitle>
                  <Badge
                    className={getStatusColor(contest.status)}
                    variant="secondary"
                  >
                    {contest.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    {new Date(contest.date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    {contest.location}
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="h-4 w-4 mr-2" />
                    {contest.participants} participants
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {contest.levels.map((level, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {level}
                      </Badge>
                    ))}
                  </div>
                  {contest.status === "Registration Open" && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">
                        Registration deadline:{" "}
                        {new Date(
                          contest.registrationDeadline
                        ).toLocaleDateString()}
                      </p>
                      <Button size="sm" className="w-full">
                        Register Now
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* All Contests Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>All Contests</CardTitle>
              <CardDescription>
                Browse all available contests and competitions
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search contests..."
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
              {filteredContests.map((contest) => (
                <TableRow key={contest.id}>
                  <TableCell className="font-medium">{contest.name}</TableCell>
                  <TableCell>
                    {new Date(contest.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{contest.location}</TableCell>
                  <TableCell>{contest.participants}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {contest.levels.slice(0, 2).map((level, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="text-xs"
                        >
                          {level}
                        </Badge>
                      ))}
                      {contest.levels.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{contest.levels.length - 2} more
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={getStatusColor(contest.status)}
                      variant="secondary"
                    >
                      {contest.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(
                      contest.registrationDeadline
                    ).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {contest.status === "Registration Open" ? (
                      <Button variant="default" size="sm">
                        Register
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filteredContests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchTerm
                        ? "No contests found matching your search."
                        : "No contests available yet."}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
