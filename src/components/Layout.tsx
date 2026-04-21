import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-[100dvh] flex-col" style={{ background: "#F8FAFC" }}>
        <Navbar />
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-6">
          {children}
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}
