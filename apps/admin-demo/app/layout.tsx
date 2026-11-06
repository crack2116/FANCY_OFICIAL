import "./globals.css"
import { Inter, Fredoka } from "next/font/google"

const inter = { variable: "--font-sans" }
const fredoka = {
  variable: "--font-display",
  weights: ["500", "600", "700"],
}

export const metadata = {
  title: "Panel Fancy Pets",
  description: "Panel de administración Fancy Pets",
}

export default function RootLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <html
      lang="es-PE"
      data-mode="light"
      className={`${inter.variable} ${fredoka.variable}`}
    >
      <body className="font-sans antialiased">
        <main className="relative">{children}</main>
      </body>
    </html>
  )
}
