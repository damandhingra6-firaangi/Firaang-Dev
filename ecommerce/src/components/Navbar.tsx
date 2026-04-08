"use client";

// components/Navbar.tsx
import { Search, Heart, ShoppingBag, User } from "lucide-react";

export default function Navbar() {
  return (
    <header className="fixed top-0 w-full z-50">
      <div className="bg-[#7a202a] text-center py-2 text-[10px] tracking-[0.25em] uppercase font-medium md:text-xs">
        Free Shipping on Orders Above $25 | New Festive Edit Live
      </div>

      <div className="flex items-center justify-between border-y border-[#8a2c35]/60 bg-[var(--secondary)]/95 px-4 py-4 backdrop-blur-md md:px-10">
        <img
          src="/Firaangi Logo Design.svg"
          alt="Firaangi Logo"
          className="h-[40px] w-auto"
        />

        <nav className="hidden md:flex gap-8 text-base tracking-[0.12em] font-normal" style={{ fontSize: "16px" }}>
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

        <div className="flex items-center gap-3 md:gap-5">
          <Search className="h-5 w-5 cursor-pointer hover:text-[var(--gold)]" />
          <Heart className="h-5 w-5 cursor-pointer hover:text-[var(--gold)]" />
          <ShoppingBag className="h-5 w-5 cursor-pointer hover:text-[var(--gold)]" />
          <User className="hidden h-5 w-5 cursor-pointer hover:text-[var(--gold)] md:block" />

          <button className="gold-button hidden md:block">
            SHOP NOW
          </button>
        </div>
      </div>
    </header>
  );
}
