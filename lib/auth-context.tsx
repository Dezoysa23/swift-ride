"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

type User = {
  id: string
  name: string
  email: string
  role: "passenger" | "driver" | "admin"
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string, role: "passenger" | "driver") => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me")
        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
        }
      } catch (error) {
        console.error("Authentication check failed:", error)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Login failed")
      }

      const userData = await response.json()
      setUser(userData)

      toast.success("Login successful", { description: "Welcome back to SwiftRide!" })

      if (userData.role === "admin") {
        router.push("/admin/dashboard")
      } else if (userData.role === "driver") {
        router.push("/driver/dashboard")
      } else {
        router.push("/passenger/dashboard")
      }
    } catch (error) {
      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "An error occurred during login",
      })
    } finally {
      setLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string, role: "passenger" | "driver") => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password, role }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Registration failed")
      }

      toast.success("Registration successful", {
        description: "Your account has been created. Please log in.",
      })

      router.push("/auth/login")
    } catch (error) {
      toast.error("Registration failed", {
        description: error instanceof Error ? error.message : "An error occurred during registration",
      })
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })
      setUser(null)
      router.push("/")
      toast("Logged out", { description: "You have been successfully logged out." })
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
