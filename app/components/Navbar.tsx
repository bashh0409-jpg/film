"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import gsap from "gsap";
import { useLenis } from "lenis/react";

/* -------------------------------------------------------------------------- */
/*  Content & settings: edit these, not the components                         */
/* -------------------------------------------------------------------------- */

const NAV_LEFT = ["movies", "TV Shows", "New shows", "Top 50"];
const NAV_RIGHT = ["Saved", "Join aaa24", "Login"];

const MENU_ITEMS = ["Film", "Shows", "New shows"];
const MENU_FOOTER = ["Become a member", "Log in"];

// Which scroll direction hides the nav ("down" is the usual behaviour)
const HIDE_ON_SCROLL: "down" | "up" = "down";

// Where the clip-path circle grows from (roughly the burger button)
const MENU_ORIGIN = "94% 3%";

const LINK_CLASS =
  "cursor-pointer p-0.5 text-xs capitalize font-semibold transition-colors duration-[400ms] hover:bg-black hover:text-white";

/* -------------------------------------------------------------------------- */
/*  Hooks                                                                      */
/* -------------------------------------------------------------------------- */

/** Slides the element out of view when scrolling in `hideOn` direction. */
function useHideOnScroll(
  ref: RefObject<HTMLElement | null>,
  hideOn: "down" | "up",
  topOffset = 80, // always visible while closer to the top than this (px)
  threshold = 6, // ignore scroll movements smaller than this (px)
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let lastY = window.scrollY;
    let hidden = false;

    const setHidden = (next: boolean) => {
      if (next === hidden) return;
      hidden = next;
      gsap.to(el, {
        yPercent: next ? -100 : 0,
        duration: 0.45,
        ease: "power3.out",
        overwrite: "auto",
      });
    };

    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY;

      if (y < topOffset) {
        setHidden(false);
      } else if (Math.abs(delta) >= threshold) {
        const scrollingDown = delta > 0;
        setHidden(hideOn === "down" ? scrollingDown : !scrollingDown);
      } else {
        return; // tiny movement: keep lastY so small moves can add up
      }

      lastY = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [ref, hideOn, topOffset, threshold]);
}

/**
 * Animates the menu open/closed with GSAP, locks page scroll while open and
 * closes on Escape. The menu element must contain:
 *   [data-menu-close]  [data-menu-item]  [data-menu-footer]
 */
function useMobileMenu(
  menuRef: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  const lenis = useLenis();
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // Build the timeline once
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(menu);

      const tl = gsap
        .timeline({ paused: true, defaults: { ease: "power3.out" } })
        .set(menu, { visibility: "visible" })
        .fromTo(
          menu,
          { clipPath: `circle(0% at ${MENU_ORIGIN})` },
          {
            clipPath: `circle(150% at ${MENU_ORIGIN})`,
            duration: 0.9,
            ease: "power3.inOut",
          },
        )
        .fromTo(
          q("[data-menu-item]"),
          { yPercent: 110 },
          { yPercent: 0, duration: 0.8, stagger: 0.06, ease: "power4.out" },
          0.35,
        )
        .fromTo(
          q("[data-menu-close]"),
          { autoAlpha: 0, rotate: -90 },
          { autoAlpha: 1, rotate: 0, duration: 0.5 },
          0.5,
        )
        .fromTo(
          q("[data-menu-footer]"),
          { autoAlpha: 0, y: 16 },
          { autoAlpha: 1, y: 0, duration: 0.5 },
          0.7,
        );

      // Reduced motion: play the same timeline almost instantly
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        tl.timeScale(20);
      }

      tlRef.current = tl;
    }, menu);

    return () => ctx.revert();
  }, [menuRef]);

  // Play / reverse
  useEffect(() => {
    if (isOpen) tlRef.current?.play();
    else tlRef.current?.reverse();
  }, [isOpen]);

  // Lock page scroll while open
  useEffect(() => {
    if (!isOpen) return;
    lenis?.stop();
    document.body.style.overflow = "hidden";
    return () => {
      lenis?.start();
      document.body.style.overflow = "";
    };
  }, [isOpen, lenis]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);
}

/* -------------------------------------------------------------------------- */
/*  Components                                                                 */
/* -------------------------------------------------------------------------- */

const NavLinks = ({
  items,
  className = "",
}: {
  items: string[];
  className?: string;
}) => (
  <div className={`hidden items-start gap-8 lg:flex ${className}`}>
    {items.map((label) => (
      <span key={label} className={LINK_CLASS}>
        {label}
      </span>
    ))}
  </div>
);

const MobileMenu = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  useMobileMenu(menuRef, isOpen, onClose);

  return (
    // Always mounted so GSAP can animate it in and out
    <div
      ref={menuRef}
      id="mobile-menu"
      style={{ visibility: "hidden" }}
      className="fixed inset-0 z-[60] overflow-y-auto bg-white text-black lg:hidden"
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className="flex min-h-dvh flex-col px-7 pb-6 pt-10"
      >
        <button
          data-menu-close
          type="button"
          className="ml-auto flex h-7 w-7 items-center justify-center"
          aria-label="Close navigation menu"
          onClick={onClose}
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-7 w-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
          >
            <path d="M4 4 20 20M20 4 4 20" />
          </svg>
        </button>

        <nav className="mt-10 flex flex-1 flex-col items-start font-sans text-[clamp(3.75rem,12.5vw,6rem)] font-medium leading-[1.08] tracking-[-0.06em]">
          {MENU_ITEMS.map((item) => (
            // overflow-hidden wrapper = the mask each word slides out of
            <span key={item} className="block overflow-hidden">
              <button
                data-menu-item
                type="button"
                className="block"
                onClick={onClose}
              >
                {item}
              </button>
            </span>
          ))}
        </nav>

        <footer
          data-menu-footer
          className="mt-10 flex justify-between pt-2 font-mono text-[clamp(1.25rem,4.2vw,2rem)] uppercase leading-[1.2] tracking-[-0.05em]"
        >
          {MENU_FOOTER.map((label) => (
            <button key={label} type="button" onClick={onClose}>
              {label}
            </button>
          ))}
        </footer>
      </aside>
    </div>
  );
};

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  useHideOnScroll(headerRef, HIDE_ON_SCROLL);

  return (
    <>
      <header ref={headerRef} className="fixed inset-x-0 top-0 z-50">
        <nav className="grid grid-cols-3 items-start p-4 text-white">
          <NavLinks items={NAV_LEFT} />

          <span className="col-start-2 row-start-1 justify-self-center p-0.5 font-badeen-display text-3xl tracking-wide">
            a2026
          </span>

          <NavLinks items={NAV_RIGHT} className="justify-self-end" />

          <button
            type="button"
            className="col-start-3 row-start-1 ml-auto flex h-8 w-8 flex-col items-center justify-center gap-1 lg:hidden"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-px w-7 bg-current" />
            ))}
          </button>
        </nav>
      </header>

      <MobileMenu isOpen={isMenuOpen} onClose={closeMenu} />
    </>
  );
};

export default Navbar;
