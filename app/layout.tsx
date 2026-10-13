import type { Metadata } from "next";
import BottomNav from "@/components/BottomNav";
import QuickChat from "@/components/QuickChat";
import ToastHost from "@/components/ToastHost";
import { ThemeProvider } from "@/components/ThemeSystem";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Medintel | Find care with confidence",
  description: "Explore care options, prepare for appointments, and connect with clinicians.",
};

// Applies the saved theme before first paint so the page never flashes the default theme.
const themeBootScript = `try{var d=document.documentElement,t=localStorage.getItem("medintel-theme"),m=localStorage.getItem("medintel-mode");if(t==="mint"||t==="sunset"||t==="midnight")d.dataset.theme=t;if(m==="light"||m==="dark")d.dataset.mode=m;else if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)d.dataset.mode="dark";}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootScript }} /></head>
      <body><ThemeProvider>{children}<QuickChat /><BottomNav /><ToastHost /></ThemeProvider></body>
    </html>
  );
}
