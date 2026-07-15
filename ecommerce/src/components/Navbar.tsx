"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import AccountQuickActionsSheet from "@/components/AccountQuickActionsSheet";
import CartDrawer from "@/components/CartDrawer";
import HeaderSearchPanel from "@/components/HeaderSearchPanel";
import SafeImage from "@/components/SafeImage";
import WishlistDrawer from "@/components/WishlistDrawer";
import { useAccountStore } from "@/store/useAccountStore";
import { getCartCount, getWishlistItems, useShopStore } from "@/store/useShopStore";
import { useUiStore } from "@/store/useUiStore";

type AccountView = "signin" | "profile" | "orders";

const desktopNavItems = [
  { label: "MEN", href: "/shop?audience=boys" },
  { label: "WOMEN", href: "/shop?audience=girls" },
  { label: "KIDS", href: "/shop?category=accessories" },
  { label: "GENZ", href: "/shop?category=t-shirts&subCategory=gen-z-t-shirts" },
] as const;

function buildShopFilterHref(categorySlug: string, subCategorySlug?: string) {
  const params = new URLSearchParams();
  params.set("category", categorySlug);

  if (subCategorySlug) {
    params.set("subCategory", subCategorySlug);
  }

  return `/shop?${params.toString()}`;
}

type CollectionItem = {
  label: string;
  categorySlug: string;
  subCategorySlug?: string;
  isNew?: boolean;
};

const collections: CollectionItem[] = [
  { label: "Devotional", categorySlug: "t-shirts", subCategorySlug: "devotional" },
  { label: "Mandala Magic", categorySlug: "t-shirts", subCategorySlug: "mandala-magic" },
  { label: "Animal", categorySlug: "t-shirts", subCategorySlug: "animal" },
  { label: "Games & Sports", categorySlug: "t-shirts", subCategorySlug: "games-sports" },
  { label: "Anime Art", categorySlug: "t-shirts", subCategorySlug: "anime-art" },
  { label: "Dark Art", categorySlug: "t-shirts", subCategorySlug: "dark-art" },
  { label: "Abstract Art", categorySlug: "t-shirts", subCategorySlug: "abstract-art" },
  { label: "Motivation", categorySlug: "t-shirts", subCategorySlug: "motivation" },
  { label: "Yoga & Wellness", categorySlug: "t-shirts", subCategorySlug: "yoga-wellness" },
  { label: "Gothic", categorySlug: "t-shirts", subCategorySlug: "gothic" },
  { label: "Gen Z T-Shirts", categorySlug: "t-shirts", subCategorySlug: "gen-z-t-shirts", isNew: true },
  { label: "Oversized T-Shirts", categorySlug: "t-shirts", subCategorySlug: "oversized-t-shirts" },
  { label: "Graphic T-Shirts", categorySlug: "t-shirts", subCategorySlug: "graphic-t-shirts" },
  { label: "Minimal T-Shirts", categorySlug: "t-shirts", subCategorySlug: "minimal-t-shirts" },
  { label: "All Collections", categorySlug: "t-shirts" },
];

const mobileMenuItems = [
  { label: "Men", href: "/shop?audience=boys" },
  { label: "Women", href: "/shop?audience=girls" },
  { label: "Kids", href: "/shop?category=accessories" },
  { label: "Collections", href: "/shop?category=t-shirts" },
  { label: "GenZ", href: "/shop?category=t-shirts&subCategory=gen-z-t-shirts" },
] as const;

function getDisplayName(fullName: string, email: string, phone: string) {
  const trimmedName = fullName.trim();
  if (trimmedName) {
    return trimmedName;
  }

  const trimmedEmail = email.trim();
  if (trimmedEmail.includes("@")) {
    return trimmedEmail.split("@")[0] || "User";
  }

  return phone.trim() || "User";
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);

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

  const cart = useShopStore((state) => state.cart);
  const wishlist = useShopStore((state) => state.wishlist);
  const isSignedIn = useAccountStore((state) => state.isSignedIn);
  const profile = useAccountStore((state) => state.profile);
  const clearSession = useAccountStore((state) => state.clearSession);

  const cartCount = getCartCount(cart);
  const wishlistCount = getWishlistItems(wishlist).length;

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const collectionsRef = useRef<HTMLDivElement | null>(null);

  const displayName = useMemo(
    () => getDisplayName(profile.fullName, profile.email, profile.phone),
    [profile.email, profile.fullName, profile.phone],
  );

  const firstName = useMemo(() => displayName.split(/\s+/)[0] || displayName, [displayName]);
  const contactDetail = useMemo(() => profile.phone.trim() || profile.email.trim(), [profile.email, profile.phone]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(targetNode)) {
        closeUserMenu();
      }
      if (collectionsRef.current && !collectionsRef.current.contains(targetNode)) {
        setIsCollectionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [closeUserMenu]);

  useEffect(() => {
    closeCart();
    closeWishlist();
    closeSearch();
    closeUserMenu();
    setIsCollectionsOpen(false);
    setIsMobileMenuOpen(false);
  }, [closeCart, closeSearch, closeUserMenu, closeWishlist, pathname]);

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

  const navigateToAccount = (view: AccountView) => {
    const tab = view === "signin" ? "overview" : view;
    closeUserMenu();
    setIsAccountSheetOpen(false);
    router.push(`/account?tab=${tab}`);
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
      closeUserMenu();
      pushToast("Signed out", { variant: "info" });
      router.push("/account?tab=overview");
    }
  };

  const desktopNavLinkClass =
    "relative inline-flex items-center py-1 text-[16px] font-semibold leading-none tracking-normal text-[var(--nav-text)] transition-colors duration-200 hover:text-[var(--nav-active)] after:absolute after:-bottom-[9px] after:left-0 after:h-[2px] after:w-full after:origin-left after:scale-x-0 after:bg-[#ed467a] after:transition-transform after:duration-200 hover:after:scale-x-100";

  const openWishlistFromMenu = () => {
    openWishlist();
    closeUserMenu();
  };

  return (
    <header className="fixed top-0 z-50 w-full">
      <div className="bg-[var(--announcement-bg)] px-3 py-1 text-center text-[9px] font-medium uppercase tracking-[0.16em] text-[var(--announcement-fg)] md:py-1.5 md:text-[10px] md:tracking-[0.2em]">
        <div className="home-shell flex items-center justify-center gap-4">
          {/* <span className="text-[9px] md:text-[10px]">&#8249;</span>
          <span>Free Shipping On Order Above $25 Shop Now</span>
          <span className="text-[9px] md:text-[10px]">&#8250;</span> */}
        </div>
      </div>

      <div className="border-b border-[color:var(--nav-border)]/70 bg-[var(--nav-bg)] text-[var(--nav-text)]">
        <div className="home-shell flex h-[68px] items-center justify-between gap-3 md:h-[72px]">
          <div className="flex min-w-0 items-center gap-3 md:gap-5 lg:gap-6 xl:gap-8">
            <button
              type="button"
              aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              className="inline-flex rounded-full border border-[var(--nav-border)] p-2 text-[var(--nav-text)] md:hidden"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <Link href="/" className="shrink-0" aria-label="Firaang home">
              <SafeImage
                src="/icon_v001.svg"
                alt="Firaang Icon"
                className="block h-8 w-8 object-contain sm:h-9 sm:w-9 md:hidden"
              />
              <SafeImage
                src="/FiraangLogoDesign-black.svg"
                alt="Firaang Logo"
                className="hidden h-10 w-auto max-w-[216px] object-contain md:block"
              />
            </Link>

            <nav className="hidden shrink-0 items-center gap-5 lg:flex xl:gap-7">
              {desktopNavItems.slice(0, 3).map((item) => (
                <Link key={item.label} href={item.href} className={desktopNavLinkClass}>
                  {item.label}
                </Link>
              ))}

              <div className="relative" ref={collectionsRef}>
                <button
                  type="button"
                  onClick={() => setIsCollectionsOpen((prev) => !prev)}
                  className={`${desktopNavLinkClass} gap-1`}
                >
                  COLLECTIONS
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${isCollectionsOpen ? "rotate-180" : ""}`} />
                </button>

                {isCollectionsOpen ? (
                  <div className="absolute left-1/2 top-[calc(100%+10px)] z-[110] w-[560px] -translate-x-1/2 overflow-hidden rounded-md border border-[#e3e4e8] bg-white shadow-[0_12px_28px_rgba(0,0,0,0.12)]">
                    <div className="grid grid-cols-2 gap-1 p-2">
                      {collections.map((collection) => (
                        <Link
                          key={collection.label}
                          href={buildShopFilterHref(collection.categorySlug, collection.subCategorySlug)}
                          onClick={() => setIsCollectionsOpen(false)}
                          className="flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-[#282c3f] transition hover:bg-[#f7f7f9] hover:text-[#ff3f6c]"
                        >
                          <span>{collection.label}</span>
                          {collection.isNew ? (
                            <span className="rounded-full bg-[#ff3f6c] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                              New
                            </span>
                          ) : null}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <Link href={desktopNavItems[3].href} className={desktopNavLinkClass}>
                {desktopNavItems[3].label}
              </Link>
            </nav>
          </div>

          <button
            type="button"
            onClick={openSearch}
            className="hidden h-12 w-[clamp(300px,42vw,668px)] min-w-0 flex-1 items-center rounded-[5px] border border-[#ed467a]/50 bg-[#fff8fa] px-4 text-left transition hover:border-[#ed467a] xl:flex"
            aria-label="Search for products"
          >
            <Search className="h-[17px] w-[17px] shrink-0 text-[#666666]" />
            <span className="ml-3 min-w-0 flex-1 truncate text-[15px] font-medium leading-[1.1] text-[#666666]">
              Search for products, brands and more
            </span>
          </button>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 md:gap-4" ref={userMenuRef}>
            <button
              type="button"
              onClick={openSearch}
              aria-label="Open search"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--nav-text)] transition hover:bg-[#f4f4f4] xl:hidden"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={toggleUserMenu}
              aria-label="Open profile menu"
              className="relative hidden min-w-[56px] flex-col items-center justify-center rounded-md px-1 py-1 text-[var(--nav-text)] transition hover:bg-[#fff1f6] md:flex"
            >
              <User className="h-[18px] w-[18px]" />
              {isSignedIn ? (
                <>
                  <span className="mt-0.5 max-w-[68px] truncate text-[10px] font-medium leading-none text-[var(--nav-active)]">
                    Hello {firstName}
                  </span>
                  <span className="mt-1 text-[12px] font-semibold leading-none">Profile</span>
                </>
              ) : (
                <span className="mt-1 text-[13px] font-semibold leading-none">Profile</span>
              )}
            </button>

            <button
              type="button"
              aria-label="Open wishlist"
              onClick={openWishlist}
              className="relative hidden min-w-[56px] flex-col items-center justify-center rounded-md px-1 py-1 text-[var(--nav-text)] transition hover:bg-[#fff1f6] md:flex"
            >
              <Heart className="h-[18px] w-[18px]" />
              <span className="mt-1 text-[13px] font-semibold leading-none">Wishlist</span>
              {wishlistCount > 0 ? (
                <span className="absolute right-0 top-0 rounded-full bg-[#ff3f6c] px-1.5 py-[1px] text-[10px] font-semibold text-white">
                  {wishlistCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              aria-label="Open bag"
              onClick={openCart}
              className="relative hidden min-w-[56px] flex-col items-center justify-center rounded-md px-1 py-1 text-[var(--nav-text)] transition hover:bg-[#fff1f6] md:flex"
            >
              <ShoppingBag className="h-[18px] w-[18px]" />
              <span className="mt-1 text-[13px] font-semibold leading-none">Bag</span>
              {cartCount > 0 ? (
                <span className="absolute right-0 top-0 rounded-full bg-[#ff3f6c] px-1.5 py-[1px] text-[10px] font-semibold text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              aria-label="Open profile"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--nav-text)] transition hover:bg-[#f4f4f4] md:hidden"
              onClick={() => setIsAccountSheetOpen(true)}
            >
              <User className="h-5 w-5" />
            </button>

            <button
              type="button"
              aria-label="Open wishlist"
              onClick={openWishlist}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--nav-text)] transition hover:bg-[#f4f4f4] md:hidden"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 ? (
                <span className="absolute right-0 top-0 rounded-full bg-[#ff3f6c] px-1.5 py-[1px] text-[10px] font-semibold text-white">
                  {wishlistCount}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              aria-label="Open bag"
              onClick={openCart}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--nav-text)] transition hover:bg-[#f4f4f4] md:hidden"
            >
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 ? (
                <span className="absolute right-0 top-0 rounded-full bg-[#ff3f6c] px-1.5 py-[1px] text-[10px] font-semibold text-white">
                  {cartCount}
                </span>
              ) : null}
            </button>

            {isUserMenuOpen ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-[101] hidden min-w-[260px] rounded-sm border border-[#e2e2e2] bg-white p-4 shadow-[0_8px_22px_rgba(0,0,0,0.14)] md:block">
                {!isSignedIn ? (
                  <>
                    <h4 className="text-[29px] font-semibold leading-none text-[#282c3f]">Welcome</h4>
                    <p className="mt-1 text-[14px] text-[#535766]">To access account and manage orders</p>
                    <button
                      type="button"
                      onClick={() => navigateToAccount("signin")}
                      className="mt-4 inline-flex w-full items-center justify-center border border-[#d4d5d9] px-3 py-2 text-[14px] font-semibold uppercase tracking-[0.04em] text-[#ff3f6c] transition hover:border-[#ff3f6c]/40"
                    >
                      Login / Sign Up
                    </button>
                    <div className="my-3 border-t border-[#eaeaec]" />
                    <div className="space-y-2.5 text-[16px] text-[#282c3f]">
                      <button type="button" onClick={() => navigateToAccount("orders")} className="block text-left hover:text-[#ff3f6c]">
                        Orders
                      </button>
                      <button type="button" onClick={openWishlistFromMenu} className="block text-left hover:text-[#ff3f6c]">
                        Wishlist
                      </button>
                      <Link href="/contact" className="block hover:text-[#ff3f6c]" onClick={closeUserMenu}>
                        Contact Us
                      </Link>
                      <button type="button" onClick={() => navigateToAccount("profile")} className="block text-left hover:text-[#ff3f6c]">
                        Saved Addresses
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h4 className="text-[28px] font-semibold leading-none text-[#282c3f]">Hello {firstName}</h4>
                    {contactDetail ? <p className="mt-1 text-[14px] text-[#535766]">{contactDetail}</p> : null}
                    <div className="my-3 border-t border-[#eaeaec]" />
                    <div className="space-y-2.5 text-[16px] text-[#282c3f]">
                      <button type="button" onClick={() => navigateToAccount("profile")} className="block text-left hover:text-[#ff3f6c]">
                        My Profile
                      </button>
                      <button type="button" onClick={() => navigateToAccount("orders")} className="block text-left hover:text-[#ff3f6c]">
                        Orders
                      </button>
                      <button type="button" onClick={openWishlistFromMenu} className="block text-left hover:text-[#ff3f6c]">
                        Wishlist
                      </button>
                      <button type="button" onClick={() => navigateToAccount("profile")} className="block text-left hover:text-[#ff3f6c]">
                        Saved Addresses
                      </button>
                      <button type="button" onClick={() => navigateToAccount("profile")} className="block text-left hover:text-[#ff3f6c]">
                        Saved Payment Methods
                      </button>
                      <Link href="/contact" className="block hover:text-[#ff3f6c]" onClick={closeUserMenu}>
                        Contact Us
                      </Link>
                    </div>
                    <div className="my-3 border-t border-[#eaeaec]" />
                    <button type="button" onClick={handleSignOut} className="text-[16px] text-[#282c3f] hover:text-[#ff3f6c]">
                      Logout
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="mobile-drawer-backdrop fixed inset-0 top-[72px] z-[90] bg-black/45 backdrop-blur-[2px] md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="mobile-drawer-panel h-full w-[88vw] max-w-[340px] overflow-y-auto border-r border-[#e2e2e2] bg-white px-4 py-5"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                openSearch();
                setIsMobileMenuOpen(false);
              }}
              className="mb-4 flex w-full items-center gap-3 rounded-md border border-[#e8e9ec] bg-white px-3 py-2 text-left text-[14px] text-[#696e79] shadow-[0_2px_10px_rgba(40,44,63,0.06)]"
            >
              <Search className="h-4 w-4" />
              Search for products, brands and more
            </button>

            <div className="space-y-1">
              {mobileMenuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block rounded-md px-2 py-2 text-[15px] font-medium text-[#282c3f] hover:bg-[#f7f7f8]"
                >
                  {item.label}
                </Link>
              ))}
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
        displayName={displayName}
        contactDetail={contactDetail}
        onClose={() => setIsAccountSheetOpen(false)}
        onNavigateToAccount={navigateToAccount}
        onOpenWishlist={openWishlist}
        onSignOut={handleSignOut}
      />
    </header>
  );
}
