"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Search, Eye, Ban, Download, Users, UserPlus, Calendar, 
  Activity, MapPin, Mail, Phone, XCircle, CheckCircle,
  Clock, TrendingUp, ArrowUpRight, MessageSquare, FileText,
  AlertCircle, BarChart3
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid
} from "recharts";

type PatientStatus = "active" | "inactive" | "blocked";

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  status: PatientStatus;
  gender: string;
  age: number;
  joinDate: string;
  lastActive: string;
  totalAppointments: number;
  upcomingAppointments: number;
  totalSpent: number;
  preferredDoctor?: string;
}

export default function AdminPatientsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | PatientStatus>("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const patients: Patient[] = [
    {
      id: "PT-4856",
      name: "Saim Salman",
      email: "saim@stresssaviors.pk",
      phone: "+92 347 6894686",
      city: "Lahore",
      status: "active",
      gender: "Male",
      age: 28,
      joinDate: "2024-01-15",
      lastActive: "2 hours ago",
      totalAppointments: 12,
      upcomingAppointments: 2,
      totalSpent: 42000,
      preferredDoctor: "Dr. Ayesha Khan"
    },
    {
      id: "PT-1248",
      name: "Ali Raza",
      email: "ali.raza@gmail.com",
      phone: "+92 300 1234567",
      city: "Karachi",
      status: "active",
      gender: "Male",
      age: 35,
      joinDate: "2024-03-20",
      lastActive: "1 day ago",
      totalAppointments: 8,
      upcomingAppointments: 1,
      totalSpent: 28000,
      preferredDoctor: "Dr. Bilal Ahmed"
    },
    {
      id: "PT-9654",
      name: "Zainab Malik",
      email: "zainab@yahoo.com",
      phone: "+92 333 9876543",
      city: "Islamabad",
      status: "active",
      gender: "Female",
      age: 24,
      joinDate: "2024-05-10",
      lastActive: "3 hours ago",
      totalAppointments: 15,
      upcomingAppointments: 3,
      totalSpent: 52500,
      preferredDoctor: "Dr. Zainab Ali"
    },
    {
      id: "PT-7821",
      name: "Hassan Ahmed",
      email: "hassan.ahmed@gmail.com",
      phone: "+92 321 4567890",
      city: "Lahore",
      status: "inactive",
      gender: "Male",
      age: 42,
      joinDate: "2023-12-05",
      lastActive: "2 weeks ago",
      totalAppointments: 5,
      upcomingAppointments: 0,
      totalSpent: 17500
    },
    {
      id: "PT-3342",
      name: "Fatima Noor",
      email: "fatima.noor@example.com",
      phone: "+92 345 8889990",
      city: "Multan",
      status: "blocked",
      gender: "Female",
      age: 31,
      joinDate: "2024-02-28",
      lastActive: "1 month ago",
      totalAppointments: 3,
      upcomingAppointments: 0,
      totalSpent: 10500
    }
  ];

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         patient.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: patients.length,
    active: patients.filter(p => p.status === "active").length,
    inactive: patients.filter(p => p.status === "inactive").length,
    blocked: patients.filter(p => p.status === "blocked").length,
    newThisMonth: 18,
    totalAppointments: patients.reduce((acc, p) => acc + p.totalAppointments, 0),
    totalRevenue: patients.reduce((acc, p) => acc + p.totalSpent, 0),
    avgSpent: patients.reduce((acc, p) => acc + p.totalSpent, 0) / patients.length
  };

  const registrationData = [
    { month: "Jan", count: 45 },
    { month: "Feb", count: 52 },
    { month: "Mar", count: 48 },
    { month: "Apr", count: 61 },
    { month: "May", count: 75 },
    { month: "Jun", count: 89 }
  ];

  const getStatusBadge = (status: PatientStatus) => {
    const badges = {
      active: "bg-green-100 text-green-700 border-green-200",
      inactive: "bg-gray-100 text-gray-700 border-gray-200",
      blocked: "bg-red-100 text-red-700 border-red-200"
    };
    return badges[status];
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Manage Patients</h1>
          <p className="text-sm text-slate-600 mt-1">View and manage patient profiles and appointments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Patient
          </Button>
        </div>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Patients</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{stats.total}</h3>
                <div className="flex items-center gap-1 mt-2 text-xs">
                  <span className="text-green-600 font-medium flex items-center">
                    <ArrowUpRight className="h-3 w-3" />
                    +{stats.newThisMonth}
                  </span>
                  <span className="text-slate-500">this month</span>
                </div>
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
                <p className="text-sm font-medium text-slate-600">Active Patients</p>
                <h3 className="text-3xl font-semibold text-green-600 mt-2">{stats.active}</h3>
                <p className="text-xs text-slate-500 mt-2">{((stats.active / stats.total) * 100).toFixed(0)}% of total</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Appointments</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">{stats.totalAppointments}</h3>
                <p className="text-xs text-slate-500 mt-2">Avg {(stats.totalAppointments / stats.total).toFixed(1)} per patient</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50">
                <Calendar className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Revenue</p>
                <h3 className="text-3xl font-semibold text-slate-900 mt-2">₨{(stats.totalRevenue / 1000).toFixed(0)}k</h3>
                <p className="text-xs text-slate-500 mt-2">Avg ₨{(stats.avgSpent / 1000).toFixed(1)}k per patient</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Patient Registration Trend</CardTitle>
                  <CardDescription>Monthly new patient signups</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={registrationData}>
                    <defs>
                      <linearGradient id="registrations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#registrations)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex-1 w-full sm:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search by name, email, or ID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(["all", "active", "inactive", "blocked"] as const).map(status => (
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
                          {patients.filter(p => p.status === status).length}
                        </span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-200">
                {filteredPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {patient.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-slate-900">{patient.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(patient.status)}`}>
                            {patient.status}
                          </span>
                          <span className="text-xs text-slate-500">ID: {patient.id}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-600">
                          <Mail className="h-3 w-3" />
                          {patient.email}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {patient.city}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {patient.totalAppointments} appointments
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {patient.lastActive}
                          </span>
                          <span className="font-medium text-green-600">
                            ₨{patient.totalSpent.toLocaleString()} spent
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => setSelectedPatient(patient)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {patient.status === "active" && (
                        <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      {patient.status === "blocked" && (
                        <Button size="sm" variant="outline" className="text-green-600 hover:bg-green-50">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredPatients.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-medium text-slate-900">No patients found</p>
                    <p className="text-sm text-slate-600 mt-1">Try adjusting your search or filters</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Patient metrics overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Active</p>
                    <p className="text-lg font-semibold text-slate-900">{stats.active}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-50">
                    <Clock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Inactive</p>
                    <p className="text-lg font-semibold text-slate-900">{stats.inactive}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Blocked</p>
                    <p className="text-lg font-semibold text-slate-900">{stats.blocked}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Spending Patients</CardTitle>
              <CardDescription>Highest lifetime value</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {patients
                  .sort((a, b) => b.totalSpent - a.totalSpent)
                  .slice(0, 5)
                  .map((patient, i) => (
                    <div key={patient.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                          #{i + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{patient.name}</p>
                          <p className="text-xs text-slate-600">{patient.totalAppointments} appointments</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-600">₨{(patient.totalSpent / 1000).toFixed(0)}k</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Broadcast
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Patient Data
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedPatient(null)}>
          <Card className="max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-xl">
                    {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <CardTitle className="text-xl">{selectedPatient.name}</CardTitle>
                    <CardDescription>Patient ID: {selectedPatient.id}</CardDescription>
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(selectedPatient.status)}`}>
                      {selectedPatient.status}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>
                  <XCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Appointments</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{selectedPatient.totalAppointments}</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Upcoming</div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{selectedPatient.upcomingAppointments}</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Total Spent</div>
                  <div className="text-2xl font-bold text-green-600 mt-1">₨{(selectedPatient.totalSpent / 1000).toFixed(0)}k</div>
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="text-sm text-slate-600">Age</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{selectedPatient.age}</div>
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Personal Information
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Mail className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs text-slate-600">Email</div>
                      <div className="font-medium text-sm">{selectedPatient.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Phone className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs text-slate-600">Phone</div>
                      <div className="font-medium text-sm">{selectedPatient.phone}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <MapPin className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs text-slate-600">City</div>
                      <div className="font-medium text-sm">{selectedPatient.city}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <Users className="h-4 w-4 text-slate-600" />
                    <div>
                      <div className="text-xs text-slate-600">Gender</div>
                      <div className="font-medium text-sm">{selectedPatient.gender}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div>
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Account Information
                </h4>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-600">Member Since</div>
                    <div className="font-medium text-sm mt-1">{new Date(selectedPatient.joinDate).toLocaleDateString()}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-600">Last Active</div>
                    <div className="font-medium text-sm mt-1">{selectedPatient.lastActive}</div>
                  </div>
                  {selectedPatient.preferredDoctor && (
                    <div className="p-3 bg-slate-50 rounded-lg sm:col-span-2">
                      <div className="text-xs text-slate-600">Preferred Doctor</div>
                      <div className="font-medium text-sm mt-1">{selectedPatient.preferredDoctor}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t border-slate-200">
                <Button variant="outline" className="flex-1">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Send Message
                </Button>
                <Button variant="outline" className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  View Appointments
                </Button>
                {selectedPatient.status === "active" && (
                  <Button variant="outline" className="text-red-600 hover:bg-red-50">
                    <Ban className="h-4 w-4 mr-2" />
                    Block
                  </Button>
                )}
                {selectedPatient.status === "blocked" && (
                  <Button variant="outline" className="text-green-600 hover:bg-green-50">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Unblock
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
