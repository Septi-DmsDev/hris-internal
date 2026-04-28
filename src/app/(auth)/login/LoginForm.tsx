"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { loginAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    setServerError(null);
    const fd = new FormData();
    fd.append("email", data.email);
    fd.append("password", data.password);
    const result = await loginAction(fd);
    if (result?.error) {
      setServerError(result.error);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="hrd@perusahaan.com"
          aria-describedby={errors.email ? "email-error" : undefined}
          {...register("email")}
        />
        {errors.email && (
          <p id="email-error" role="alert" className="text-sm text-red-500">
            {errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          aria-describedby={errors.password ? "password-error" : undefined}
          {...register("password")}
        />
        {errors.password && (
          <p id="password-error" role="alert" className="text-sm text-red-500">
            {errors.password.message}
          </p>
        )}
      </div>
      {serverError && (
        <p role="alert" className="text-sm text-red-500">{serverError}</p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
