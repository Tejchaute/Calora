"use client";

import {
  UserCog,
  Edit,
  Trash2,
  Mail,
  Phone,
  Scissors,
  CalendarClock,
  Clock3,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { getInitials } from "@/lib/utils";
import type { Staff, Service } from "@/types/database";
import type { StaffWithOperations } from "../services/staff.service";
import { formatDate, formatTime } from "@/lib/utils";

interface StaffTableProps {
  staff: StaffWithOperations[];
  services: Service[];
  staffServices: Record<string, string[]>;
  loading: boolean;
  hasFilters: boolean;
  onEdit: (staffMember: Staff) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onView: (staffMember: StaffWithOperations) => void;
}

export function StaffTable({
  staff,
  services,
  staffServices,
  loading,
  hasFilters,
  onEdit,
  onDelete,
  onCreate,
  onView,
}: StaffTableProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="mt-4 h-5 w-32" />
              <Skeleton className="mt-2 h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (staff.length === 0) {
    return (
      <EmptyState
        icon={UserCog}
        title="No staff members found"
        description={
          hasFilters
            ? "Try adjusting your search."
            : "Add your first team member to get started."
        }
        action={{ label: "Add staff", onClick: onCreate }}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {staff.map((s) => (
        <Card key={s.id} className="transition-shadow hover:shadow-md">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={s.avatar_url} alt={s.full_name} />
                <AvatarFallback className="bg-primary/15 text-lg font-semibold text-primary">
                  {getInitials(s.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">
                  {s.full_name}
                </h3>
                {s.role && (
                  <p className="text-sm text-muted-foreground">{s.role}</p>
                )}
                <Badge
                  variant={s.status === "active" ? "default" : "secondary"}
                  className="mt-2"
                >
                  {s.status === "active" ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              {s.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{s.email}</span>
                </div>
              )}
              {s.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {s.phone}
                </div>
              )}
            </div>
            {staffServices[s.id] && staffServices[s.id].length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {staffServices[s.id].map((sid) => {
                  const svc = services.find((sv) => sv.id === sid);
                  return svc ? (
                    <span
                      key={sid}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      <Scissors className="h-3 w-3" />
                      {svc.name}
                    </span>
                  ) : null;
                })}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 border-t pt-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="font-semibold tabular-nums">
                  {s.operations.todayAppointmentCount} appointments
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Next 30 days</p>
                <p className="font-semibold tabular-nums">
                  {s.operations.upcomingAppointmentCount} active
                </p>
              </div>
            </div>
            {s.operations.inProgressAppointment ? (
              <button
                type="button"
                onClick={() => onView(s)}
                className="mt-3 flex w-full items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-left text-sm text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Clock3 className="h-4 w-4" />
                <span className="min-w-0 truncate">
                  In progress ·{" "}
                  {s.operations.inProgressAppointment.services.name}
                </span>
              </button>
            ) : s.operations.nextAppointment ? (
              <button
                type="button"
                onClick={() => onView(s)}
                className="mt-3 flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="min-w-0 truncate">
                  Next ·{" "}
                  {formatDate(s.operations.nextAppointment.appointment_date)} at{" "}
                  {formatTime(s.operations.nextAppointment.start_time)}
                </span>
              </button>
            ) : null}
            {s.operations.currentTimeOff && (
              <Badge variant="secondary" className="mt-3">
                Currently on time off
              </Badge>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => onView(s)}
                className="flex-1"
              >
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(s)}
                className="flex-1"
              >
                <Edit className="mr-2 h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(s.id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
