import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Navbar() {
  const { data: session, status } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              Bolt2bolt
            </Link>
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="hover:text-blue-200">
                Dashboard
              </Link>
              <Link href="/projects" className="hover:text-blue-200">
                Projets
              </Link>
              {session ? (
                <>
                  <Link href="/profile" className="hover:text-blue-200">
                    Profil
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-blue-100"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth/signin" className="bg-white text-blue-600 px-3 py-1 rounded hover:bg-blue-100">
                    Connexion
                  </Link>
                </>
              )}
            </div>
          </div>
          
          <div className="md:hidden">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="focus:outline-none">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
        </div>
        
        {isMenuOpen && (
          <div className="md:hidden py-4">
            <Link href="/dashboard" className="block py-2 hover:text-blue-200">
              Dashboard
            </Link>
            <Link href="/projects" className="block py-2 hover:text-blue-200">
              Projets
            </Link>
            {session ? (
              <>
                <Link href="/profile" className="block py-2 hover:text-blue-200">
                  Profil
                </Link>
                <button
                  onClick={() => signOut()}
                  className="block w-full text-left py-2 hover:text-blue-200"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="block py-2 hover:text-blue-200">
                  Connexion
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
