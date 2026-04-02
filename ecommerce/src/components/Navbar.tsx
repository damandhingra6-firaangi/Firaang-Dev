"use client";

// components/Navbar.tsx
import { Search, Heart, ShoppingBag, User } from "lucide-react";

export default function Navbar() {
  return (
    <div className="fixed top-0 w-full z-50">
      {/* Top bar */}
      <div className="bg-[var(--primary)] text-center text-xs py-2 text-white tracking-wide">
        FREE SHIPPING ON ORDER ABOVE $25 SHOP NOW
      </div>

      {/* Main navbar */}
      <div className="flex justify-between items-center px-10 py-4 bg-[var(--secondary)] text-white">
        {/* Logo */}
        <h1 className="text-3xl font-bold tracking-widest text-[var(--gold)]">
          FIRAANGI
        </h1>

        {/* Nav links */}
        <nav className="hidden md:flex gap-10 text-sm tracking-wider">
          <a href="#" className="hover:text-[var(--gold)]">
            HOME
          </a>
          <a
            href="#"
            className="hover:text-[var(--gold)] flex items-center gap-1"
          >
            CLOTHING <span className="text-[var(--gold)]">▼</span>
          </a>
          <a href="#" className="hover:text-[var(--gold)]">
            JEWELLERY
          </a>
          <a href="#" className="hover:text-[var(--gold)]">
            COLLECTIONS
          </a>
          <a href="#" className="hover:text-[var(--gold)]">
            ABOUT
          </a>
          <a href="#" className="hover:text-[var(--gold)]">
            CONTACT
          </a>
        </nav>

        <div className="flex items-center gap-6">
          <Search className="w-5 h-5 cursor-pointer hover:text-[var(--gold)]" />
          <Heart className="w-5 h-5 cursor-pointer hover:text-[var(--gold)]" />
          <ShoppingBag className="w-5 h-5 cursor-pointer hover:text-[var(--gold)]" />
          <User className="w-5 h-5 cursor-pointer hover:text-[var(--gold)]" />

          <button className="bg-[var(--gold)] text-black px-5 py-2 rounded-none uppercase tracking-wide font-semibold">
            SHOP NOW
          </button>
        </div>
      </div>
    </div>
  );
}
