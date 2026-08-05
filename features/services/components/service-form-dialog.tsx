'use client';

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { Service } from "@/types/database";

import { serviceSchema } from "../schemas/service.schema";
import {
  createService,
  updateService,
} from "../services/services.service";
import { handleError } from "@/lib/errors/error-handler";

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  service?: Service | null;

  serviceColors: string[];

  onSuccess: () => Promise<void>;
}

type ServiceFormValues = {
  name: string;
  description: string;
  duration: string;
  price: string;
  color: string;
  status: "active" | "inactive";
};

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  serviceColors,
  onSuccess,
}: ServiceFormDialogProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),

    defaultValues: {
      name: "",
      description: "",
      duration: "30",
      price: "0",
      color: serviceColors[0],
      status: "active",
    },
  });
  const handleClose = () => {
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) return;

    if (service) {
      reset({
        name: service.name,
        description: service.description ?? "",
        duration: String(service.duration),
        price: String(service.price),
        color: service.color || serviceColors[0],
        status: service.status,
      });
    } else {
      reset({
        name: "",
        description: "",
        duration: "30",
        price: "0",
        color: serviceColors[0],
        status: "active",
      });
    }
  }, [open, service, reset, serviceColors]);

  const handleSave = handleSubmit(async (values) => {

    const payload = {
      name: values.name,
      description: values.description,
      duration: Number(values.duration),
      price: Number(values.price),
      color: values.color,
      status: values.status as "active" | "inactive",
    };

    try {

      if (service) {

        const { error } = await updateService(service.id, payload);

        if (error) {
          toast.error("Failed to update service");
          return;
        }

        toast.success("Service updated");

      } else {

        const { error } = await createService(payload);

        if (error) {
          toast.error("Failed to create service");
          return;
        }

        toast.success("Service created");
      }

      reset();
      onOpenChange(false);
      await onSuccess();

    } catch (error) {
        handleError(error, {
          fallbackMessage: "Failed to save service.",
        });
    }

  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>

      <DialogContent className="sm:max-w-md">

        <DialogHeader>

          <DialogTitle>

            {service ? "Edit Service" : "Add Service"}

          </DialogTitle>

        </DialogHeader>

        <div className="space-y-4 py-2">

          <div className="space-y-2">

            <Label>Service name</Label>

            <Input
              {...register("name")}
            />

            {errors.name && (
              <p className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}

          </div>

          <div className="space-y-2">

            <Label>Description</Label>

            <Textarea
              rows={2}
              {...register("description")}
            />

            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}

          </div>

          <div className="grid grid-cols-2 gap-4">

            <div className="space-y-2">

              <Label>Duration</Label>

              <Input
                type="number"
                  {...register("duration")}
              />

            </div>

            <div className="space-y-2">

              <Label>Price</Label>

              <Input
                type="number"
                {...register("price")}
              />

            </div>

          </div>

          <div className="space-y-2">

            <Label>Color</Label>

            <div className="flex flex-wrap gap-2">

              {serviceColors.map((c) => (

                <button
                  key={c}
                  type="button"
                  onClick={() => setValue("color", c)}
                  className={`h-8 w-8 rounded-full ${
                    watch("color") === c
                      ? "ring-2 ring-offset-2 ring-muted-foreground"
                      : ""
                  }`}
                  style={{ backgroundColor: c }}
                />

              ))}

            </div>

          </div>

          <div className="space-y-2">
            <Label>Status</Label>

            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="active">
                      Active
                    </SelectItem>

                    <SelectItem value="inactive">
                      Inactive
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Saving..."
              : service
              ? "Update"
              : "Create"}
          </Button>

        </DialogFooter>

      </DialogContent>

    </Dialog>
  );
}