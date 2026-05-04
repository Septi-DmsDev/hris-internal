"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { loginAction, type LoginActionState } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState, useTransition } from "react";

export default function LoginForm() {
  const [state, formAction, pending] = useActionState<LoginActionState, FormData>(
    loginAction,
    {}
  );
  const [isTransitionPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = handleSubmit((data) => {
    const fd = new FormData();
    fd.append("email", data.email);
    fd.append("password", data.password);
    startTransition(() => {
      formAction(fd);
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
      {state.error && (
        <p role="alert" className="text-sm text-red-500">{state.error}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending || isTransitionPending}>
        {pending || isTransitionPending ? "Memproses..." : "Masuk"}
      </Button>
    </form>
  );
}
