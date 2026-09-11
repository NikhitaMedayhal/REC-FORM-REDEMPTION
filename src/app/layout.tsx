import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "./_components/auth-context";

export const metadata: Metadata = {
  title: "recruit // the club",
  description:
    "Apply to join the club — a PESU-authenticated recruitment portal.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
