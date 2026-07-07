import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CalorieCanvas — Calorie & Nutrition Tracker',
  description: 'Track your calories, macros, vitamins, and minerals. Visualize your health journey.',
  themeColor: '#0a0e1a',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'CalorieCanvas' },
  viewport: { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  )
}
