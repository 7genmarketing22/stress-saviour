"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Search, Eye, Ban, CheckCircle, XCircle, Download,
  Star, MapPin, Briefcase, Phone, Mail, Users, AlertTriangle
} from "lucide-react";

type DoctorStatus = "pending" | "approved" | "rejected" | "suspended";

interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  city: string;
  status: DoctorStatus;
  rating: number;
  consultations: number;
  experience: number;
  fee: number;
}

export default function AdminDoctorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DoctorStatus>("all");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const doctors: Doctor[] = [
    {
      id: "1",
      name: "Dr. Ayesha Khan",
      email: "ayesha.khan@example.com",
      phone: "+92 300 1234567",
      specialization: "Clinical Psychologist",
      city: "Lahore",
      status: "approved",
      rating: 4.9,
      consultations: 342,
      experience: 12,
      fee: 3500
    },
    {
      id: "2",
      name: "Dr. Bilal Ahmed",
      email: "bilal.ahmed@example.com",
      phone: "+92 301 9876543",
      specialization: "Psychiatrist",
      city: "Karachi",
      status: "approved",
      rating: 4.8,
      consultations: 428,
      experience: 15,
      fee: 4000
    },
    {
      id: "3",
      name: "Dr. Farah Jamil",
      email: "farah.jamil@example.com",
      phone: "+92 300 1234567",
      specialization: "Clinical Counselor",
      city: "Islamabad",
      status: "pending",
      rating: 4.7,
      consultations: 156,
      experience: 8,
      fee: 3000
    }
  ];

  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: doctors.length,
    approved: doctors.filter(d => d.status === "approved").length,
    pending: doctors.filter(d => d.status === "pending").length,
    rejected: doctors.filter(d => d.status === "rejected").length,
    avgRating: 4.8,
    totalConsultations: doctors.reduce((acc, d) => acc + d.consultations, 0)
  };

  const getStatusBadge = (status: DoctorStatus) => {
    const colors = {
      approved: "bg-green-100 text-green-700",
      pending: "bg-yellow-100 text-yellow-700",
      rejected: "bg-red-100 text-red-700",
      suspended: "bg-gray-100 text-gray-700"
    };
    return colors[status];
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Manage Doctors</h1>
          <p className="text-sm text-slate-600 mt-1">Review credentials and manage doctor profiles</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            + Invite Doctor
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Doctors</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{stats.total}</h3>
                <p className="text-xs text-slate-500 mt-2">{stats.approved} active</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Approved</p>
                <h3 className="text-3xl font-semibold text-green-600 mt-2">{stats.approved}</h3>
                <p className="text-xs text-slate-500 mt-2">Active on platform</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pending Review</p>
                <h3 className="text-3xl font-semibold text-yellow-600 mt-2">{stats.pending}</h3>
                <p className="text-xs text-slate-500 mt-2">Awaiting approval</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Platform Rating</p>
                <div className="flex items-baseline gap-1 mt-2">
                  <h3 className="text-3xl font-semibold text-slate-900">{stats.avgRating}</h3>
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
                <p className="text-xs text-slate-500 mt-2">From all doctors</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50">
                <Star className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="border-b border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, specialization, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["all", "approved", "pending", "rejected"] as const).map(status => (
                <Button
                  key={status}
                  size="sm"
                  variant={statusFilter === status ? "default" : "outline"}
                  onClick={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status}
                  {status !== "all" && (
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-background rounded">
                      {doctors.filter(d => d.status === status).length}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-200">
            {filteredDoctors.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {doc.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium text-slate-900">{doc.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(doc.status)}`}>
                        {doc.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{doc.specialization}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {doc.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {doc.experience} years
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {doc.rating}
                      </span>
                      <span>{doc.consultations} sessions</span>
                      <span className="font-medium text-green-600">₨{doc.fee.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="outline" onClick={() => setSelectedDoctor(doc)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  {doc.status === "pending" && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50">
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                  {doc.status === "approved" && (
                    <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                      <Ban className="h-4 w-4 mr-1" />
                      Suspend
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {filteredDoctors.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                <p className="text-sm font-medium text-slate-900">No doctors found</p>
                <p className="text-sm text-slate-600 mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedDoctor(null)}>
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xl">
                    {selectedDoctor.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <CardTitle>{selectedDoctor.name}</CardTitle>
                    <CardDescription>{selectedDoctor.specialization}</CardDescription>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedDoctor(null)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Rating</div>
                  <div className="text-xl font-bold flex items-center gap-1">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    {selectedDoctor.rating}
                  </div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Consultations</div>
                  <div className="text-xl font-bold">{selectedDoctor.consultations}</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Experience</div>
                  <div className="text-xl font-bold">{selectedDoctor.experience} years</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="text-sm text-muted-foreground">Fee</div>
                  <div className="text-xl font-bold">₨{selectedDoctor.fee}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="font-medium">{selectedDoctor.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="font-medium">{selectedDoctor.phone}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">City</div>
                    <div className="font-medium">{selectedDoctor.city}</div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {selectedDoctor.status === "pending" && (
                  <>
                    <Button className="flex-1">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Doctor
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </>
                )}
                {selectedDoctor.status === "approved" && (
                  <Button variant="outline" className="flex-1">
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend Account
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
