import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nexus CRM — Sovereign, Multi-Tenant CRM",
  description:
    "Production-grade, keyboard-first CRM with programmable architecture and consumer-grade simplicity.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Zero-FOWT inline blocking script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var mode = localStorage.getItem('nexus-theme-mode') || 'system';
                  var accent = localStorage.getItem('nexus-theme-accent') || 'indigo';
                  var density = localStorage.getItem('nexus-density') || 'comfortable';
                  var root = document.documentElement;
                  
                  if (mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    root.classList.add('dark');
                  } else if (mode === 'high-contrast') {
                    root.classList.add('high-contrast');
                  }
                  
                  root.setAttribute('data-accent', accent);
                  root.setAttribute('data-density', density);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
