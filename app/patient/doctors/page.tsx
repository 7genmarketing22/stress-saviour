"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MapPin, Star, Sparkles, Filter, CheckCircle, Search, X, Calendar, Loader2, ShieldCheck, ArrowLeft, CreditCard } from "lucide-react";
import { bookAppointment, getApprovedDoctors, submitPaymentProof } from "@/lib/patient/api";
import { mapToDoctorCard } from "@/lib/patient/mappers";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { PaymentProofUpload } from "@/components/patient/PaymentProofUpload";
import { BOOKING_PAYMENT_METHODS, PLATFORM_PAYMENT_ACCOUNTS, type BookablePaymentMethod } from "@/lib/payment/config";
import type { DoctorWithProfile } from "@/lib/patient/types";
import type { AppointmentType } from "@/types";

export default function PatientDoctorsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("All");
  const [doctors, setDoctors] = useState<DoctorWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingDoctor, setBookingDoctor] = useState<ReturnType<typeof mapToDoctorCard> | null>(null);
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("10:00");
  const [bookType, setBookType] = useState<AppointmentType>("video");
  const [bookNotes, setBookNotes] = useState("");
  const [bookStep, setBookStep] = useState<1 | 2>(1);
  const [paymentMethod, setPaymentMethod] = useState<BookablePaymentMethod>("jazzcash");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getApprovedDoctors()
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  }, []);

  const specialties = useMemo(() => {
    const specs = new Set(doctors.map((d) => d.specialization));
    return ["All", ...Array.from(specs).sort()];
  }, [doctors]);

  const doctorCards = useMemo(() => doctors.map(mapToDoctorCard), [doctors]);

  const filteredDoctors = doctorCards.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpecialty =
      selectedSpecialty === "All" ||
      doc.specialization.toLowerCase().includes(selectedSpecialty.toLowerCase());
    return matchesSearch && matchesSpecialty;
  });

  const openBooking = (doc: ReturnType<typeof mapToDoctorCard>) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setBookDate(tomorrow.toISOString().split("T")[0]);
    setBookTime("10:00");
    setBookType("video");
    setBookNotes("");
    setBookStep(1);
    setPaymentMethod("jazzcash");
    setProofFile(null);
    setError(null);
    setBookingDoctor(doc);
  };

  const handleBookDetails = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBookStep(2);
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDoctor) return;
    setBooking(true);
    setError(null);
    try {
      const scheduledAt = new Date(`${bookDate}T${bookTime}:00`).toISOString();
      const { paymentId } = await bookAppointment({
        doctorProfileId: bookingDoctor.id,
        scheduledAt,
        appointmentType: bookType,
        patientNotes: bookNotes,
        consultationFee: bookingDoctor.consultationFeeRaw,
        paymentMethod,
      });
      if (proofFile) {
        await submitPaymentProof(paymentId, proofFile);
        setBookingDoctor(null);
        router.push("/patient/appointments?booked=pending");
      } else {
        setBookingDoctor(null);
        router.push("/patient/appointments?booked=awaiting");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to book appointment");
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Browse Verified Doctors</h2>
        <p className="text-sm text-muted-foreground">
          Consult online with approved mental health professionals. Appointments sync with your doctor&apos;s dashboard.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by doctor name or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-1.5 h-10">
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {specialties.map((specialty) => (
          <button
            key={specialty}
            onClick={() => setSelectedSpecialty(specialty)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              selectedSpecialty === specialty
                ? "bg-primary border-primary text-primary-foreground"
                : "bg-card border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {specialty}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filteredDoctors.length > 0 ? (
          filteredDoctors.map((doc) => (
            <Card key={doc.id} className="flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    name={doc.name}
                    avatarUrl={doc.avatarUrl}
                    size="md"
                    className="h-14 w-14 text-lg"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-base leading-none">{doc.name}</h3>
                      <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-500/10 shrink-0" />
                    </div>
                    <p className="text-xs text-primary font-medium mt-1">{doc.specialization}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{doc.qualification}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3 space-y-3">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  {doc.rating > 0 && (
                    <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                      <Star className="h-3.5 w-3.5 fill-amber-500" />
                      {doc.rating.toFixed(1)}
                    </span>
                  )}
                  <span>({doc.reviewsCount} reviews)</span>
                  <span>•</span>
                  <span>{doc.experience}</span>
                </div>
                <div className="flex flex-col gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{doc.city}, Pakistan</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                    <span>PMDC ID: {doc.pmdcNumber}</span>
                  </div>
                  {doc.isAvailableToday && (
                    <span className="text-green-600 font-medium">Available for bookings</span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t border-border pt-4 bg-muted/10">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Fee</p>
                  <p className="font-bold text-sm">{doc.consultationFee}</p>
                </div>
                <Button
                  size="sm"
                  className="bg-primary hover:bg-primary/90 font-semibold px-4"
                  onClick={() => openBooking(doc)}
                >
                  Book Slot
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-16 text-center border border-dashed rounded-xl">
            <h4 className="font-semibold">No doctors found</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {doctors.length === 0
                ? "No approved doctors on the platform yet."
                : "Try adjusting your search or specialty filter."}
            </p>
          </div>
        )}
      </div>

      {bookingDoctor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-card z-10">
              <div>
                <h3 className="text-lg font-bold">
                  {bookStep === 1 ? "Book Appointment" : "Pay to Confirm"}
                </h3>
                <p className="text-xs text-muted-foreground">{bookingDoctor.name}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setBookingDoctor(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {bookStep === 1 ? (
              <form className="p-6 space-y-4" onSubmit={handleBookDetails}>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={bookDate}
                      onChange={(e) => setBookDate(e.target.value)}
                      className="w-full h-10 pl-9 pr-4 rounded-lg border border-border text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Time</label>
                  <input
                    type="time"
                    required
                    value={bookTime}
                    onChange={(e) => setBookTime(e.target.value)}
                    className="w-full h-10 px-4 rounded-lg border border-border text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Consultation Type</label>
                  <select
                    value={bookType}
                    onChange={(e) => setBookType(e.target.value as AppointmentType)}
                    className="w-full h-10 px-4 rounded-lg border border-border text-sm"
                  >
                    <option value="video">Video</option>
                    <option value="chat">Chat</option>
                    <option value="in_person">In-Person</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Reason / Notes</label>
                  <textarea
                    rows={3}
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    placeholder="Briefly describe your concern..."
                    className="w-full px-3 py-2 rounded-lg border border-border text-sm"
                  />
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
                  <CreditCard className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Consultation fee: <strong>{bookingDoctor.consultationFee}</strong>. You must pay this amount and upload a screenshot on the next step. Admin will verify payment before confirming your booking.
                  </span>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setBookingDoctor(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1 bg-brand-500 hover:bg-brand-600 text-white">
                    Continue to Payment
                  </Button>
                </div>
              </form>
            ) : (
              <form className="p-6 space-y-4" onSubmit={handleBookSubmit}>
                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-brand-50 border border-brand-100 text-xs text-blue-900">
                  <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Pay <strong>{bookingDoctor.consultationFee}</strong> to the admin account below. Upload your payment screenshot now, or add it later from My Appointments. Your booking is confirmed after admin approval.
                  </span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as BookablePaymentMethod)}
                    className="w-full h-10 px-4 rounded-lg border border-border text-sm"
                  >
                    {BOOKING_PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {PLATFORM_PAYMENT_ACCOUNTS[method].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-2 text-sm">
                  <p className="font-semibold">{PLATFORM_PAYMENT_ACCOUNTS[paymentMethod].accountTitle}</p>
                  <p className="font-mono text-base">{PLATFORM_PAYMENT_ACCOUNTS[paymentMethod].accountNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {PLATFORM_PAYMENT_ACCOUNTS[paymentMethod].instructions}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                    Payment Screenshot <span className="text-muted-foreground font-normal">(optional — add later from Appointments)</span>
                  </label>
                  <PaymentProofUpload onFileSelect={setProofFile} disabled={booking} />
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setBookStep(1); setProofFile(null); }}
                      disabled={booking}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-brand-500 hover:bg-brand-600 text-white"
                      disabled={booking}
                    >
                      {booking
                        ? "Booking..."
                        : proofFile
                          ? "Submit & Request Confirmation"
                          : "Book & Upload Later"}
                    </Button>
                  </div>
                  {!proofFile && (
                    <p className="text-[11px] text-center text-muted-foreground">
                      You can open this appointment anytime and add your payment screenshot for confirmation.
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
