"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/firebase";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";

export default function LoginPage() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerPasswordConfirm, setRegisterPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      }
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Al inicio del componente LoginPage, cuando se monta:
  // Si no está autenticando y no hay usuario, limpiar errores
  useEffect(() => {
    if (!checkingAuth) setError("");
  }, [checkingAuth]);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      try {
        await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        router.push("/dashboard");
      } catch (error: any) {
        setError("Error al iniciar sesión. Verifica tus credenciales.");
      } finally {
        setLoading(false);
      }
    },
    [loginEmail, loginPassword, router]
  );

  const handleRegister = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError("");

      if (registerPassword !== registerPasswordConfirm) {
        setError("Las contraseñas no coinciden.");
        setLoading(false);
        return;
      }

      try {
        await createUserWithEmailAndPassword(
          auth,
          registerEmail,
          registerPassword
        );
        router.push("/dashboard");
      } catch (error: any) {
        setError("Error al crear la cuenta. Intenta con otro email.");
      } finally {
        setLoading(false);
      }
    },
    [registerEmail, registerPassword, registerPasswordConfirm, router]
  );

  const handleForgotPassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetEmail.trim()) {
        setError("Por favor ingresa tu email");
        return;
      }

      setResetLoading(true);
      setError("");

      try {
        await sendPasswordResetEmail(auth, resetEmail);
        setEmailSent(true);
      } catch (error: any) {
        console.error("Error sending password reset email:", error);
        if (error.code === "auth/user-not-found") {
          setError("No existe una cuenta con este email");
        } else if (error.code === "auth/invalid-email") {
          setError("Email inválido");
        } else {
          setError(
            "Error al enviar el email de recuperación. Intenta nuevamente."
          );
        }
      } finally {
        setResetLoading(false);
      }
    },
    [resetEmail]
  );

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/dashboard");
    } catch (error: any) {
      if (error.code === "auth/popup-closed-by-user") {
        setError("El inicio de sesión fue cancelado.");
      } else {
        setError("Error al iniciar sesión con Google.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Gestor de Sueldo</CardTitle>
          <CardDescription>
            Administra tu dinero de forma inteligente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={loginEmail}
                    placeholder="tu@email.com"
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 border-blue-200 dark:bg-blue-950 dark:hover:bg-blue-900 dark:border-blue-800 rounded-md shadow-sm transition font-semibold min-h-[44px]"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M24 9.5c4.1 0 7.1 1.7 8.7 3.1l6.5-6.5C35.7 2.7 30.3 0 24 0 14.8 0 6.6 5.8 2.7 14.1l7.6 5.9C12.7 14.1 17.8 9.5 24 9.5Z" fill="#60a5fa"/>
                    <path d="M46.5 24.5c0-1.8-.2-3.5-.5-5.1H24v9.6h12.9c-.6 3.1-2.5 5.7-5.2 7.5l7.9 6.1C44.4 38.1 46.5 31.9 46.5 24.5Z" fill="#60a5fa"/>
                    <path d="M10.6 28.5c-1.1-3.3-1.1-6.8 0-10.1l-7.6-5.9C1.1 17.7 0 20.8 0 24c0 3.2 1.1 6.3 3 8.9l7.6-5.9Z" fill="#60a5fa"/>
                    <path d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.9-6.1c-2.2 1.5-5 2.4-7.7 2.4-7.1 0-13.2-5.1-14.9-11.9l-7.6 5.9C6.6 42.2 14.8 48 24 48Z" fill="#60a5fa"/>
                    <path d="M0 0h48v48H0z" fill="none"/>
                  </svg>
                  <span className="text-blue-600 dark:text-blue-400">
                    {loading ? "Cargando..." : "Continuar con Google"}
                  </span>
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                    placeholder="tu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Contraseña</Label>
                  <Input
                    id="register-password"
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password-confirm">
                    Confirmar Contraseña
                  </Label>
                  <Input
                    id="register-password-confirm"
                    type="password"
                    value={registerPasswordConfirm}
                    onChange={(e) => setRegisterPasswordConfirm(e.target.value)}
                    required
                  />
                </div>
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Crear Cuenta"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Contraseña</DialogTitle>
            <DialogDescription>
              Ingresa tu email y se te enviará un enlace para restablecer tu
              contraseña.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setForgotPasswordOpen(false);
                  setResetEmail("");
                  setError("");
                  setEmailSent(false);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={resetLoading}
                className={`transition-all duration-300 ${
                  emailSent ? "bg-green-500 hover:bg-green-700" : ""
                }`}
              >
                {resetLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : emailSent ? (
                  "Enviado"
                ) : (
                  "Enviar Email"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
