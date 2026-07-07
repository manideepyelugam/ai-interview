"use client";

import { useAuth } from "@/src/components/providers/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell } from "lucide-react";

export function Navbar() {
  const { user } = useAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="h-16 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center justify-end h-full px-6 lg:px-8">
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <button className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <Bell className="w-5 h-5 text-gray-500" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
          </button>

          {/* User Avatar */}
          <Avatar className="w-9 h-9 ring-2 ring-gray-100 cursor-pointer">
            <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
            <AvatarFallback className="text-xs bg-blue-100 text-blue-600 font-semibold">
              {user?.name ? getInitials(user.name) : "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
