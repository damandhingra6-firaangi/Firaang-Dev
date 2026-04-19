"use client";

// components/Navbar.tsx
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search, Heart, ShoppingBag, User } from "lucide-react";
import AccountModal from "@/components/AccountModal";
import AccountQuickActionsSheet from "@/components/AccountQuickActionsSheet";
import CartDrawer from "@/components/CartDrawer";
import HeaderSearchPanel from "@/components/HeaderSearchPanel";
import WishlistDrawer from "@/components/WishlistDrawer";
import { useAccountStore } from "@/store/useAccountStore";
import { getCartCount, getWishlistItems, useShopStore } from "@/store/useShopStore";
import { useUiStore } from "@/store/useUiStore";

export default function Navbar() {
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [activeAccountView, setActiveAccountView] = useState<"signin" | "profile" | "orders">("signin");
  const cart = useShopStore((state) => state.cart);
  const wishlist = useShopStore((state) => state.wishlist);
  const isSignedIn = useAccountStore((state) => state.isSignedIn);
  const clearSession = useAccountStore((state) => state.clearSession);
  const cartCount = getCartCount(cart);
  const wishlistCount = getWishlistItems(wishlist).length;

  const isCartOpen = useUiStore((state) => state.isCartOpen);
  const isWishlistOpen = useUiStore((state) => state.isWishlistOpen);
  const isSearchOpen = useUiStore((state) => state.isSearchOpen);
  const isUserMenuOpen = useUiStore((state) => state.isUserMenuOpen);
  const openCart = useUiStore((state) => state.openCart);
  const closeCart = useUiStore((state) => state.closeCart);
  const openWishlist = useUiStore((state) => state.openWishlist);
  const closeWishlist = useUiStore((state) => state.closeWishlist);
  const openSearch = useUiStore((state) => state.openSearch);
  const closeSearch = useUiStore((state) => state.closeSearch);
  const toggleUserMenu = useUiStore((state) => state.toggleUserMenu);
  const closeUserMenu = useUiStore((state) => state.closeUserMenu);
  const pushToast = useUiStore((state) => state.pushToast);

  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const navItems = [
    { href: "/", label: "HOME" },
    { href: "/shop", label: "COLLECTIONS" },
  ] as const;

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(targetNode)) {
        closeUserMenu();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [closeUserMenu]);

  const openAccountModal = (view: "signin" | "profile" | "orders") => {
    setActiveAccountView(view);
    setIsAccountSheetOpen(false);
    setIsAccountModalOpen(true);
    closeUserMenu();
  };

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to sign out cleanly", error);
    } finally {
      clearSession();
      setIsAccountSheetOpen(false);
      setIsAccountModalOpen(false);
      closeUserMenu();
      pushToast("Signed out", { variant: "info" });
    }
  };

  return (
    <header className="fixed top-0 w-full z-50">
      <div className="bg-[#7a202a] text-center py-2 text-[10px] tracking-[0.25em] uppercase font-medium md:text-xs">
        Free Shipping on Orders Above ₹700 | New Festive Edit Live
      </div>

      <div className="flex items-center justify-between border-y border-[#8a2c35]/60 bg-[var(--secondary)]/95 px-4 py-3 backdrop-blur-md md:px-10 md:py-4">
        <Link href="/">
          <img
            src="/Firaangi Logo Design.svg"
            alt="Firaangi Logo"
            className="h-[50px] w-auto"
          />
        </Link>

        <nav className="hidden md:flex gap-8 text-base tracking-[0.12em] font-normal" style={{ fontSize: "16px" }}>
          {navItems.map((item) => (
            <Link key={item.label} href={item.href} className="hover:text-[var(--gold)]">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3 md:gap-5" ref={userMenuRef}>
          <button type="button" aria-label="Search products" onClick={openSearch}>
            <Search className="h-5 w-5 cursor-pointer hover:text-[var(--gold)]" />
          </button>
          <button type="button" aria-label="Open wishlist" className="relative" onClick={openWishlist}>
            <Heart className="h-5 w-5 cursor-pointer hover:text-[var(--gold)]" />
            {wishlistCount > 0 ? (
              <span className="absolute -right-2 -top-2 rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[10px] font-semibold text-[#30070e]">
                {wishlistCount}
              </span>
            ) : null}
          </button>
          <button type="button" aria-label="Open cart" className="relative" onClick={openCart}>
            <ShoppingBag className="h-5 w-5 cursor-pointer hover:text-[var(--gold)]" />
            {cartCount > 0 ? (
              <span className="absolute -right-2 -top-2 rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[10px] font-semibold text-[#30070e]">
                {cartCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            aria-label="Open account"
            className="relative md:hidden"
            onClick={() => setIsAccountSheetOpen(true)}
          >
            <User className="h-5 w-5 cursor-pointer hover:text-[var(--gold)]" />
          </button>

          <button type="button" aria-label="User menu" className="relative hidden md:block" onClick={toggleUserMenu}>
            <User className="h-5 w-5 cursor-pointer hover:text-[var(--gold)]" />
          </button>

          {isUserMenuOpen ? (
            <div className="absolute right-0 top-[74px] z-[101] hidden min-w-[220px] rounded-xl border border-[var(--gold)]/40 bg-[#2b060b] p-2 shadow-xl md:block">
              <button
                type="button"
                onClick={() => openAccountModal("signin")}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#451018]"
              >
                {isSignedIn ? "Switch Account" : "Sign In"}
              </button>
              <button
                type="button"
                onClick={() => openAccountModal("profile")}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#451018]"
              >
                My Profile
              </button>
              <button
                type="button"
                onClick={() => openAccountModal("orders")}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[#451018]"
              >
                Orders
              </button>
              {isSignedIn ? (
                <>
                  <div className="my-1 border-t border-[var(--gold)]/25" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-[#ffd3d8] hover:bg-[#5a1420]"
                  >
                    Sign Out
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          <Link href="/shop" className="gold-button hidden md:block">
            SHOP NOW
          </Link>
        </div>
      </div>

      <HeaderSearchPanel isOpen={isSearchOpen} onClose={closeSearch} />
      <WishlistDrawer isOpen={isWishlistOpen} onClose={closeWishlist} />
      <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
      <AccountQuickActionsSheet
        isOpen={isAccountSheetOpen}
        isSignedIn={isSignedIn}
        onClose={() => setIsAccountSheetOpen(false)}
        onSelectView={openAccountModal}
        onSignOut={handleSignOut}
      />
      <AccountModal
        isOpen={isAccountModalOpen}
        initialView={activeAccountView}
        onClose={() => setIsAccountModalOpen(false)}
      />
    </header>
  );
}
