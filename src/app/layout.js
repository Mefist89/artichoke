import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'PLAY ROOM ARTICHOKE',
  description: 'PLAY ROOM ARTICHOKE - cafenea locală cu băuturi artizanale, deserturi, rezervări online și spațiu de joacă pentru copii de până la 6 ani.',
  keywords: 'PLAY ROOM ARTICHOKE, cafenea, rezervari, meniu, deserturi, contact, spațiu de joacă, copii până la 6 ani',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <head>
        <link rel="icon" type="image/svg+xml" href="/img/favicon.svg" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Comfortaa:wght@300;400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
