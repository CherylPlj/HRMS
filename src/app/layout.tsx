import "./globals.css";
import { Poppins } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { SpeedInsights } from "@vercel/speed-insights/next";
import { metadata } from "./metadata";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap', // Add this for better font loading
});

export { metadata };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider 
      appearance={{
        baseTheme: undefined
      }}
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
          <link 
            rel="icon" 
            href="/favicon.ico"
          />
        </head>
        <body suppressHydrationWarning className={poppins.className}>
            {children}
          <div id="modal-root" />
        </body>
      </html>
    </ClerkProvider>
  );
}