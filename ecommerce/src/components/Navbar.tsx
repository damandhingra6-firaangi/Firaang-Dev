"use client";

// components/Navbar.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Heart, ShoppingBag, User, ChevronDown, Menu, X, Moon, Sun } from "lucide-react";
import AccountModal from "@/components/AccountModal";
import AccountQuickActionsSheet from "@/components/AccountQuickActionsSheet";
import CartDrawer from "./CartDrawer";
import HeaderSearchPanel from "@/components/HeaderSearchPanel";
import SafeImage from "@/components/SafeImage";
import WishlistDrawer from "@/components/WishlistDrawer";
import { useAccountStore } from "@/store/useAccountStore";
import { getCartCount, getWishlistItems, useShopStore } from "@/store/useShopStore";
import { useUiStore } from "@/store/useUiStore";
import { useTheme } from "@/hooks/useTheme";

export default function Navbar() {
  const pathname = usePathname();
  const { theme, toggleTheme, mounted } = useTheme();
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [activeAccountView, setActiveAccountView] = useState<"signin" | "profile" | "orders">("signin");
  const globalAccountModalOpen = useUiStore((state) => state.isAccountModalOpen);
  const closeAccountModal = useUiStore((state) => state.closeAccountModal);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const [isMobileCollectionsOpen, setIsMobileCollectionsOpen] = useState(false);
  const categoriesRef = useRef<HTMLDivElement | null>(null);
  const collectionsRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (categoriesRef.current && !categoriesRef.current.contains(event.target as Node)) {
        setIsCategoriesOpen(false);
      }
      if (collectionsRef.current && !collectionsRef.current.contains(event.target as Node)) {
        setIsCollectionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const navItems = [
    { href: "/", label: "HOME" },
    { href: "/about", label: "ABOUT" },
    { href: "/contact", label: "CONTACT" },
  ] as const;

  const buildShopFilterHref = (categorySlug: string, subCategorySlug?: string) => {
    const params = new URLSearchParams();
    params.set("category", categorySlug);

    if (subCategorySlug) {
      params.set("subCategory", subCategorySlug);
    }

    return `/shop?${params.toString()}`;
  };

  const collections = [
    { label: "Devotional", categorySlug: "t-shirts", subCategorySlug: "devotional", tag: "NEW" },
    { label: "Animal", categorySlug: "t-shirts", subCategorySlug: "animal" },
    { label: "Games & Sports", categorySlug: "t-shirts", subCategorySlug: "games-sports" },
    { label: "Anime Art", categorySlug: "t-shirts", subCategorySlug: "anime-art" },
    { label: "Dark Art", categorySlug: "t-shirts", subCategorySlug: "dark-art" },
    { label: "Abstract Art", categorySlug: "t-shirts", subCategorySlug: "abstract-art" },
    { label: "Motivation", categorySlug: "t-shirts", subCategorySlug: "motivation" },
    { label: "Yoga & Wellness", categorySlug: "t-shirts", subCategorySlug: "yoga-wellness" },
    { label: "Gothic", categorySlug: "t-shirts", subCategorySlug: "gothic" },
    { label: "All T-Shirts", categorySlug: "t-shirts" },
  ] as const;

  const mobileCollectionGroups = [
    {
      title: "Spiritual & Culture",
      items: collections.filter((item) => ["Devotional", "Motivation"].includes(item.label)),
    },
    {
      title: "Wild & Playful",
      items: collections.filter((item) => ["Animal", "Games & Sports", "Yoga & Wellness"].includes(item.label)),
    },
    {
      title: "Art & Edge",
      items: collections.filter((item) => ["Anime Art", "Dark Art", "Abstract Art", "Gothic"].includes(item.label)),
    },
  ] as const;

  const categories = [
    { label: "Hoodies", slug: "hoodies", icon: "H" },
    { label: "Sweatshirts", slug: "sweatshirts", icon: "S" },
    { label: "T-Shirts", slug: "t-shirts", icon: "T" },
    { label: "Half-Shirts", slug: "half-shirts", icon: "HS" },
    { label: "Caps", slug: "caps", icon: "C" },
  ] as const;

  const isNavItemActive = (href: (typeof navItems)[number]["href"]) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(href);
  };

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

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsMobileCategoriesOpen(false);
    setIsMobileCollectionsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      document.body.style.removeProperty("overflow");
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.removeProperty("overflow");
    };
  }, [isMobileMenuOpen]);

  const openAccountModal = (view: "signin" | "profile" | "orders") => {
    setActiveAccountView(view);
    setIsAccountSheetOpen(false);
    setIsAccountModalOpen(true);
    closeUserMenu();
  };

  // sync global store trigger (e.g. from CartDrawer)
  useEffect(() => {
    if (globalAccountModalOpen) {
      setActiveAccountView("signin");
      setIsAccountModalOpen(true);
    }
  }, [globalAccountModalOpen]);

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

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
    setIsMobileCategoriesOpen(false);
    setIsMobileCollectionsOpen(false);
  };

  return (
    <header className="fixed top-0 z-50 w-full">
      <div className="bg-[var(--announcement-bg)] px-3 py-1.5 text-center text-[8px] font-medium uppercase tracking-[0.18em] text-[var(--announcement-fg)] md:py-2 md:text-xs md:tracking-[0.22em]">
        <span className="md:hidden">Free Shipping Above ₹700 | Festive Edit Live</span>
        <span className="hidden md:inline">Free Shipping on Orders Above ₹700 | New Festive Edit Live</span>
      </div>

      <div className="flex items-center justify-between border-y border-[color:var(--nav-border)]/60 bg-[var(--nav-bg)] px-4 py-3 text-[var(--nav-text)] md:px-10 md:py-4">
        <Link href="/">
          <SafeImage
            src="/Firaangi Logo Design.svg"
            alt="Firaangi Logo"
            className="h-[40px] w-auto md:h-[50px]"
          />
        </Link>

        <nav className="hidden gap-8 text-base font-normal tracking-[0.12em] md:flex" style={{ fontSize: "16px" }}>
          <Link
            href="/"
            className={isNavItemActive("/") ? "text-[var(--nav-active)]" : "transition hover:text-[var(--nav-active)]"}
          >
            HOME
          </Link>

          {/* Categories dropdown */}
          <div className="relative" ref={categoriesRef}>
            <button
              type="button"
              onClick={() => {
                setIsCategoriesOpen((prev) => !prev);
                setIsCollectionsOpen(false);
              }}
              className={`inline-flex items-center gap-1 transition hover:text-[var(--nav-active)] ${
                pathname.startsWith("/shop") ? "text-[var(--nav-active)]" : ""
              }`}
            >
              CATEGORIES
              <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isCategoriesOpen ? "rotate-180" : ""}`} />
            </button>

            {isCategoriesOpen ? (
              <div className="absolute left-1/2 top-[calc(100%+14px)] z-[110] w-52 -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--gold)]/30 bg-[var(--menu-bg)] shadow-[0_24px_52px_rgba(0,0,0,0.28)] backdrop-blur-md">
                <div className="px-2 py-2">
                  {categories.map((category) => (
                    <Link
                      key={category.label}
                      href={buildShopFilterHref(category.slug)}
                      onClick={() => setIsCategoriesOpen(false)}
                      className="group flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm tracking-[0.06em] text-[var(--menu-text)] transition hover:bg-[var(--gold)]/10 hover:text-[var(--gold)]"
                    >
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-1 text-[10px] font-semibold text-[var(--gold)]">
                        {category.icon}
                      </span>
                      {category.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Collections dropdown */}
          <div className="relative" ref={collectionsRef}>
            <button
              type="button"
              onClick={() => {
                setIsCollectionsOpen((prev) => !prev);
                setIsCategoriesOpen(false);
              }}
              className={`inline-flex items-center gap-1 transition hover:text-[var(--nav-active)] ${
                pathname.startsWith("/shop") ? "text-[var(--nav-active)]" : ""
              }`}
            >
              COLLECTIONS
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isCollectionsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isCollectionsOpen ? (
              <div className="absolute left-1/2 top-[calc(100%+14px)] z-[110] w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-[var(--gold)]/30 bg-[var(--menu-bg)] shadow-[0_24px_52px_rgba(0,0,0,0.28)] backdrop-blur-md">
                <div className="px-2 py-2">
                  {collections.map((col) => (
                    <Link
                      key={col.label}
                      href={buildShopFilterHref(col.categorySlug, "subCategorySlug" in col ? col.subCategorySlug : undefined)}
                      onClick={() => setIsCollectionsOpen(false)}
                      className="group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm transition hover:bg-[var(--gold)]/10"
                    >
                      <span className="tracking-[0.06em] text-[var(--menu-text)] transition group-hover:text-[var(--gold)]">
                        {col.label}
                      </span>
                      {"tag" in col && col.tag ? (
                        <span className="rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#30070e]">
                          {col.tag}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
                <div className="border-t border-[var(--gold)]/20 px-4 py-2.5">
                  <Link
                    href="/shop"
                    onClick={() => setIsCollectionsOpen(false)}
                    className="block text-center text-[11px] uppercase tracking-[0.18em] text-[var(--gold)] transition hover:text-[#ffd980]"
                  >
                    View All Collections →
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          {navItems.filter(i => i.href !== "/").map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={isNavItemActive(item.href) ? "text-[var(--nav-active)]" : "transition hover:text-[var(--nav-active)]"}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 md:gap-5" ref={userMenuRef}>
          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            className="inline-flex rounded-full border border-[var(--gold)]/30 p-2 text-[var(--nav-text)] md:hidden"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          {pathname.startsWith("/shop") ? (
            <button type="button" aria-label="Open wishlist" className="relative" onClick={openWishlist}>
              <Heart className="h-5 w-5 cursor-pointer hover:text-[var(--gold)]" />
              {wishlistCount > 0 ? (
                <span className="absolute -right-2 -top-2 rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[10px] font-semibold text-[#30070e]">
                  {wishlistCount}
                </span>
              ) : null}
            </button>
          ) : null}
          <button type="button" aria-label="Open cart" className="relative" onClick={openCart}>
            <ShoppingBag className="h-5 w-5 cursor-pointer hover:text-[var(--gold)]" />
            {cartCount > 0 ? (
              <span className="absolute -right-2 -top-2 rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[10px] font-semibold text-[#30070e]">
                {cartCount}
              </span>
            ) : null}
          </button>

          {mounted && (
            <button
              type="button"
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              onClick={toggleTheme}
              className="transition-colors duration-200 hover:text-[var(--gold)]"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 cursor-pointer" />
              ) : (
                <Moon className="h-5 w-5 cursor-pointer" />
              )}
            </button>
          )}

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
            <div className="absolute right-0 top-[74px] z-[101] hidden min-w-[220px] rounded-xl border border-[var(--gold)]/40 bg-[var(--panel-bg)] p-2 shadow-xl md:block">
              <button
                type="button"
                onClick={() => openAccountModal("signin")}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--panel-hover)]"
              >
                {isSignedIn ? "Switch Account" : "Login or Signup"}
              </button>
              <button
                type="button"
                onClick={() => openAccountModal("profile")}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--panel-hover)]"
              >
                My Profile
              </button>
              <button
                type="button"
                onClick={() => openAccountModal("orders")}
                className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--panel-hover)]"
              >
                Orders
              </button>
              {isSignedIn ? (
                <>
                  <div className="my-1 border-t border-[var(--gold)]/25" />
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--menu-text)] hover:bg-[var(--panel-signout)]"
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

      {isMobileMenuOpen ? (
        <div className="mobile-drawer-backdrop fixed inset-0 top-[74px] z-[90] bg-[rgba(14,2,5,0.68)] backdrop-blur-[2px] md:hidden" onClick={closeMobileMenu}>
          <div
            className="mobile-drawer-panel h-full w-[88vw] max-w-[360px] overflow-y-auto border-r border-[var(--gold)]/20 bg-gradient-to-b from-[#4f0d17] via-[#3a0710] to-[#25040a] px-4 py-5 shadow-[0_30px_60px_rgba(0,0,0,0.5)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 rounded-2xl border border-[var(--gold)]/15 bg-[#631723]/30 px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--gold)]">Navigate Firaangi</p>
              <p className="mt-2 text-[22px] font-semibold leading-[1.1] text-[#fff1e8]" style={{ fontFamily: "var(--font-playfair), serif" }}>
                Explore Categories, collections, and signature edits.
              </p>
            </div>

            <div className="space-y-2">
              <Link
                href="/"
                onClick={closeMobileMenu}
                className={`block rounded-xl px-3 py-3 text-sm font-medium tracking-[0.14em] ${pathname === "/" ? "bg-[var(--gold)]/12 text-[var(--gold)]" : "text-[#f2d8cf]"}`}
              >
                HOME
              </Link>

              <button
                type="button"
                onClick={() => {
                  setIsMobileCategoriesOpen((prev) => !prev);
                  setIsMobileCollectionsOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium tracking-[0.14em] text-[#f2d8cf]"
              >
                <span>CATEGORIES</span>
                <ChevronDown className={`h-4 w-4 transition ${isMobileCategoriesOpen ? "rotate-180" : ""}`} />
              </button>

              {isMobileCategoriesOpen ? (
                <div className="rounded-2xl border border-[var(--gold)]/20 bg-[#2d070e] p-2">
                  {categories.map((category) => (
                    <Link
                      key={category.label}
                      href={buildShopFilterHref(category.slug)}
                      onClick={closeMobileMenu}
                      className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-[#f1d7ce] transition hover:bg-[var(--gold)]/10 hover:text-[var(--gold)]"
                    >
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[var(--gold)]/40 bg-[var(--gold)]/10 px-1 text-[10px] font-semibold text-[var(--gold)]">
                        {category.icon}
                      </span>
                      {category.label}
                    </Link>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setIsMobileCollectionsOpen((prev) => !prev);
                  setIsMobileCategoriesOpen(false);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium tracking-[0.14em] text-[#f2d8cf]"
              >
                <span>COLLECTIONS</span>
                <ChevronDown className={`h-4 w-4 transition ${isMobileCollectionsOpen ? "rotate-180" : ""}`} />
              </button>

              {isMobileCollectionsOpen ? (
                <div className="space-y-3 rounded-2xl border border-[var(--gold)]/20 bg-[#2d070e] p-3">
                  {mobileCollectionGroups.map((group) => (
                    <div key={group.title} className="rounded-xl border border-[#ffffff10] bg-[#3b0911]/55 p-2.5">
                      <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">
                        {group.title}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((col) => (
                          <Link
                            key={col.label}
                            href={buildShopFilterHref(col.categorySlug, "subCategorySlug" in col ? col.subCategorySlug : undefined)}
                            onClick={closeMobileMenu}
                            className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm text-[#f1d7ce] transition hover:bg-[var(--gold)]/10 hover:text-[var(--gold)]"
                          >
                            <span>{col.label}</span>
                            {"tag" in col && col.tag ? (
                              <span className="rounded-full bg-[var(--gold)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#30070e]">
                                {col.tag}
                              </span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}

                  <Link
                    href={buildShopFilterHref("t-shirts")}
                    onClick={closeMobileMenu}
                    className="mt-1 block rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/8 px-3 py-3 text-center text-sm font-medium tracking-[0.08em] text-[var(--gold)]"
                  >
                    View All T-Shirt Collections
                  </Link>
                </div>
              ) : null}

              {navItems.filter((item) => item.href !== "/").map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={`block rounded-xl px-3 py-3 text-sm font-medium tracking-[0.14em] ${isNavItemActive(item.href) ? "bg-[var(--gold)]/12 text-[var(--gold)]" : "text-[#f2d8cf]"}`}
                >
                  {item.label}
                </Link>
              ))}

              <Link href="/shop" onClick={closeMobileMenu} className="gold-button mt-2 block text-center">
                SHOP NOW
              </Link>
            </div>
          </div>
        </div>
      ) : null}

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
        onClose={() => { setIsAccountModalOpen(false); closeAccountModal(); }}
      />
    </header>
  );
}
