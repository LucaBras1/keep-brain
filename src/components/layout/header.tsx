"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Menu, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useUser, useLogout } from "@/hooks/use-auth"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { keepApi } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { setTheme } = useTheme()
  const { data: user } = useUser()
  const logout = useLogout()
  const queryClient = useQueryClient()

  const syncMutation = useMutation({
    mutationFn: () => keepApi.sync(),
    onSuccess: () => {
      toast({
        title: "Synchronizace spuštěna",
        description: "Poznámky z Google Keep se synchronizují na pozadí.",
      })
      queryClient.invalidateQueries({ queryKey: ["user"] })
    },
    onError: (error: Error) => {
      toast({
        title: "Chyba synchronizace",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0].toUpperCase() || "?"

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onMenuClick}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Menu</span>
      </Button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {user?.keepEmail && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || user.syncStatus === "SYNCING"}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                syncMutation.isPending || user.syncStatus === "SYNCING"
                  ? "animate-spin"
                  : ""
              }`}
            />
            Sync
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Přepnout téma</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              Světlý
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              Tmavý
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              Systémový
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {user?.name && (
                  <p className="font-medium">{user.name}</p>
                )}
                <p className="w-[200px] truncate text-sm text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuItem
              className="text-destructive cursor-pointer"
              onClick={() => logout.mutate()}
            >
              Odhlásit se
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
