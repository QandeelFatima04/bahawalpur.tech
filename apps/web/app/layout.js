import "./globals.css";
import { AuthProvider } from "./_providers/AuthProvider";

export const metadata = {
  title: "CareerBridge AI",
  description: "Career intelligence and matching platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
