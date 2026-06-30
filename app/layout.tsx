import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NutriTrack — Calorie & Nutrition Tracker',
  description: 'Track your calories, macros, vitamins, and minerals. Visualize your health journey.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
