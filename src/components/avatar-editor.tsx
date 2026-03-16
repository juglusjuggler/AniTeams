"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2 } from "lucide-react";

interface AvatarEditorProps {
  currentImage: string | null;
  name: string | null;
}

export function AvatarEditor({ currentImage, name }: AvatarEditorProps) {
  const [image, setImage] = useState(currentImage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const initials = name?.slice(0, 2).toUpperCase() ?? "U";

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    if (file.size > 200 * 1024) {
      setError("Image too large. Max 200KB.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const dataUrl = await fileToDataUrl(file);
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
      } else {
        setImage(data.image);
        setSuccess("Avatar updated!");
        setTimeout(() => setSuccess(""), 2000);
      }
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleRemove() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: null }),
      });

      if (res.ok) {
        setImage(null);
        setSuccess("Avatar removed!");
        setTimeout(() => setSuccess(""), 2000);
      }
    } catch {
      setError("Failed to remove avatar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-20 w-20">
          <AvatarImage src={image ?? undefined} alt={name ?? "User"} />
          <AvatarFallback className="text-xl">{initials}</AvatarFallback>
        </Avatar>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary/90 disabled:opacity-50"
          aria-label="Change avatar"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      <div className="space-y-1">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
          >
            Upload Photo
          </Button>
          {image && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              disabled={loading}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          PNG, JPEG, GIF or WebP. Max 200KB.
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {success && <p className="text-xs text-green-500">{success}</p>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
