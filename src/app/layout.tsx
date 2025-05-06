import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // Specify font weights
});

export const metadata: Metadata = {
  title: "SJSFI - HRMS",
  icons: { icon: "/sjsfilogo.png" },
  keywords: ["HRMS", "SJSFI", "Human Resource Management System"],
  authors: [{ name: "Saint Joseph School of Fairview, Inc." }],
  creator: "Saint Joseph School of Fairview, Inc.",
  publisher: "Saint Joseph School of Fairview, Inc.",
  description: "Human Resource Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log("Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log("Supabase ANON KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <html lang="en" className={poppins.className}>
      <head>
        {/* Move external links and scripts to <head> */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.3/css/all.min.css"
        />
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body>{children}</body>
    </html>
  );
}