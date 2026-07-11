import { Logo } from "@/components/logo";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-secondary/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <div className="flex items-center gap-3">
          <Logo />
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Satoshi53
        </p>
      </div>
    </footer>
  );
}
