import type {
    Appointment,
    Customer,
    Service,
    Staff,
    Resource,
} from "./database";

export type AppointmentWithRelations = Appointment & {
    customer?: Customer;
    service?: Service;
    staff?: Staff | null;
    resource?: Resource | null;
};