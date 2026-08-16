"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, File, Image, X, CheckCircle2, AlertCircle } from "lucide-react";

export interface FileUploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  className?: string;
  label?: string;
  sublabel?: string;
}

export default function FileUploadDropzone({
  onFilesSelected,
  maxFiles = 5,
  maxSizeMB = 10,
  acceptedTypes = ["image/*", "application/pdf", ".xlsx", ".csv", ".docx"],
  className = "",
  label = "Drag & Drop files here or click to browse",
  sublabel = "Supports PNG, JPG, PDF, Excel up to 10MB",
}: FileUploadDropzoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const validateAndAddFiles = (incomingFiles: FileList | File[]) => {
    setError(null);
    const validList: File[] = [];
    const maxBytes = maxSizeMB * 1024 * 1024;

    for (let i = 0; i < incomingFiles.length; i++) {
      const file = incomingFiles[i];
      if (file.size > maxBytes) {
        setError(`File "${file.name}" exceeds the maximum allowed size of ${maxSizeMB}MB.`);
        continue;
      }
      validList.push(file);
    }

    if (selectedFiles.length + validList.length > maxFiles) {
      setError(`You can only upload a maximum of ${maxFiles} files at once.`);
      return;
    }

    const updated = [...selectedFiles, ...validList];
    setSelectedFiles(updated);
    onFilesSelected(updated);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index: number) => {
    const next = selectedFiles.filter((_, idx) => idx !== index);
    setSelectedFiles(next);
    onFilesSelected(next);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Dropzone area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
          dragOver
            ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]"
            : "border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/40 hover:border-slate-400 dark:hover:border-slate-600"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={acceptedTypes.join(",")}
          onChange={(e) => e.target.files && validateAndAddFiles(e.target.files)}
          className="hidden"
        />

        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors ${
          dragOver
            ? "bg-indigo-600 text-white"
            : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
        }`}>
          <UploadCloud className="w-6 h-6" />
        </div>

        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-[11px] text-slate-400 mt-1">{sublabel}</p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* File Previews List */}
      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {selectedFiles.map((f, idx) => {
            const isImage = f.type.startsWith("image/");
            return (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 shrink-0">
                    {isImage ? <Image className="w-4 h-4 text-indigo-500" /> : <File className="w-4 h-4 text-blue-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{f.name}</p>
                    <p className="text-[10px] text-slate-400">{(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition-colors ml-2"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
