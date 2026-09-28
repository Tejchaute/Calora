"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Clock,
  Scissors,
  UserCog,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  createPublicBooking,
  getBookedSlotsForDate,
  getPublicBookingContext,
  type PublicBookingContext,
} from "../services/booking.service";
import {
  formatCurrency,
  formatTime,
  getInitials,
  generateTimeSlots,
  addMinutes,
} from "@/lib/utils";
import { format, parseISO, isSameDay } from "date-fns";
import { toast } from "sonner";
import { getAppointmentAvailabilityMessage } from "../services/appointments.service";
import {
  doAppointmentTimeRangesOverlap,
  getPublicBookingDateRange,
  isSlotAtOrAfterMinimumNotice,
  isSlotWithinWorkingHours,
} from "../utils/public-booking-availability";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type Step =
  "service" | "staff" | "datetime" | "details" | "confirm" | "success";

type BookingPageProps = {
  slug: string;
};

type PublicService = PublicBookingContext["services"][number];
type PublicStaff = PublicBookingContext["staff"][number];
type LoadState = "loading" | "ready" | "unavailable" | "error";

export function BookingPage({ slug }: BookingPageProps) {
  const [business, setBusiness] = useState<{
    id: string;
    name: string;
    slug: string;
  } | null>(null);
  const [step, setStep] = useState<Step>("service");
  const [services, setServices] = useState<PublicService[]>([]);
  const [staff, setStaff] = useState<PublicStaff[]>([]);
  const [staffServices, setStaffServices] = useState<
    { staff_id: string; service_id: string }[]
  >([]);
  const [businessSettings, setBusinessSettings] = useState<
    PublicBookingContext["business_settings"] | null
  >(null);
  const [bookingSettings, setBookingSettings] = useState<
    PublicBookingContext["booking_settings"] | null
  >(null);
  const [workingHours, setWorkingHours] = useState<
    PublicBookingContext["working_hours"]
  >([]);
  const [holidays, setHolidays] = useState<PublicBookingContext["holidays"]>(
    [],
  );
  const [minimumBookingDate, setMinimumBookingDate] = useState("");
  const [minimumBookingTime, setMinimumBookingTime] = useState("");
  const [businessDate, setBusinessDate] = useState("");
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [slotsError, setSlotsError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const dateRailRef = useRef<HTMLDivElement>(null);
  const selectedDateButtonRef = useRef<HTMLButtonElement>(null);
  const reduceMotion = useReducedMotion();

  // Selections
  const [selectedService, setSelectedService] = useState<PublicService | null>(
    null,
  );
  const [selectedStaff, setSelectedStaff] = useState<
    PublicStaff | "any" | null
  >(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Customer details
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  const [confirmedStaff, setConfirmedStaff] = useState<PublicStaff | null>(
    null,
  );

  // Booked slots
  const [bookedAppointments, setBookedAppointments] = useState<
    {
      start_time: string;
      end_time: string;
      staff_id: string | null;
    }[]
  >([]);
  const slotsRequestIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const loadPublicBooking = async () => {
      setLoadState("loading");
      const { data, error } = await getPublicBookingContext(slug);

      if (cancelled) return;

      if (error) {
        setLoadState("error");
        return;
      }

      if (!data) {
        setLoadState("unavailable");
        return;
      }

      const context = data as unknown as PublicBookingContext;
      setBusiness(context.business);
      setServices(context.services);
      setStaff(context.staff);
      setStaffServices(context.staff_services);
      setBusinessSettings(context.business_settings);
      setBookingSettings(context.booking_settings);
      setWorkingHours(context.working_hours);
      setHolidays(context.holidays);
      setMinimumBookingDate(context.minimum_booking_date);
      setMinimumBookingTime(context.minimum_booking_time);
      setBusinessDate(context.business_date);
      setLoadState("ready");
    };

    loadPublicBooking();

    return () => {
      cancelled = true;
    };
  }, [slug, loadAttempt]);

  // Fetch booked slots when date or staff changes
  useEffect(() => {
    if (!selectedDate) return;
    fetchBookedSlots();
  }, [selectedDate, selectedStaff]);

  const fetchBookedSlots = async () => {
    if (!selectedDate) return;
    const requestId = ++slotsRequestIdRef.current;

    const staffId =
      selectedStaff && selectedStaff !== "any" ? selectedStaff.id : null;

    setSlotsError(false);
    const { data, error } = await getBookedSlotsForDate(
      slug,
      selectedDate,
      staffId,
    );

    if (requestId !== slotsRequestIdRef.current) return;

    if (error) {
      setBookedAppointments([]);
      setSlotsError(true);
      return;
    }

    const availability = data as unknown as {
      minimum_booking_date: string;
      minimum_booking_time: string;
      slots: Array<{
        start_time: string;
        end_time: string;
        staff_id: string | null;
      }>;
    };

    setMinimumBookingDate(availability.minimum_booking_date);
    setMinimumBookingTime(availability.minimum_booking_time);
    setBookedAppointments(availability.slots || []);
  };

  const getEligibleStaffForService = (
    service: PublicService | null = selectedService,
  ): PublicStaff[] => {
    if (!service) return [];

    const eligibleStaffIds = new Set(
      staffServices
        .filter((assignment) => assignment.service_id === service.id)
        .map((assignment) => assignment.staff_id),
    );

    return staff.filter((member) => eligibleStaffIds.has(member.id));
  };

  const eligibleStaff = getEligibleStaffForService();

  const getAvailableSlots = (): string[] => {
    if (!selectedDate || !selectedService || slotsError) return [];

    const dayOfWeek = selectedDate.getDay();

    const isHoliday = holidays.some((h) =>
      isSameDay(parseISO(h.date), selectedDate),
    );

    if (isHoliday) return [];

    const selectedStaffId =
      selectedStaff && selectedStaff !== "any" ? selectedStaff.id : null;

    const dayHours =
      workingHours.find(
        (h) => h.staff_id === selectedStaffId && h.day_of_week === dayOfWeek,
      ) ||
      workingHours.find(
        (h) => h.staff_id === null && h.day_of_week === dayOfWeek,
      );

    if (!dayHours || !dayHours.is_open) return [];

    const slots = generateTimeSlots(
      dayHours.open_time || "09:00",
      dayHours.close_time || "17:00",
      selectedService.duration,
      dayHours.break_start,
      dayHours.break_end,
    );

    return slots.filter((slot) => {
      const slotEnd = addMinutes(slot, selectedService.duration);

      if (
        !isSlotAtOrAfterMinimumNotice({
          appointmentDate: selectedDate,
          startTime: slot,
          minimumBookingDate,
          minimumBookingTime,
        })
      ) {
        return false;
      }

      // Never show an already-booked slot for a specific staff member.
      if (selectedStaff && selectedStaff !== "any") {
        const buffer = bookingSettings?.buffer_time_minutes || 0;
        const isBooked = bookedAppointments.some(
          (appointment) =>
            appointment.staff_id === selectedStaff.id &&
            doAppointmentTimeRangesOverlap({
              candidateStart: slot,
              candidateEnd: slotEnd,
              existingStart: appointment.start_time,
              existingEnd: appointment.end_time,
              bufferMinutes: buffer,
            }),
        );

        if (isBooked) {
          return false;
        }
      }

      // For "Any staff", at least one active staff member
      // must be available for the entire appointment.
      if (selectedStaff === "any") {
        const hasAvailableStaff = getEligibleStaffForService().some(
          (member) => {
            const memberHours =
              workingHours.find(
                (h) => h.staff_id === member.id && h.day_of_week === dayOfWeek,
              ) ||
              workingHours.find(
                (h) => h.staff_id === null && h.day_of_week === dayOfWeek,
              );

            if (!memberHours || !memberHours.is_open) {
              return false;
            }

            if (!isSlotWithinWorkingHours({
              slotStart: slot,
              slotEnd,
              openTime: memberHours.open_time,
              closeTime: memberHours.close_time,
              breakStart: memberHours.break_start,
              breakEnd: memberHours.break_end,
            })) {
              return false;
            }

            const buffer = bookingSettings?.buffer_time_minutes || 0;
            const isBooked = bookedAppointments.some(
              (appointment) =>
                appointment.staff_id === member.id &&
                doAppointmentTimeRangesOverlap({
                  candidateStart: slot,
                  candidateEnd: slotEnd,
                  existingStart: appointment.start_time,
                  existingEnd: appointment.end_time,
                  bufferMinutes: buffer,
                }),
            );

            return !isBooked;
          },
        );

        if (!hasAvailableStaff) {
          return false;
        }
      }

      return true;
    });
  };

  const availableSlots = getAvailableSlots();

  const handleConfirm = async () => {
    if (
      !selectedService ||
      !selectedDate ||
      !selectedTime ||
      !customerName.trim() ||
      (!customerPhone.trim() && !customerEmail.trim())
    ) {
      toast.error("Please complete all required fields");
      return;
    }
    setSubmitting(true);

    if (!business) {
      toast.error("Business information is not available.");
      setSubmitting(false);
      return;
    }

    const endTime = addMinutes(selectedTime, selectedService.duration);

    const requestedStaffId =
      selectedStaff === "any" ? null : selectedStaff?.id || null;
    const { data, error } = await createPublicBooking({
      bookingSlug: slug,
      customerName,
      customerPhone,
      customerEmail,
      serviceId: selectedService.id,
      staffId: requestedStaffId,
      appointmentDate: format(selectedDate, "yyyy-MM-dd"),
      startTime: selectedTime,
      endTime,
      notes,
    });

    if (error) {
      toast.error(
        getAppointmentAvailabilityMessage(error) ||
          "This time is no longer available.",
      );

      setSubmitting(false);
      await fetchBookedSlots();
      return;
    }

    const result = data as { staff_id?: string } | null;
    setConfirmedStaff(
      staff.find((member) => member.id === result?.staff_id) || null,
    );
    toast.success("Appointment booked successfully!");
    setSubmitting(false);
    setStep("success");
  };

  const resetBooking = () => {
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedDate(null);
    setSelectedTime("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setNotes("");
    setBookedAppointments([]);
    setStep("service");
    setConfirmedStaff(null);
  };

  const steps: { key: Step; label: string }[] = [
    { key: "service", label: "Service" },
    { key: "staff", label: "Staff" },
    { key: "datetime", label: "Date & Time" },
    { key: "details", label: "Your Details" },
    { key: "confirm", label: "Confirm" },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const canGoBack = step !== "service" && step !== "success";
  const canGoNext =
    (step === "service" && !!selectedService) ||
    (step === "staff" && !!selectedStaff) ||
    (step === "datetime" && !!selectedDate && !!selectedTime) ||
    (step === "details" &&
      !!customerName.trim() &&
      (!!customerPhone.trim() || !!customerEmail.trim())) ||
    step === "confirm";

  const handleNext = () => {
    if (step === "service") setStep("staff");
    else if (step === "staff") setStep("datetime");
    else if (step === "datetime") setStep("details");
    else if (step === "details") setStep("confirm");
    else if (step === "confirm") handleConfirm();
  };

  const handleBack = () => {
    if (step === "staff") setStep("service");
    else if (step === "datetime") setStep("staff");
    else if (step === "details") setStep("datetime");
    else if (step === "confirm") setStep("details");
  };

  useEffect(() => {
    if (step !== "success") {
      stepHeadingRef.current?.focus({ preventScroll: true });
    }
  }, [step]);

  const dateOptions =
    businessDate && bookingSettings
      ? getPublicBookingDateRange(
          businessDate,
          bookingSettings.max_advance_days,
        )
      : [];

  useEffect(() => {
    const rail = dateRailRef.current;
    const selectedButton = selectedDateButtonRef.current;

    if (!rail || !selectedButton) return;

    const targetLeft =
      selectedButton.offsetLeft -
      rail.clientWidth / 2 +
      selectedButton.clientWidth / 2;

    rail.scrollTo({
      left: Math.max(0, targetLeft),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [selectedDate, reduceMotion]);

  const businessName =
    businessSettings?.business_name || business?.name || "Calora";
  const currency = businessSettings?.currency || "USD";
  const selectedStaffName =
    selectedStaff === "any" ? "Any available staff" : selectedStaff?.full_name;
  const stepTitle = steps[currentStepIndex]?.label || "Booking";
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const };

  const appointmentSummary = (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Your appointment
        </p>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
          {selectedService?.name || "Start with a service"}
        </h2>
        {selectedService && (
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {selectedService.duration} min
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatCurrency(selectedService.price, currency)}
            </span>
          </div>
        )}
      </div>
      <div className="h-px bg-border" />
      <dl className="space-y-4 text-sm">
        <SummaryRow label="Staff" value={selectedStaffName || "Not selected"} />
        <SummaryRow
          label="Date"
          value={
            selectedDate ? format(selectedDate, "EEE, MMM d") : "Not selected"
          }
        />
        <SummaryRow
          label="Time"
          value={selectedTime ? formatTime(selectedTime) : "Not selected"}
          tabular
        />
      </dl>
      {businessSettings?.timezone && (
        <p className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
          Times are shown in {businessSettings.timezone}.
        </p>
      )}
    </div>
  );

  if (loadState === "loading") {
    return (
      <div
        className="min-h-screen bg-background"
        aria-busy="true"
        aria-label="Loading booking page"
      >
        <div className="border-b border-border">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <Skeleton className="h-9 w-44 rounded-lg" />
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-11 w-full max-w-xl" />
          <Skeleton className="mt-3 h-6 w-full max-w-lg" />
          <Skeleton className="mt-10 h-2 w-full max-w-3xl rounded-full" />
          <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Skeleton className="h-[430px] rounded-2xl" />
            <Skeleton className="hidden h-72 rounded-2xl lg:block" />
          </div>
        </div>
      </div>
    );
  }

  if (loadState === "unavailable" || loadState === "error") {
    const unavailable = loadState === "unavailable";

    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-border bg-background p-7 text-center shadow-elevation-2 sm:p-9">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Calendar
              className="h-6 w-6 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Booking page unavailable
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {unavailable
              ? "This booking page is not currently available. Please check the link or contact the business directly."
              : "We could not load this booking page. Please try again in a moment."}
          </p>
          <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
            {!unavailable && (
              <Button onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
                Try again
              </Button>
            )}
            <Button asChild variant={unavailable ? "default" : "outline"}>
              <Link href="/">Back to Calora</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-muted/40">
        <header className="border-b border-border bg-background">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar className="h-9 w-9 rounded-lg border border-border">
                {businessSettings?.logo_url && (
                  <AvatarImage
                    src={businessSettings.logo_url}
                    alt=""
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                  {getInitials(businessName)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-semibold text-foreground">
                {businessName}
              </span>
            </div>
          </div>
        </header>
        <main className="mx-auto flex max-w-2xl items-center px-4 py-12 sm:px-6 sm:py-20">
          <motion.section
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
            className="w-full rounded-2xl border border-border bg-background p-6 shadow-elevation-2 sm:p-10"
            aria-labelledby="booking-success-title"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
              <motion.div
                initial={reduceMotion ? false : { scale: 0.75, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.25, delay: 0.08 }
                }
              >
                <Check className="h-7 w-7 text-success" aria-hidden="true" />
              </motion.div>
            </div>
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-success">
              Booking confirmed
            </p>
            <h1
              id="booking-success-title"
              className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
            >
              You&apos;re booked.
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Your appointment with {businessName} is confirmed.
            </p>
            <div className="mt-8 border-y border-border py-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {selectedService?.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selectedService?.duration} minutes
                    {confirmedStaff?.full_name
                      ? ` · ${confirmedStaff.full_name}`
                      : ""}
                  </p>
                </div>
                <p className="text-lg font-semibold tabular-nums text-foreground">
                  {formatCurrency(selectedService?.price || 0, currency)}
                </p>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Date
                  </p>
                  <p className="mt-1 font-medium text-foreground">
                    {selectedDate ? format(selectedDate, "EEEE, MMMM d") : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Time
                  </p>
                  <p className="mt-1 font-medium tabular-nums text-foreground">
                    {formatTime(selectedTime)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={resetBooking}
                variant="outline"
                className="flex-1"
              >
                Book another
              </Button>
              <Button asChild className="flex-1">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </motion.section>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="h-9 w-9 rounded-lg border border-border">
              {businessSettings?.logo_url && (
                <AvatarImage
                  src={businessSettings.logo_url}
                  alt=""
                  className="object-cover"
                />
              )}
              <AvatarFallback className="rounded-lg bg-primary/10 text-xs font-semibold text-primary">
                {getInitials(businessName)}
              </AvatarFallback>
            </Avatar>
            <span className="truncate font-semibold text-foreground">
              {businessName}
            </span>
          </div>
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Back to site</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 sm:py-12 lg:px-8">
        <section className="max-w-3xl" aria-labelledby="booking-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Online booking
          </p>
          <h1
            id="booking-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl"
          >
            Book with {businessName}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Choose a service and a convenient time. We&apos;ll guide you through
            the rest.
          </p>
        </section>
        <nav className="mt-9" aria-label="Booking progress">
          <div className="sm:hidden">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">
                  Step {currentStepIndex + 1} of {steps.length}
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {stepTitle}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums text-primary">
                {Math.round(((currentStepIndex + 1) / steps.length) * 100)}%
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{
                  width: `${((currentStepIndex + 1) / steps.length) * 100}%`,
                }}
                transition={transition}
              />
            </div>
          </div>
          <ol className="hidden grid-cols-5 sm:grid">
            {steps.map((item, index) => {
              const complete = index < currentStepIndex;
              const current = index === currentStepIndex;
              return (
                <li
                  key={item.key}
                  className="relative pr-4 last:pr-0"
                  aria-current={current ? "step" : undefined}
                >
                  <div className="mb-4 flex items-center">
                    <span
                      className={cn(
                        "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                        complete || current
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {complete ? (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    {index < steps.length - 1 && (
                      <span
                        className="mx-3 h-px flex-1 bg-border"
                        aria-hidden="true"
                      >
                        {complete && (
                          <span className="block h-full w-full bg-primary" />
                        )}
                      </span>
                    )}
                  </div>
                  <p
                    className={cn(
                      "text-sm",
                      current
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </p>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="mt-8 min-w-0 max-w-full lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10 xl:gap-14">
          <Collapsible
            open={summaryOpen}
            onOpenChange={setSummaryOpen}
            className="mb-5 lg:hidden"
          >
            <div className="rounded-xl border border-border bg-muted/30">
              <CollapsibleTrigger asChild>
                <button className="flex min-h-12 w-full items-center justify-between gap-4 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="min-w-0">
                    <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Your appointment
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-semibold text-foreground">
                      {selectedService?.name || "Nothing selected yet"}
                    </span>
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      summaryOpen && "rotate-180",
                    )}
                    aria-hidden="true"
                  />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border-t border-border px-4 py-5">
                  {appointmentSummary}
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>

          <section
            className="min-w-0 max-w-full rounded-2xl border border-border bg-background shadow-elevation-1"
            aria-live="polite"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                initial={reduceMotion ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
                transition={transition}
                className="min-w-0 max-w-full p-5 sm:p-7 lg:p-8"
              >
                {/* Step 1: Service */}
                {step === "service" && (
                  <div>
                    <h2
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="text-2xl font-semibold tracking-tight text-foreground"
                    >
                      Choose a service
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Select the service you&apos;d like to book.
                    </p>
                    <div
                      className="mt-7 space-y-3"
                      role="radiogroup"
                      aria-label="Available services"
                    >
                      {services.length === 0 ? (
                        <div className="rounded-xl bg-muted/40 px-5 py-12 text-center">
                          <Scissors
                            className="mx-auto h-8 w-8 text-muted-foreground/60"
                            aria-hidden="true"
                          />
                          <h3 className="mt-4 font-semibold text-foreground">
                            No services available
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            This business is not accepting online bookings right
                            now.
                          </p>
                        </div>
                      ) : (
                        services.map((s) => (
                          <motion.button
                            layout
                            type="button"
                            role="radio"
                            aria-checked={selectedService?.id === s.id}
                            key={s.id}
                            onClick={() => {
                              setSelectedService(s);
                              setSelectedStaff(null);
                              setSelectedDate(null);
                              setSelectedTime("");
                              setBookedAppointments([]);
                            }}
                            whileHover={reduceMotion ? undefined : { y: -1 }}
                            whileTap={
                              reduceMotion ? undefined : { scale: 0.995 }
                            }
                            className={`flex min-h-24 w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5 ${
                              selectedService?.id === s.id
                                ? "border-primary bg-primary/5"
                                : "border-border bg-background hover:border-primary/40 hover:bg-muted/20"
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-4">
                                <h3 className="font-semibold text-foreground">
                                  {s.name}
                                </h3>
                                <span className="shrink-0 font-semibold tabular-nums text-foreground">
                                  {formatCurrency(s.price, currency)}
                                </span>
                              </div>
                              {s.description && (
                                <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                                  {s.description}
                                </p>
                              )}
                              <div className="mt-3 flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                  {s.duration} min
                                </span>
                              </div>
                            </div>
                            <span
                              className={cn(
                                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                                selectedService?.id === s.id
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background",
                              )}
                            >
                              {selectedService?.id === s.id && (
                                <Check
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              )}
                            </span>
                          </motion.button>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Step 2: Staff */}
                {step === "staff" && (
                  <div>
                    <h2
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="text-2xl font-semibold tracking-tight text-foreground"
                    >
                      Choose who you&apos;ll see
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Choose a team member, or let us match you with anyone
                      available.
                    </p>
                    <div
                      className="mt-7 space-y-3"
                      role="radiogroup"
                      aria-label="Available staff"
                    >
                      {eligibleStaff.length === 0 && (
                        <div className="rounded-xl bg-muted/40 px-5 py-12 text-center">
                          <UserCog
                            className="mx-auto h-8 w-8 text-muted-foreground/60"
                            aria-hidden="true"
                          />
                          <h3 className="mt-4 font-semibold text-foreground">
                            No staff available
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            No team members are currently available for this
                            service.
                          </p>
                        </div>
                      )}
                      {eligibleStaff.length > 0 && (
                        <motion.button
                          layout
                          type="button"
                          role="radio"
                          aria-checked={selectedStaff === "any"}
                          onClick={() => {
                            setSelectedStaff("any");
                            setSelectedDate(null);
                            setSelectedTime("");
                          }}
                          whileHover={reduceMotion ? undefined : { y: -1 }}
                          className={`flex min-h-20 w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5 ${
                            selectedStaff === "any"
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background hover:border-primary/40 hover:bg-muted/20"
                          }`}
                        >
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                            <Sparkles
                              className="h-5 w-5 text-primary"
                              aria-hidden="true"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground">
                              Any available staff
                            </div>
                            <div className="text-sm text-muted-foreground">
                              The best availability across qualified team
                              members
                            </div>
                          </div>
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                              selectedStaff === "any"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border",
                            )}
                          >
                            {selectedStaff === "any" && (
                              <Check
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              />
                            )}
                          </span>
                        </motion.button>
                      )}
                      {eligibleStaff.map((s) => (
                        <motion.button
                          layout
                          type="button"
                          role="radio"
                          aria-checked={
                            selectedStaff !== "any" &&
                            selectedStaff?.id === s.id
                          }
                          key={s.id}
                          onClick={() => {
                            setSelectedStaff(s);
                            setSelectedDate(null);
                            setSelectedTime("");
                          }}
                          whileHover={reduceMotion ? undefined : { y: -1 }}
                          className={`flex min-h-20 w-full items-center gap-4 rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5 ${
                            selectedStaff !== "any" &&
                            selectedStaff?.id === s.id
                              ? "border-primary bg-primary/5"
                              : "border-border bg-background hover:border-primary/40 hover:bg-muted/20"
                          }`}
                        >
                          <Avatar className="h-11 w-11">
                            <AvatarFallback className="bg-muted text-sm font-semibold text-foreground">
                              {getInitials(s.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground">
                              {s.full_name}
                            </div>
                            <div className="mt-0.5 truncate text-sm text-muted-foreground">
                              {s.bio || "Available for this service"}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                              selectedStaff !== "any" &&
                                selectedStaff?.id === s.id
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border",
                            )}
                          >
                            {selectedStaff !== "any" &&
                              selectedStaff?.id === s.id && (
                                <Check
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              )}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Date & Time */}
                {step === "datetime" && (
                  <div>
                    <h2
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="text-2xl font-semibold tracking-tight text-foreground"
                    >
                      Choose a date and time
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Availability is kept current for your selected service and
                      staff.
                    </p>

                    {/* Date selector */}
                    <fieldset className="mt-7 min-w-0 max-w-full">
                      <legend className="text-sm font-semibold text-foreground">
                        Choose a date
                      </legend>
                      <div
                        ref={dateRailRef}
                        className="mt-3 flex w-full max-w-full gap-2 overflow-x-auto overscroll-x-contain px-0.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                        aria-label="Available booking dates"
                      >
                        {dateOptions.map((date) => {
                          const dayOfWeek = date.getDay();
                          const staffFilter =
                            selectedStaff === "any"
                              ? null
                              : selectedStaff?.id || null;
                          const dayHours =
                            workingHours.find(
                              (h) =>
                                h.staff_id === staffFilter &&
                                h.day_of_week === dayOfWeek,
                            ) ||
                            workingHours.find(
                              (h) =>
                                h.staff_id === null &&
                                h.day_of_week === dayOfWeek,
                            );
                          const isHoliday = holidays.some((h) =>
                            isSameDay(parseISO(h.date), date),
                          );
                          const isClosed = !dayHours?.is_open || isHoliday;
                          const isSelected =
                            selectedDate && isSameDay(date, selectedDate);

                          return (
                            <button
                              type="button"
                              ref={
                                isSelected ? selectedDateButtonRef : undefined
                              }
                              key={date.toISOString()}
                              aria-pressed={!!isSelected}
                              aria-label={`${format(date, "EEEE, MMMM d")}${isClosed ? ", unavailable" : ""}`}
                              onClick={() => {
                                if (!isClosed) {
                                  setSelectedDate(date);
                                  setSelectedTime("");
                                }
                              }}
                              disabled={isClosed}
                              className={`flex min-h-[78px] w-20 flex-shrink-0 flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                isSelected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : isClosed
                                    ? "cursor-not-allowed border-border bg-muted/30 text-muted-foreground opacity-45"
                                    : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"
                              }`}
                            >
                              <span
                                className={cn(
                                  "text-[11px] font-semibold uppercase tracking-wide",
                                  isSelected
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground",
                                )}
                              >
                                {format(date, "EEE")}
                              </span>
                              <span className="mt-1 text-xl font-semibold tabular-nums">
                                {format(date, "d")}
                              </span>
                              <span
                                className={cn(
                                  "text-[11px]",
                                  isSelected
                                    ? "text-primary-foreground/80"
                                    : "text-muted-foreground",
                                )}
                              >
                                {format(date, "MMM")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    {/* Time slots */}
                    {selectedDate && (
                      <div className="mt-7 min-w-0 max-w-full border-t border-border pt-7">
                        <h3 className="text-sm font-semibold text-foreground">
                          Available times for{" "}
                          {format(selectedDate, "EEEE, MMM d")}
                        </h3>
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={selectedDate.toISOString()}
                            initial={
                              reduceMotion ? false : { opacity: 0, y: 5 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            exit={
                              reduceMotion
                                ? { opacity: 1 }
                                : { opacity: 0, y: -5 }
                            }
                            transition={transition}
                            className="min-w-0 max-w-full"
                          >
                            {slotsError ? (
                              <div className="mt-4 rounded-xl border border-border bg-muted/30 p-6 text-center">
                                <Clock
                                  className="mx-auto h-8 w-8 text-muted-foreground/50"
                                  aria-hidden="true"
                                />
                                <p className="mt-2 text-sm text-muted-foreground">
                                  We could not check availability for this date.
                                </p>
                                <Button
                                  className="mt-4"
                                  variant="outline"
                                  size="sm"
                                  onClick={fetchBookedSlots}
                                >
                                  Try again
                                </Button>
                              </div>
                            ) : availableSlots.length === 0 ? (
                              <div className="mt-4 rounded-xl bg-muted/35 p-6 text-center">
                                <Clock className="mx-auto h-8 w-8 text-muted-foreground/50" />
                                <p className="mt-2 text-sm text-muted-foreground">
                                  No available time slots for this day. Please
                                  choose another date.
                                </p>
                              </div>
                            ) : (
                              <div
                                className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4"
                                role="radiogroup"
                                aria-label="Available appointment times"
                              >
                                {availableSlots.map((slot) => (
                                  <button
                                    type="button"
                                    role="radio"
                                    aria-checked={selectedTime === slot}
                                    key={slot}
                                    onClick={() => setSelectedTime(slot)}
                                    className={`min-h-11 rounded-lg border px-3 py-2.5 text-sm font-semibold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                      selectedTime === slot
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-primary/5"
                                    }`}
                                  >
                                    {formatTime(slot)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 4: Details */}
                {step === "details" && (
                  <div>
                    <h2
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="text-2xl font-semibold tracking-tight text-foreground"
                    >
                      Your details
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      We&apos;ll use these details to confirm your appointment.
                    </p>
                    <div className="mt-7 space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="booking-name">
                          Full name <span aria-hidden="true">*</span>
                        </Label>
                        <Input
                          id="booking-name"
                          autoComplete="name"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          placeholder="Your full name"
                          className="h-11"
                          required
                        />
                      </div>
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="booking-email">Email</Label>
                          <Input
                            id="booking-email"
                            type="email"
                            inputMode="email"
                            autoComplete="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="you@example.com"
                            className="h-11"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="booking-phone">Phone</Label>
                          <Input
                            id="booking-phone"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="+1 234 567 890"
                            className="h-11"
                          />
                        </div>
                      </div>
                      <p className="-mt-2 text-xs leading-5 text-muted-foreground">
                        Add at least one way for the business to contact you:
                        email or phone.
                      </p>
                      <div className="space-y-2">
                        <Label htmlFor="booking-notes">
                          Notes{" "}
                          <span className="font-normal text-muted-foreground">
                            (optional)
                          </span>
                        </Label>
                        <Textarea
                          id="booking-notes"
                          rows={4}
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Anything helpful for your appointment"
                        />
                      </div>
                      <div className="flex items-start gap-2.5 rounded-xl bg-muted/35 p-4 text-xs leading-5 text-muted-foreground">
                        <ShieldCheck
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                        Your details are shared only with {businessName} for
                        this booking.
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 5: Confirm */}
                {step === "confirm" && (
                  <div>
                    <h2
                      ref={stepHeadingRef}
                      tabIndex={-1}
                      className="text-2xl font-semibold tracking-tight text-foreground"
                    >
                      Review your appointment
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Make sure everything looks right before you book.
                    </p>
                    <div className="mt-7">
                      <div className="flex flex-col gap-5 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">
                            {selectedService?.name}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedService?.duration} minutes
                          </p>
                        </div>
                        <p className="text-lg font-semibold tabular-nums text-foreground">
                          {formatCurrency(
                            selectedService?.price || 0,
                            currency,
                          )}
                        </p>
                      </div>
                      <dl className="grid gap-6 py-6 sm:grid-cols-2">
                        <SummaryRow
                          label="Date"
                          value={
                            selectedDate
                              ? format(selectedDate, "EEEE, MMMM d")
                              : ""
                          }
                        />
                        <SummaryRow
                          label="Time"
                          value={formatTime(selectedTime)}
                          tabular
                        />
                        <SummaryRow
                          label="Staff"
                          value={selectedStaffName || ""}
                        />
                        <SummaryRow label="Customer" value={customerName} />
                        {customerEmail && (
                          <SummaryRow label="Email" value={customerEmail} />
                        )}
                        {customerPhone && (
                          <SummaryRow label="Phone" value={customerPhone} />
                        )}
                      </dl>
                      {notes && (
                        <div className="border-t border-border pt-5">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Notes
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                            {notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    disabled={!canGoBack}
                    className="px-2 sm:px-4"
                  >
                    <ChevronLeft
                      className="mr-1.5 h-4 w-4"
                      aria-hidden="true"
                    />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    disabled={!canGoNext || submitting}
                    className="min-w-[132px]"
                    aria-busy={submitting}
                  >
                    {step === "confirm" ? (
                      submitting ? (
                        <>
                          <Loader2
                            className="mr-2 h-4 w-4 animate-spin"
                            aria-hidden="true"
                          />
                          Booking...
                        </>
                      ) : (
                        "Confirm booking"
                      )
                    ) : (
                      <>
                        Continue
                        <ChevronRight
                          className="ml-1.5 h-4 w-4"
                          aria-hidden="true"
                        />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
          </section>
          <aside
            className="sticky top-8 hidden rounded-2xl border border-border bg-muted/25 p-6 lg:block"
            aria-label="Appointment summary"
          >
            {appointmentSummary}
          </aside>
        </div>
      </main>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tabular = false,
}: {
  label: string;
  value: string;
  tabular?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "max-w-[65%] break-words text-right font-medium text-foreground",
          tabular && "tabular-nums",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
