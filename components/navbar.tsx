"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { CommandPalette } from "./command-palette";
import { TOTAL_TOOLS_COUNT } from "@/config/tools";
import { 
  FileStack, 
  Github, 
  ShieldCheck, 
  Search, 
  Menu, 
  X, 
  FileText, 
  Presentation, 
  Type, 
  ImagePlus, 
  LayoutGrid 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

const NAV_LINKS = [
  {
    href: "/",
    label: "All Tools",
    icon: LayoutGrid,
    activeColor: "text-foreground",
    activeBadge: "bg-background text-foreground shadow-xs border-border/80",
  },
  {
    href: "/pdf-tools",
    label: "PDF Tools",
    icon: FileText,
    activeColor: "text-rose-600 dark:text-rose-400",
    activeBadge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25",
  },
  {
    href: "/document-tools",
    label: "Document Tools",
    icon: Presentation,
    activeColor: "text-blue-600 dark:text-blue-400",
    activeBadge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
  },
  {
    href: "/text-tools",
    label: "Text Tools",
    icon: Type,
    activeColor: "text-purple-600 dark:text-purple-400",
    activeBadge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
  },
  {
    href: "/image-tools",
    label: "Image Tools",
    icon: ImagePlus,
    activeColor: "text-emerald-600 dark:text-emerald-400",
    activeBadge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25",
  },
];

export function Navbar({ searchQuery = "", onSearchChange }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const pathname = usePathname();

  // Global Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/25 group-hover:scale-105 transition-transform duration-200">
              <FileStack className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent flex items-center gap-1.5">
                OpenPDF
                <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Suite
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-muted/30 p-1 rounded-xl border border-border/40">
            {NAV_LINKS.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border",
                    isActive
                      ? cn("shadow-xs", item.activeBadge)
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5", isActive ? item.activeColor : "text-muted-foreground")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Command Palette Trigger & Inline Search Bar */}
          <div className="flex-1 max-w-sm mx-2">
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 text-xs bg-muted/40 hover:bg-muted/70 border border-border/60 hover:border-foreground/30 rounded-xl transition-all text-muted-foreground shadow-inner group"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                <span className="truncate">Search all {TOTAL_TOOLS_COUNT} tools...</span>
              </div>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground bg-background/80 border border-border/70 rounded shrink-0">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Actions & Badges (Single Theme Toggle across all screen sizes) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Zero Data Stored</span>
            </div>

            <a
              href="https://github.com/MiriyalaMonisahith/file_converter_by_monisahith"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:text-foreground bg-card/60 hover:bg-muted/80 rounded-xl border border-border/60 transition-colors shadow-sm"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Open Source</span>
            </a>

            {/* Exactly One Single ThemeToggle */}
            <ThemeToggle />

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl border border-border text-foreground hover:bg-muted transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-border px-4 py-4 bg-background/95 backdrop-blur-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Quick Search Trigger inside drawer */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setCommandPaletteOpen(true);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2 text-xs bg-muted/50 border border-border/60 rounded-xl text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Search all {TOTAL_TOOLS_COUNT} tools...</span>
              </span>
              <kbd className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-background border border-border/70">
                ⌘K
              </kbd>
            </button>

            {/* Mobile Navigation Links */}
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-border/50">
              {NAV_LINKS.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all border",
                      isActive
                        ? item.activeBadge
                        : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border-border/40"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5", isActive ? item.activeColor : "text-muted-foreground")} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                Zero Data Stored
              </span>
              <a
                href="https://github.com/MiriyalaMonisahith/file_converter_by_monisahith"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-foreground/80 hover:text-foreground"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub</span>
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}
