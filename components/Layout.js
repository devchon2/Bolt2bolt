import Head from 'next/head';
import Navbar from './Navbar';
import Footer from './Footer';
import { useSession } from 'next-auth/react';

export default function Layout({ children, title = 'Bolt2bolt' }) {
  const { data: session } = useSession();

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow container mx-auto px-4 py-6">
          {children}
        </main>
        <Footer />
      </div>
    </>
  );
}
