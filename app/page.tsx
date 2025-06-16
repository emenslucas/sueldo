"use client";

import { LogoNavbar } from "@/components/logo-navbar";
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
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
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
  const [tab, setTab] = useState("login");
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  // Estados para verificación profesional
  const [showReverifyDialog, setShowReverifyDialog] = useState(false);
  const [reverifyEmail, setReverifyEmail] = useState("");
  const [reverifyPassword, setReverifyPassword] = useState("");
  const [reverifyLoading, setReverifyLoading] = useState(false);
  const [reverifyError, setReverifyError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.emailVerified) {
          router.push("/dashboard");
        } else {
          // User logged in but email not verified
          setVerificationEmail(user.email || "");
          setVerificationSent(true);
          signOut(auth);
        }
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
        const userCredential = await signInWithEmailAndPassword(
          auth,
          loginEmail,
          loginPassword
        );
        if (userCredential.user.emailVerified) {
          router.push("/dashboard");
        } else {
          setError(
            "Por favor verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada."
          );
          await signOut(auth);
        }
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
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          registerEmail,
          registerPassword
        );
        if (userCredential.user) {
          await sendEmailVerification(userCredential.user);
          setVerificationEmail(registerEmail);
          setVerificationSent(true);
          await signOut(auth);
        }
      } catch (error: any) {
        setError("Error al crear la cuenta. Intenta con otro email.");
      } finally {
        setLoading(false);
      }
    },
    [registerEmail, registerPassword, registerPasswordConfirm]
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

  // Guardar email pendiente de verificación en localStorage
  useEffect(() => {
    if (verificationSent && verificationEmail) {
      localStorage.setItem("pendingVerificationEmail", verificationEmail);
    }
  }, [verificationSent, verificationEmail]);

  // Limpiar estados de re-verificación al volver al login
  useEffect(() => {
    if (!verificationSent) {
      setShowReverifyDialog(false);
      setReverifyEmail("");
      setReverifyPassword("");
      setReverifyError("");
    }
  }, [verificationSent]);

  const resendVerificationEmail = async () => {
    setError("");
    if (auth.currentUser) {
      // Si hay sesión, reenviar directo
      setLoading(true);
      try {
        await sendEmailVerification(auth.currentUser);
        setError("Email de verificación reenviado. Revisa tu bandeja de entrada.");
      } catch (error: any) {
        setError("Error al reenviar el email de verificación.");
      } finally {
        setLoading(false);
      }
    } else {
      // Si no hay sesión, abrir modal para pedir email y contraseña
      setReverifyEmail(localStorage.getItem("pendingVerificationEmail") || "");
      setShowReverifyDialog(true);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (verificationSent) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
          <Card className="w-full max-w-md shadow-lg text-center py-6">
            <CardHeader>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-4 mb-2 flex items-center justify-center">
                  <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 17a2 2 0 002-2v-2a2 2 0 00-4 0v2a2 2 0 002 2zm6-6V9a6 6 0 10-12 0v2a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2z" /></svg>
                </div>
                <CardTitle className="text-2xl font-bold">Verifica tu Email</CardTitle>
                <CardDescription>
                  Hemos enviado un email de verificación a <strong>{verificationEmail}</strong>.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-muted-foreground text-sm">
                Por favor, revisa tu bandeja de entrada y sigue el enlace para verificar tu cuenta.
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit mx-auto border-blue-500 text-blue-600 bg-white hover:bg-blue-50 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-400 dark:border-blue-700 rounded-full px-6 py-1 text-sm font-medium shadow-none transition disabled:opacity-60"
                  onClick={resendVerificationEmail}
                  disabled={loading}
                >
                  {loading ? "Reenviando..." : "Reenviar Email de Verificación"}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full mt-2"
                  onClick={() => {
                    setVerificationSent(false);
                    setTab("login");
                    setError("");
                  }}
                >
                  Volver a Iniciar Sesión
                </Button>
              </div>
              {error && (
                <p className="mt-4 text-sm text-destructive">{error}</p>
              )}
            </CardContent>
          </Card>
        </div>
        {/* Dialogo para re-verificar si no hay sesión */}
        <Dialog open={showReverifyDialog} onOpenChange={setShowReverifyDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reenviar verificación</DialogTitle>
              <DialogDescription>
                Ingresa tu email y contraseña para reenviar el email de verificación.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setReverifyLoading(true);
                setReverifyError("");
                try {
                  const cred = await signInWithEmailAndPassword(auth, reverifyEmail, reverifyPassword);
                  await sendEmailVerification(cred.user);
                  setShowReverifyDialog(false);
                  setError("Email de verificación reenviado. Revisa tu bandeja de entrada.");
                } catch (err: any) {
                  setReverifyError("Credenciales incorrectas o error al reenviar email.");
                } finally {
                  setReverifyLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="reverify-email">Email</Label>
                <Input
                  id="reverify-email"
                  type="email"
                  value={reverifyEmail}
                  onChange={(e) => setReverifyEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reverify-password">Contraseña</Label>
                <Input
                  id="reverify-password"
                  type="password"
                  value={reverifyPassword}
                  onChange={(e) => setReverifyPassword(e.target.value)}
                  required
                />
              </div>
              {reverifyError && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <p className="text-sm text-destructive">{reverifyError}</p>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReverifyDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={reverifyLoading}>
                  {reverifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reenviar Email"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <LogoNavbar className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold">Gestor de Sueldo</CardTitle>
          <CardDescription>
            Administra tu dinero de forma inteligente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger
                value="login"
                onClick={() => setTab("login")}
                className={tab === "login" ? "text-primary" : ""}
              >
                Iniciar Sesión
              </TabsTrigger>
              <TabsTrigger
                value="register"
                onClick={() => setTab("register")}
                className={tab === "register" ? "text-primary" : ""}
              >
                Registrarse
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <AnimatePresence mode="wait">
                {tab === "login" && (
                  <motion.form
                    key="login"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    onSubmit={handleLogin}
                    className="space-y-4"
                  >
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
                      <svg
                        className="h-5 w-5 mr-2"
                        viewBox="0 0 48 48"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M24 9.5c4.1 0 7.1 1.7 8.7 3.1l6.5-6.5C35.7 2.7 30.3 0 24 0 14.8 0 6.6 5.8 2.7 14.1l7.6 5.9C12.7 14.1 17.8 9.5 24 9.5Z"
                          fill="#60a5fa"
                        />
                        <path
                          d="M46.5 24.5c0-1.8-.2-3.5-.5-5.1H24v9.6h12.9c-.6 3.1-2.5 5.7-5.2 7.5l7.9 6.1C44.4 38.1 46.5 31.9 46.5 24.5Z"
                          fill="#60a5fa"
                        />
                        <path
                          d="M10.6 28.5c-1.1-3.3-1.1-6.8 0-10.1l-7.6-5.9C1.1 17.7 0 20.8 0 24c0 3.2 1.1 6.3 3 8.9l7.6-5.9Z"
                          fill="#60a5fa"
                        />
                        <path
                          d="M24 48c6.3 0 11.7-2.1 15.6-5.7l-7.9-6.1c-2.2 1.5-5 2.4-7.7 2.4-7.1 0-13.2-5.1-14.9-11.9l-7.6 5.9C6.6 42.2 14.8 48 24 48Z"
                          fill="#60a5fa"
                        />
                        <path d="M0 0h48v48H0z" fill="none" />
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
                  </motion.form>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="register">
              <AnimatePresence mode="wait">
                {tab === "register" && (
                  <motion.form
                    key="register"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    onSubmit={handleRegister}
                    className="space-y-4"
                  >
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
                        onChange={(e) =>
                          setRegisterPasswordConfirm(e.target.value)
                        }
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
                  </motion.form>
                )}
              </AnimatePresence>
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
