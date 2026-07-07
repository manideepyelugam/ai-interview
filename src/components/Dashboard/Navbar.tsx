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
    <header className="h-14 border-b border-[#ECECEC] bg-white/80 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center justify-end h-full px-6 lg:px-8">
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          <button className="relative p-2 rounded-lg hover:bg-[#F7F7F7] transition-colors duration-150">
            <Bell className="w-[18px] h-[18px] text-[#9CA3AF]" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white" />
          </button>

          {/* User Avatar */}
          <Avatar className="w-8 h-8 ring-1 ring-[#ECECEC] cursor-pointer">
            <AvatarImage src={user?.avatar} alt={user?.name || "User"} />
            <AvatarFallback className="text-xs bg-blue-50 text-blue-500 font-medium">
              {user?.name ? getInitials(user.name) : "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
