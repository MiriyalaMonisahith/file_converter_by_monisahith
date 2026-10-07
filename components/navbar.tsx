"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";
import { 
  FileStack, 
  Github, 
  ShieldCheck, 
  Search, 
  Sparkles,
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
  { href: "/", label: "All Tools", icon: LayoutGrid },
  { href: "/pdf-tools", label: "PDF Tools", icon: FileText },
  { href: "/document-tools", label: "Document Tools", icon: Presentation },
  { href: "/text-tools", label: "Text Tools", icon: Type },
  { href: "/image-tools", label: "Image Tools", icon: ImagePlus },
];

export function Navbar({ searchQuery = "", onSearchChange }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl transition-colors">
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
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                  isActive
                    ? "bg-background text-foreground shadow-sm border border-border/60 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-rose-500" : "text-muted-foreground")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Global Search Bar */}
        {onSearchChange ? (
          <div className="hidden md:flex items-center flex-1 max-w-xs mx-2">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search all 35 tools..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/40 hover:bg-muted/70 focus:bg-background border border-border/60 rounded-xl transition-all outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/60 placeholder:text-muted-foreground/70"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1" />
        )}

        {/* Actions & Badges */}
        <div className="hidden sm:flex items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden xl:inline">Zero Data Stored</span>
            <span className="xl:hidden">Private</span>
          </div>

          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground/80 hover:text-foreground bg-card/60 hover:bg-muted/80 rounded-xl border border-border/60 transition-colors shadow-sm"
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Open Source</span>
          </a>

          <ThemeToggle />
        </div>

        {/* Mobile Toggle */}
        <div className="flex lg:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl border border-border text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border px-4 py-4 bg-background/95 backdrop-blur-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
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
                    "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                    isActive
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/40"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {onSearchChange && (
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search tools..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-muted border border-border rounded-xl outline-none"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>100% Client-Side Privacy</span>
            </div>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-foreground/80"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
