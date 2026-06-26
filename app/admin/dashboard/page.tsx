"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Users, UserCheck, Calendar, DollarSign, Star, Activity, AlertTriangle,
  Eye, CheckCircle2, Download, RefreshCw, ArrowUpRight,
  ArrowDownRight, BarChart3, MessageSquare
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
  Bar, BarChart, CartesianGrid
} from "recharts";

export default function AdminDashboardPage() {
  const [pendingDoctors, setPendingDoctors] = useState([
    {
      id: "doc-01",
      name: "Dr. Farah Jamil",
      specialization: "Clinical Counselor",
      dateApplied: "June 21, 2026",
      experience: "8 years",
      pmdc: "PMDC-48562-C"
    },
    {
      id: "doc-02",
      name: "Dr. Haris Malik",
      specialization: "Psychiatrist",
      dateApplied: "June 20, 2026",
      experience: "12 years",
      pmdc: "PMDC-12596-P"
    }
  ]);

  const stats = [
    { 
      title: "Total Revenue", 
      value: "₨1,427,500", 
      change: "+12.5%", 
      icon: DollarSign, 
      positive: true,
      description: "Platform earnings this month"
    },
    { 
      title: "Active Doctors", 
      value: "127", 
      change: "+8 this month", 
      icon: UserCheck, 
      positive: true,
      description: "2 doctors online now"
    },
    { 
      title: "Total Patients", 
      value: "1,845", 
      change: "+156 this month", 
      icon: Users, 
      positive: true,
      description: "18 registered today"
    },
    { 
      title: "Appointments Today", 
      value: "89", 
      change: "-3.2% vs yesterday", 
      icon: Calendar, 
      positive: false,
      description: "47 completed, 42 upcoming"
    },
    { 
      title: "Pending Reviews", 
      value: "3", 
      change: "2 new today", 
      icon: AlertTriangle, 
      positive: true,
      description: "Doctor applications"
    },
    { 
      title: "Avg Rating", 
      value: "4.8", 
      change: "+0.2 this month", 
      icon: Star, 
      positive: true,
      description: "From 342 reviews"
    }
  ];

  const revenueData = [
    { month: "Jan", revenue: 45000 },
    { month: "Feb", revenue: 52000 },
    { month: "Mar", revenue: 48000 },
    { month: "Apr", revenue: 61000 },
    { month: "May", revenue: 85000 },
    { month: "Jun", revenue: 142000 }
  ];

  const appointmentData = [
    { day: "Mon", count: 45 },
    { day: "Tue", count: 52 },
    { day: "Wed", count: 48 },
    { day: "Thu", count: 58 },
    { day: "Fri", count: 61 },
    { day: "Sat", count: 39 },
    { day: "Sun", count: 28 }
  ];


  const recentActivity = [
    { text: "New patient registered: Saim Salman", time: "10 min ago", type: "user" },
    { text: "Appointment booked with Dr. Ayesha", time: "1 hour ago", type: "appointment" },
    { text: "Payment completed - ₨3,500", time: "2 hours ago", type: "payment" },
    { text: "Dr. Bilal completed session", time: "3 hours ago", type: "session" },
    { text: "New review posted (5 stars)", time: "5 hours ago", type: "review" }
  ];

  const topDoctors = [
    { name: "Dr. Ayesha Khan", consultations: 89, earnings: 267000, rating: 4.9 },
    { name: "Dr. Bilal Ahmed", consultations: 76, earnings: 228000, rating: 4.8 },
    { name: "Dr. Zainab Ali", consultations: 68, earnings: 204000, rating: 4.9 },
    { name: "Dr. Hassan Raza", consultations: 62, earnings: 186000, rating: 4.7 }
  ];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-[1600px] mx-auto">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">Monitor your platform's performance and activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Stats Grid - Mobile Responsive */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 xs:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          const TrendIcon = stat.positive ? ArrowUpRight : ArrowDownRight;
          return (
            <Card key={i} className="relative overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-slate-600 truncate">{stat.title}</p>
                    <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
                      <h3 className="text-2xl sm:text-3xl font-semibold text-slate-900">{stat.value}</h3>
                      <span className={`text-xs sm:text-sm font-medium flex items-center gap-0.5 ${stat.positive ? 'text-green-600' : 'text-red-600'}`}>
                        <TrendIcon className="h-3 w-3" />
                        {stat.change}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 truncate">{stat.description}</p>
                  </div>
                  <div className={`p-2 sm:p-3 rounded-lg ${stat.positive ? 'bg-green-50' : 'bg-red-50'} flex-shrink-0`}>
                    <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.positive ? 'text-green-600' : 'text-red-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts and Content - Mobile Optimized */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
          {/* Revenue Overview */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base sm:text-lg">Revenue Overview</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Monthly platform earnings</CardDescription>
                </div>
                <Button variant="outline" size="sm" className="w-full sm:w-auto">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <span className="text-xs sm:text-sm">View Report</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-[250px] sm:h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(value) => `₨${value/1000}k`} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        fontSize: '12px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#revenue)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Appointments */}
          <Card>
            <CardHeader className="pb-3 sm:pb-6">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base sm:text-lg">Weekly Appointments</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Daily booking trends</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="h-[200px] sm:h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pending Doctor Verifications</CardTitle>
              <CardDescription>Applications awaiting review</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingDoctors.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-medium text-sm">
                      {doc.name.split(' ')[1]?.[0]}{doc.name.split(' ')[2]?.[0] || doc.name.split(' ')[1]?.[1]}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{doc.name}</p>
                      <p className="text-sm text-slate-600">{doc.specialization}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{doc.pmdc}</span>
                        <span>•</span>
                        <span>{doc.experience}</span>
                        <span>•</span>
                        <span>{doc.dateApplied}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => setPendingDoctors(prev => prev.filter(d => d.id !== doc.id))}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {pendingDoctors.length === 0 && (
                <div className="text-center py-12 border border-dashed border-slate-300 rounded-lg">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-sm font-medium text-slate-900">All caught up!</p>
                  <p className="text-sm text-slate-600 mt-1">No pending verifications</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest platform events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900">{activity.text}</p>
                      <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" size="sm">
                View All Activity
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performing Doctors</CardTitle>
              <CardDescription>Highest earners this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topDoctors.map((doctor, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                        #{i + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{doctor.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-600">{doctor.consultations} sessions</span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-yellow-600 flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-yellow-600" />
                            {doctor.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">₨{(doctor.earnings / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" size="sm">
                View All Doctors
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link href="/admin/staff">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Staff
                </Button>
              </Link>
              <Link href="/admin/reports">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Reports
                </Button>
              </Link>
              <Button variant="outline" className="w-full justify-start" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Broadcast
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
