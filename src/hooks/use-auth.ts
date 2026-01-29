"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { authApi, type User } from "@/lib/api"
import type { LoginInput, RegisterInput } from "@/lib/validations"
import { useRouter } from "next/navigation"

export function useUser() {
  return useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const data = await authApi.me()
        return data.user
      } catch {
        return null
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: LoginInput) => authApi.login(data),
    onSuccess: (data) => {
      queryClient.setQueryData(["user"], data.user)
      router.push("/")
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: (data: RegisterInput) => authApi.register(data),
    onSuccess: (data) => {
      queryClient.setQueryData(["user"], data.user)
      router.push("/")
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      queryClient.setQueryData(["user"], null)
      queryClient.clear()
      router.push("/login")
    },
  })
}

export function useRequireAuth() {
  const { data: user, isLoading } = useUser()
  const router = useRouter()

  if (!isLoading && !user) {
    router.push("/login")
  }

  return { user: user as User | null, isLoading }
}
