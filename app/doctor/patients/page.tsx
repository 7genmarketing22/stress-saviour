"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { 
  Users, FileText, Calendar, Eye, Search, X, Plus, Clock, Stethoscope,
  ChevronLeft, ChevronRight, Filter, UserPlus, Phone, Mail, MapPin,
  Edit, Trash2, TrendingUp, Paperclip,
  AlertTriangle, Upload
} from "lucide-react";
import { useDoctor } from "@/contexts/DoctorContext";
import { getDoctorAppointments, saveClinicalRecords } from "@/lib/doctor/api";
import { mapPatientsFromAppointments, type UIPatient } from "@/lib/doctor/mappers";

interface Patient extends UIPatient {
  emergencyContact?: string;
  emergencyPhone?: string;
  anxietyScores?: Array<{ date: string; score: number }>;
}

export default function DoctorPatientsPage() {
  const { doctorProfile } = useDoctor();
  const [searchQuery, setSearchQuery] = useState("");
  const [patientFilter, setPatientFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [showAddPrescriptionModal, setShowAddPrescriptionModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'prescriptions'>('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const patientsPerPage = 6;
  const [patients, setPatients] = useState<Patient[]>([]);
  const [rawAppointments, setRawAppointments] = useState<Awaited<ReturnType<typeof getDoctorAppointments>>>([]);

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const loadPatients = async () => {
    setIsLoading(true);
    try {
      const appointments = await getDoctorAppointments(doctorProfile.id);
      setRawAppointments(appointments);
      setPatients(mapPatientsFromAppointments(appointments));
    } catch {
      showToast("Failed to load patients.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [doctorProfile.id]);

  const [newPatientForm, setNewPatientForm] = useState({
    name: "",
    age: "",
    gender: "",
    city: "",
    phone: "",
    email: "",
    condition: "",
  });

  const [editPatientForm, setEditPatientForm] = useState({
    id: "",
    name: "",
    age: "",
    gender: "",
    city: "",
    phone: "",
    email: "",
    condition: "",
  });

  const [newSessionForm, setNewSessionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: "Follow-up",
    notes: "",
  });

  const [newPrescriptionForm, setNewPrescriptionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    medication: "",
    dosage: "",
  });

  const getLatestAppointmentForPatient = (patientId: string) => {
    return rawAppointments
      .filter((apt) => apt.patient_id === patientId)
      .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime())[0];
  };

  const handleAddPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Patients register through the patient portal. They appear here after booking.");
    setShowAddPatientModal(false);
  };

  const handleEditPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast("Patient profile details are managed by the patient.");
    setShowEditPatientModal(false);
  };

  const handleDeletePatient = () => {
    showToast("Patient records cannot be deleted from the doctor portal.");
  };

  const handleAddSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const appointment = getLatestAppointmentForPatient(selectedPatient.id);
    if (!appointment) {
      showToast("No appointment found for this patient.");
      return;
    }

    try {
      await saveClinicalRecords(
        appointment.id,
        `[${newSessionForm.type} - ${newSessionForm.date}] ${newSessionForm.notes}`,
        null,
        true
      );
      showToast("Session note saved to patient record.");
      setShowAddSessionModal(false);
      setNewSessionForm({
        date: new Date().toISOString().split("T")[0],
        type: "Follow-up",
        notes: "",
      });
      await loadPatients();
      const refreshed = mapPatientsFromAppointments(await getDoctorAppointments(doctorProfile.id));
      const updated = refreshed.find((p) => p.id === selectedPatient.id);
      if (updated) setSelectedPatient(updated);
    } catch {
      showToast("Failed to save session note.");
    }
  };

  const handleAddPrescriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;

    const appointment = getLatestAppointmentForPatient(selectedPatient.id);
    if (!appointment) {
      showToast("No appointment found for this patient.");
      return;
    }

    try {
      await saveClinicalRecords(
        appointment.id,
        `Prescription added on ${newPrescriptionForm.date}`,
        {
          medication: newPrescriptionForm.medication,
          dosage: newPrescriptionForm.dosage,
        },
        true
      );
      showToast("Prescription saved to patient record.");
      setShowAddPrescriptionModal(false);
      setNewPrescriptionForm({
        date: new Date().toISOString().split("T")[0],
        medication: "",
        dosage: "",
      });
      await loadPatients();
      const refreshed = mapPatientsFromAppointments(await getDoctorAppointments(doctorProfile.id));
      const updated = refreshed.find((p) => p.id === selectedPatient.id);
      if (updated) setSelectedPatient(updated);
    } catch {
      showToast("Failed to save prescription.");
    }
  };

  const handleViewDocument = (doc: { name: string }) => {
    if (doc.name.startsWith("http")) {
      window.open(doc.name, "_blank", "noopener,noreferrer");
    } else {
      showToast("Document preview is available when a prescription file URL is uploaded.");
    }
  };

  // Open Patient Modal
  const openPatientModal = (patient: Patient, tab: 'overview' | 'sessions' | 'prescriptions' = 'overview') => {
    setSelectedPatient(patient);
    setActiveTab(tab);
    setShowPatientModal(true);
  };

  // Open Edit Patient Modal
  const openEditPatientModal = (patient: Patient) => {
    setEditPatientForm({
      id: patient.id,
      name: patient.name,
      age: patient.age.replace(' years', ''),
      gender: patient.gender,
      city: patient.city,
      phone: patient.phone,
      email: patient.email,
      condition: patient.condition,
    });
    setShowEditPatientModal(true);
  };

  // Filtered and Pagination
  const filteredPatients = patients.filter((pt) => {
    const matchesSearch =
      pt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pt.condition.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (patientFilter === "active") return pt.sessionsCompleted > 0;
    if (patientFilter === "inactive") return pt.sessionsCompleted === 0;
    return true;
  });

  const indexOfLastPatient = currentPage * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-medium border border-slate-800">
          <span>{toastMessage}</span>
        </div>
      )}
      {/* Header Description */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Patient Registry</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your patients, session notes, and prescriptions.
          </p>
        </div>
        <Button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white" onClick={() => setShowAddPatientModal(true)}>
          <UserPlus className="h-4 w-4" />
          Add New Patient
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search patient by name or condition..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
          <select
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value as typeof patientFilter)}
            className="h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
          >
            <option value="all">All Patients</option>
            <option value="active">Active (Had sessions)</option>
            <option value="inactive">New Patients</option>
          </select>
        </div>
      </div>

      {/* Patient Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {currentPatients.length > 0 ? (
          currentPatients.map((pt) => (
            <Card key={pt.id} className="hover:shadow-md transition-shadow duration-200 group overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">{pt.id}</span>
                  <span className="text-xs text-brand-500 bg-brand-400/10 px-2 py-0.5 rounded-full font-semibold">
                    {pt.sessionsCompleted} Sessions
                  </span>
                </div>
                <CardTitle className="text-base mt-2">{pt.name}</CardTitle>
                <CardDescription>
                  {pt.age} • {pt.gender} • {pt.city}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-t border-border pt-3 space-y-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Primary Diagnosis:</span>
                    <p className="font-semibold text-foreground mt-0.5">{pt.condition}</p>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Last session:
                    </span>
                    <span className="font-medium text-foreground">{pt.lastConsultation}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-1.5"
                    onClick={() => openPatientModal(pt, 'overview')}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>View Profile</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-1.5 text-brand-500 hover:bg-brand-400/10 hover:text-brand-500"
                    onClick={() => openPatientModal(pt, 'sessions')}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>History</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center border border-dashed rounded-xl bg-card">
            <Users className="h-10 w-10 text-muted-foreground/60 mb-3 mx-auto" />
            <h4 className="font-semibold text-lg">No patients found</h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              {searchQuery ? "No matching records found for your search query." : "You haven't added any patients yet."}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            Page <span className="font-semibold text-foreground mx-1">{currentPage}</span> of <span className="font-semibold text-foreground">{totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Patient Detail Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-border flex items-center justify-between sticky top-0 bg-card z-10">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center font-bold text-lg">
                  {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-bold">{selectedPatient.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedPatient.id} • {selectedPatient.condition}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => openEditPatientModal(selectedPatient)} className="h-8 w-8 p-0">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeletePatient()} className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowPatientModal(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-border px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'overview' ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('sessions')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'sessions' ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Session History ({selectedPatient.sessionHistory.length})
              </button>
              <button
                onClick={() => setActiveTab('prescriptions')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'prescriptions' ? 'border-brand-500 text-brand-500' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Prescriptions ({selectedPatient.prescriptions.length})
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Personal Info */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                      <Stethoscope className="h-4 w-4 text-brand-500" />
                      Patient Information
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2 bg-muted/20 p-4 rounded-xl border border-border/60">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Age & Gender</p>
                        <p className="text-sm font-medium mt-0.5">{selectedPatient.age} • {selectedPatient.gender}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Primary Diagnosis</p>
                        <p className="text-sm font-semibold text-brand-500 mt-0.5">{selectedPatient.condition}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Contact Details</p>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mt-1">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{selectedPatient.phone}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mt-1">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{selectedPatient.email}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Residential Location</p>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-foreground mt-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>{selectedPatient.city}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Anxiety Tracker (GAD-7) */}
                  <div className="border-t border-border/60 pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                      <TrendingUp className="h-4 w-4 text-brand-500" />
                      Anxiety Tracker (GAD-7 Scores)
                    </h4>
                    {selectedPatient.anxietyScores && selectedPatient.anxietyScores.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-3">
                        {selectedPatient.anxietyScores.map((score, i) => {
                          let levelColor = "bg-emerald-50 text-emerald-700 border-emerald-200/50 dark:bg-emerald-950/20 dark:text-emerald-400";
                          let levelLabel = "Minimal";
                          if (score.score >= 15) {
                            levelColor = "bg-rose-50 text-rose-700 border-rose-200/50 dark:bg-rose-950/20 dark:text-rose-400";
                            levelLabel = "Severe";
                          } else if (score.score >= 10) {
                             levelColor = "bg-amber-50 text-amber-700 border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400";
                             levelLabel = "Moderate";
                          } else if (score.score >= 5) {
                             levelColor = "bg-yellow-50 text-yellow-700 border-yellow-200/50 dark:bg-yellow-950/20 dark:text-yellow-400";
                             levelLabel = "Mild";
                          }
                          return (
                            <div key={i} className="flex-1 min-w-[100px] text-center p-3 rounded-xl border border-border bg-card shadow-sm">
                              <p className="text-[10px] text-muted-foreground font-semibold">{score.date}</p>
                              <p className="text-2xl font-bold mt-1 text-foreground">{score.score}</p>
                              <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full border mt-1.5 font-bold ${levelColor}`}>
                                {levelLabel}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border text-center">No GAD-7 assessments recorded yet.</p>
                    )}
                  </div>

                  {/* Attached Clinical Files */}
                  <div className="border-t border-border/60 pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                       <Paperclip className="h-4 w-4 text-brand-500" />
                       Clinical Documents & Reports
                    </h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedPatient.documents && selectedPatient.documents.length > 0 ? (
                        selectedPatient.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{doc.name}</p>
                                <p className="text-[9px] text-muted-foreground mt-0.5">{doc.date} • {doc.size}</p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-brand-500 hover:text-brand-600 font-semibold text-xs"
                              onClick={() => handleViewDocument(doc)}
                            >
                              View
                            </Button>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-2 text-xs text-muted-foreground bg-muted/20 p-3 rounded-lg border text-center">
                          No medical uploads on file.
                        </div>
                      )}
                      <div
                        className="flex items-center justify-center p-3 rounded-xl border border-dashed border-border/80 bg-muted/5 text-xs text-muted-foreground hover:bg-muted/20 cursor-pointer"
                        onClick={() => showToast("Upload prescription files from the appointments clinical notes writer.")}
                      >
                        <Upload className="h-4 w-4 mr-1.5 text-brand-500" />
                        <span className="font-medium">Upload clinical file</span>
                      </div>
                    </div>
                  </div>

                  {/* Emergency Contact */}
                  <div className="border-t border-border/60 pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2 text-foreground">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Emergency Contacts
                    </h4>
                    <div className="grid gap-4 sm:grid-cols-2 bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 text-xs">
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Contact Person</p>
                        <p className="font-semibold text-foreground mt-0.5">{selectedPatient.emergencyContact || "Not Specified"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase">Phone Number</p>
                        <p className="font-semibold text-foreground mt-0.5">{selectedPatient.emergencyPhone || "Not Specified"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sessions' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Session Notes
                    </h4>
                    <Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white" onClick={() => setShowAddSessionModal(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Session
                    </Button>
                  </div>
                  
                  {selectedPatient.sessionHistory.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPatient.sessionHistory.map((session) => (
                        <Card key={session.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold">{session.type}</span>
                              <span className="text-xs text-muted-foreground">{session.date}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{session.notes}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                      No sessions recorded yet.
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'prescriptions' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Prescription History
                    </h4>
                    <Button size="sm" className="bg-brand-500 hover:bg-brand-600 text-white" onClick={() => setShowAddPrescriptionModal(true)}>
                      <Plus className="h-3.5 w-3.5 mr-1.5" /> Add Prescription
                    </Button>
                  </div>

                  {selectedPatient.prescriptions.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPatient.prescriptions.map((rx) => (
                        <Card key={rx.id} className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/30">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-semibold text-green-800 dark:text-green-300">{rx.medication}</span>
                              <span className="text-xs text-muted-foreground">{rx.date}</span>
                            </div>
                            <p className="text-sm text-green-700 dark:text-green-400">Dosage: {rx.dosage}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl">
                      No prescriptions on file.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Add New Patient</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowAddPatientModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAddPatientSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  value={newPatientForm.name}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                  placeholder="e.g., Muhammad Ali"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Age</label>
                  <input
                    type="number"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                    value={newPatientForm.age}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, age: e.target.value })}
                    placeholder="28"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Gender</label>
                  <select
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                    value={newPatientForm.gender}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, gender: e.target.value })}
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">City</label>
                <input
                  type="text"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  value={newPatientForm.city}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, city: e.target.value })}
                  placeholder="e.g., Lahore"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
                  <input
                    type="tel"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                    value={newPatientForm.phone}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                    placeholder="+92 300 1234567"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                    value={newPatientForm.email}
                    onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Primary Diagnosis/Reason</label>
                <input
                  type="text"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  value={newPatientForm.condition}
                  onChange={(e) => setNewPatientForm({ ...newPatientForm, condition: e.target.value })}
                  placeholder="e.g., Anxiety"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-600 text-white">
                  Add Patient
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddPatientModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Patient Modal */}
      {showEditPatientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Edit Patient</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowEditPatientModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleEditPatientSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  value={editPatientForm.name}
                  onChange={(e) => setEditPatientForm({ ...editPatientForm, name: e.target.value })}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Age</label>
                  <input
                    type="number"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                    value={editPatientForm.age}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, age: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Gender</label>
                  <select
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                    value={editPatientForm.gender}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, gender: e.target.value })}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">City</label>
                <input
                  type="text"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  value={editPatientForm.city}
                  onChange={(e) => setEditPatientForm({ ...editPatientForm, city: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Phone</label>
                  <input
                    type="tel"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                    value={editPatientForm.phone}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                  <input
                    type="email"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                    value={editPatientForm.email}
                    onChange={(e) => setEditPatientForm({ ...editPatientForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Primary Diagnosis</label>
                <input
                  type="text"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  value={editPatientForm.condition}
                  onChange={(e) => setEditPatientForm({ ...editPatientForm, condition: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-600 text-white">
                  Save Changes
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowEditPatientModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Session Modal */}
      {showAddSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Add Session Note</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowAddSessionModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAddSessionSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Date</label>
                  <input
                    type="date"
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                    value={newSessionForm.date}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1 block">Session Type</label>
                  <select
                    required
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                    value={newSessionForm.type}
                    onChange={(e) => setNewSessionForm({ ...newSessionForm, type: e.target.value })}
                  >
                    <option value="Initial Consultation">Initial Consultation</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="CBT Session">CBT Session</option>
                    <option value="Crisis Session">Crisis Session</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Session Notes</label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  value={newSessionForm.notes}
                  onChange={(e) => setNewSessionForm({ ...newSessionForm, notes: e.target.value })}
                  placeholder="Enter detailed session notes here..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-600 text-white">
                  Add Session Note
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddSessionModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Prescription Modal */}
      {showAddPrescriptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <h3 className="text-lg font-bold">Add Prescription</h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setShowAddPrescriptionModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleAddPrescriptionSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Date</label>
                <input
                  type="date"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  value={newPrescriptionForm.date}
                  onChange={(e) => setNewPrescriptionForm({ ...newPrescriptionForm, date: e.target.value })}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Medication Name</label>
                <input
                  type="text"
                  required
                  className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  value={newPrescriptionForm.medication}
                  onChange={(e) => setNewPrescriptionForm({ ...newPrescriptionForm, medication: e.target.value })}
                  placeholder="e.g., Sertraline 50mg"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Dosage Instructions</label>
                <textarea
                  required
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all"
                  value={newPrescriptionForm.dosage}
                  onChange={(e) => setNewPrescriptionForm({ ...newPrescriptionForm, dosage: e.target.value })}
                  placeholder="e.g., Once daily with food"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-600 text-white">
                  Add Prescription
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddPrescriptionModal(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
