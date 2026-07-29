'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Check,
  ChevronRight,
  ChevronLeft,
  Clock,
  User,
  Mail,
  Phone,
  Scissors,
  UserCog,
  CalendarIcon,
  PartyPopper,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getBookingInitialData, getBookedSlotsForDate, findOrCreateCustomer, createBooking } from '../services/booking.service';
import { formatCurrency, formatTime, getInitials, generateTimeSlots, addMinutes, getDayName } from '@/lib/utils';
import type { Service, Staff, BusinessSettings, WorkingHours, Holiday, Appointment } from '@/types/database';
import { format, addDays, isToday, isTomorrow, isPast, parseISO, startOfDay, isSameDay } from 'date-fns';
import { toast } from 'sonner';

type Step = 'service' | 'staff' | 'datetime' | 'details' | 'confirm' | 'success';

export function BookingPage() {
  const [step, setStep] = useState<Step>('service');
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Staff | 'any' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Customer details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Booked slots
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: svc }, { data: stf }, { data: bs }, { data: wh }, { data: hols }] = await getBookingInitialData();
    setServices(svc || []);
    setStaff(stf || []);
    setBusinessSettings(bs);
    setWorkingHours((wh as WorkingHours[]) || []);
    setHolidays((hols as Holiday[]) || []);
    setLoading(false);
  };

  // Fetch booked slots when date or staff changes
  useEffect(() => {
    if (!selectedDate) return;
    fetchBookedSlots();
  }, [selectedDate, selectedStaff]);

  const fetchBookedSlots = async () => {
    if (!selectedDate) return;
    const staffId = selectedStaff && selectedStaff !== 'any' ? (selectedStaff as Staff).id : null;
    const { data } = await getBookedSlotsForDate(selectedDate, staffId);
    setBookedSlots((data?.map((a) => a.start_time) as string[]) || []);
  };

  const getAvailableSlots = (): string[] => {
    if (!selectedDate || !selectedService) return [];
    const dayOfWeek = selectedDate.getDay();
    const staffFilter = selectedStaff === 'any' ? null : (selectedStaff as Staff)?.id;
    const dayHours = workingHours.find((h) => h.staff_id === staffFilter && h.day_of_week === dayOfWeek)
      || workingHours.find((h) => h.staff_id === null && h.day_of_week === dayOfWeek);

    if (!dayHours || !dayHours.is_open) return [];

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const isHoliday = holidays.some((h) => isSameDay(parseISO(h.date), selectedDate));
    if (isHoliday) return [];

    const slots = generateTimeSlots(
      dayHours.open_time,
      dayHours.close_time,
      selectedService.duration,
      dayHours.break_start,
      dayHours.break_end
    );

    // Filter out past slots for today
    const now = new Date();
    return slots.filter((slot) => {
      if (isToday(selectedDate)) {
        const [h, m] = slot.split(':').map(Number);
        const slotDate = new Date(selectedDate);
        slotDate.setHours(h, m, 0, 0);
        return slotDate > now;
      }
      return !bookedSlots.includes(slot);
    });
  };

  const availableSlots = getAvailableSlots();

  const handleConfirm = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !customerName) {
      toast.error('Please complete all required fields');
      return;
    }
    setSubmitting(true);

    // Find or create customer
    const { id: customerId, error: custError } = await findOrCreateCustomer({ full_name: customerName, phone: customerPhone, email: customerEmail });
    if (custError || !customerId) {
      toast.error('Failed to create customer record');
      setSubmitting(false);
      return;
    }

    const endTime = addMinutes(selectedTime, selectedService.duration);
    const appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'> = {
      customer_id: customerId,
      service_id: selectedService.id,
      staff_id: selectedStaff === 'any' ? null : (selectedStaff as Staff).id,
      appointment_date: format(selectedDate, 'yyyy-MM-dd'),
      start_time: selectedTime,
      end_time: endTime,
      status: 'pending',
      notes,
    };

    const { error } = await createBooking(appointment);
    if (error) {
      toast.error('Failed to book appointment');
      setSubmitting(false);
      return;
    }

    toast.success('Appointment booked successfully!');
    setSubmitting(false);
    setStep('success');
  };

  const resetBooking = () => {
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedDate(null);
    setSelectedTime('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setNotes('');
    setStep('service');
  };

  const steps: { key: Step; label: string }[] = [
    { key: 'service', label: 'Service' },
    { key: 'staff', label: 'Staff' },
    { key: 'datetime', label: 'Date & Time' },
    { key: 'details', label: 'Your Details' },
    { key: 'confirm', label: 'Confirm' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);
  const canGoBack = step !== 'service' && step !== 'success';
  const canGoNext =
    (step === 'service' && selectedService) ||
    (step === 'staff' && selectedStaff) ||
    (step === 'datetime' && selectedDate && selectedTime) ||
    (step === 'details' && customerName);

  const handleNext = () => {
    if (step === 'service') setStep('staff');
    else if (step === 'staff') setStep('datetime');
    else if (step === 'datetime') setStep('details');
    else if (step === 'details') setStep('confirm');
    else if (step === 'confirm') handleConfirm();
  };

  const handleBack = () => {
    if (step === 'staff') setStep('service');
    else if (step === 'datetime') setStep('staff');
    else if (step === 'details') setStep('datetime');
    else if (step === 'confirm') setStep('details');
  };

  // Date picker: next 14 days
  const dateOptions = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/50">
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="mt-6 h-2 w-full rounded-full" />
          <Skeleton className="mt-8 h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/15">
              <PartyPopper className="h-8 w-8 text-success" />
            </div>
            <h1 className="mt-6 text-2xl font-bold text-foreground">Booking Confirmed!</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your appointment has been successfully booked. We look forward to seeing you!
            </p>
            <div className="mt-6 rounded-lg bg-muted/50 p-4 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-medium text-foreground">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium text-foreground">
                    {selectedDate ? format(selectedDate, 'EEEE, MMM d') : ''}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium text-foreground">{formatTime(selectedTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Staff</span>
                  <span className="font-medium text-foreground">
                    {selectedStaff === 'any' ? 'Any staff' : (selectedStaff as Staff)?.full_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(selectedService?.price || 0, businessSettings?.currency || 'USD')}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button onClick={resetBooking} variant="outline" className="flex-1">
                Book another
              </Button>
              <Link href="/" className="flex-1">
                <Button className="w-full">Back to home</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Header */}
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-foreground">
              {businessSettings?.business_name || 'Calora'}
            </span>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to site
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center">
                <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  i <= currentStepIndex
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {i < currentStepIndex ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`mx-2 h-0.5 flex-1 ${i < currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between">
            {steps.map((s, i) => (
              <span key={s.key} className={`text-xs ${i === currentStepIndex ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                {s.label}
              </span>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {/* Step 1: Service */}
            {step === 'service' && (
              <div>
                <h2 className="text-lg font-semibold text-foreground">Choose a service</h2>
                <p className="mt-1 text-sm text-muted-foreground">Select the service you'd like to book.</p>
                <div className="mt-6 space-y-3">
                  {services.length === 0 ? (
                    <div className="py-12 text-center">
                      <Scissors className="mx-auto h-10 w-10 text-muted-foreground/50" />
                      <p className="mt-3 text-sm text-muted-foreground">No services available right now.</p>
                    </div>
                  ) : (
                    services.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedService(s)}
                        className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                          selectedService?.id === s.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-muted-foreground/50'
                        }`}
                      >
                        <div
                          className="flex h-12 w-12 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${s.color}15` }}
                        >
                          <Scissors className="h-6 w-6" style={{ color: s.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-foreground">{s.name}</div>
                          {s.description && (
                            <div className="text-sm text-muted-foreground">{s.description}</div>
                          )}
                          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {s.duration} min
                            </span>
                            <span className="font-medium">
                              {formatCurrency(s.price, businessSettings?.currency || 'USD')}
                            </span>
                          </div>
                        </div>
                        {selectedService?.id === s.id && (
                          <Check className="h-5 w-5 text-primary" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Staff */}
            {step === 'staff' && (
              <div>
                <h2 className="text-lg font-semibold text-foreground">Choose staff member</h2>
                <p className="mt-1 text-sm text-muted-foreground">Select who you'd like to see, or choose any available staff.</p>
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => setSelectedStaff('any')}
                    className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                      selectedStaff === 'any'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <UserCog className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground">Any available staff</div>
                      <div className="text-sm text-muted-foreground">Best available time across all staff</div>
                    </div>
                    {selectedStaff === 'any' && <Check className="h-5 w-5 text-primary" />}
                  </button>
                  {staff.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStaff(s)}
                      className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all ${
                        selectedStaff !== 'any' && selectedStaff?.id === s.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/15 text-sm font-semibold text-primary">
                          {getInitials(s.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">{s.full_name}</div>
                        {s.role && <div className="text-sm text-muted-foreground">{s.role}</div>}
                        {s.bio && <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{s.bio}</div>}
                      </div>
                      {selectedStaff !== 'any' && selectedStaff?.id === s.id && <Check className="h-5 w-5 text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Date & Time */}
            {step === 'datetime' && (
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pick a date & time</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose when you'd like your appointment.</p>

                {/* Date selector */}
                <div className="mt-6">
                  <Label className="text-sm font-medium">Select date</Label>
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {dateOptions.map((date) => {
                      const dayOfWeek = date.getDay();
                      const staffFilter = selectedStaff === 'any' ? null : (selectedStaff as Staff)?.id;
                      const dayHours = workingHours.find((h) => h.staff_id === staffFilter && h.day_of_week === dayOfWeek)
                        || workingHours.find((h) => h.staff_id === null && h.day_of_week === dayOfWeek);
                      const isHoliday = holidays.some((h) => isSameDay(parseISO(h.date), date));
                      const isClosed = !dayHours?.is_open || isHoliday;
                      const isSelected = selectedDate && isSameDay(date, selectedDate);

                      return (
                        <button
                          key={date.toISOString()}
                          onClick={() => {
                            if (!isClosed) {
                              setSelectedDate(date);
                              setSelectedTime('');
                            }
                          }}
                          disabled={isClosed}
                          className={`flex w-16 flex-shrink-0 flex-col items-center rounded-xl border-2 p-3 transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : isClosed
                              ? 'border-border bg-muted/50 opacity-50 cursor-not-allowed'
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                        >
                          <span className="text-xs font-medium text-muted-foreground">{format(date, 'EEE')}</span>
                          <span className={`text-lg font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                            {format(date, 'd')}
                          </span>
                          <span className="text-xs text-muted-foreground">{format(date, 'MMM')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time slots */}
                {selectedDate && (
                  <div className="mt-6">
                    <Label className="text-sm font-medium">
                      Available times for {format(selectedDate, 'EEEE, MMM d')}
                    </Label>
                    {availableSlots.length === 0 ? (
                      <div className="mt-3 rounded-lg bg-muted/50 p-6 text-center">
                        <Clock className="mx-auto h-8 w-8 text-muted-foreground/50" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          No available time slots for this day. Please choose another date.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            className={`rounded-lg border-2 py-2.5 text-sm font-medium transition-all ${
                              selectedTime === slot
                                ? 'border-primary bg-primary text-white'
                                : 'border-border text-foreground hover:border-muted-foreground/50'
                            }`}
                          >
                            {formatTime(slot)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Details */}
            {step === 'details' && (
              <div>
                <h2 className="text-lg font-semibold text-foreground">Your details</h2>
                <p className="mt-1 text-sm text-muted-foreground">Enter your contact information so we can confirm the booking.</p>
                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label>Full name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Your full name"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+1 234 567 890"
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          value={customerEmail}
                          onChange={(e) => setCustomerEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any special requests or notes for your appointment..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Confirm */}
            {step === 'confirm' && (
              <div>
                <h2 className="text-lg font-semibold text-foreground">Confirm your booking</h2>
                <p className="mt-1 text-sm text-muted-foreground">Review the details below and confirm your appointment.</p>
                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: `${selectedService?.color}15` }}>
                      <Scissors className="h-5 w-5" style={{ color: selectedService?.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Service</div>
                      <div className="font-medium text-foreground">{selectedService?.name}</div>
                    </div>
                    <div className="text-sm font-medium text-foreground">
                      {formatCurrency(selectedService?.price || 0, businessSettings?.currency || 'USD')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <CalendarIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Date & Time</div>
                      <div className="font-medium text-foreground">
                        {selectedDate ? format(selectedDate, 'EEEE, MMM d') : ''} at {formatTime(selectedTime)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <UserCog className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Staff</div>
                      <div className="font-medium text-foreground">
                        {selectedStaff === 'any' ? 'Any available staff' : (selectedStaff as Staff)?.full_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Customer</div>
                      <div className="font-medium text-foreground">{customerName}</div>
                      {customerPhone && <div className="text-xs text-muted-foreground">{customerPhone}</div>}
                      {customerEmail && <div className="text-xs text-muted-foreground">{customerEmail}</div>}
                    </div>
                  </div>
                  {notes && (
                    <div className="rounded-lg border border-border p-3">
                      <div className="text-sm text-muted-foreground">Notes</div>
                      <div className="mt-1 text-sm text-foreground">{notes}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-6 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={!canGoBack}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canGoNext || submitting}
            >
              {step === 'confirm' ? (
                submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Booking...
                  </>
                ) : (
                  'Confirm booking'
                )
              ) : (
                <>
                  Continue
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
      </div>
    </div>
  );
}
