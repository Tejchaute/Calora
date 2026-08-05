'use client';

import { useState, useRef, useCallback, ReactNode } from 'react';
import { Upload, File, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Image from "next/image";

interface FileUploaderProps {
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  className?: string;
  children?: ReactNode;
}

export function FileUploader({ onFilesSelected, accept, multiple, maxSize, className, children }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleSelect = useCallback(() => inputRef.current?.click(), []);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesSelected?.(files);
    }
  };
  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
      />
      {children ?? (
        <Button variant="outline" onClick={handleSelect}>
          <Upload className="mr-2 h-4 w-4" />
          Upload file
        </Button>
      )}
    </div>
  );
}

interface DropzoneProps {
  onFilesSelected?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
  label?: string;
  description?: string;
}

export function Dropzone({
  onFilesSelected,
  accept,
  multiple = true,
  className,
  label = 'Drag and drop files here',
  description = 'or click to browse',
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    onFilesSelected?.(files);
  }, [onFilesSelected]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground',
        className
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => e.target.files && onFilesSelected?.(Array.from(e.target.files))}
      />
      <Upload className="h-8 w-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function ImagePreview({ src, alt, onRemove, className }: { src: string; alt?: string; onRemove?: () => void; className?: string }) {
  return (
    <div className={cn('group relative overflow-hidden rounded-lg border border-border', className)}>
      <img src={src} alt={alt ?? 'Preview'} className="h-full w-full object-cover" />
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-background/80 text-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="Remove image"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

interface AvatarUploaderProps {
  src?: string;
  onChange?: (file: File) => void;
  className?: string;
  fallback?: ReactNode;
}

export function AvatarUploader({ src, onChange, className, fallback }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => inputRef.current?.click()}
        className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Upload avatar"
      >
        {src ? (
          <img src={src} alt="Avatar" className="h-full w-full object-cover" />
        ) : fallback ?? (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onChange?.(file);
        }}
      />
    </div>
  );
}

export function FileCard({ name, size, onRemove, className }: { name: string; size?: string; onRemove?: () => void; className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 rounded-lg border border-border p-3', className)}>
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
        <File className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        {size && <p className="text-xs text-muted-foreground">{size}</p>}
      </div>
      {onRemove && (
        <button onClick={onRemove} className="flex-shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={`Remove ${name}`}>
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function AttachmentList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('space-y-2', className)}>{children}</div>;
}

export function UploadProgress({ progress, fileName, className }: { progress: number; fileName?: string; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {fileName && (
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-foreground">{fileName}</span>
        </div>
      )}
      <Progress value={progress} />
      <p className="text-right text-xs text-muted-foreground">{Math.round(progress)}%</p>
    </div>
  );
}
