import Layout from '../components/Layout';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export default function Home() {
  const { data: session } = useSession();

  return (
    <Layout title="Bolt2bolt - Accueil">
      <div className="text-center py-10">
        <h1 className="text-4xl font-bold mb-6">Bienvenue sur Bolt2bolt</h1>
        <p className="text-xl mb-8">Votre plateforme de gestion de projets simplifiée</p>
        
        {!session ? (
          <div className="flex flex-col md:flex-row justify-center gap-4 mt-8">
            <Link href="/auth/signin" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
              Se connecter
            </Link>
            <Link href="/auth/signup" className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition">
              S'inscrire
            </Link>
          </div>
        ) : (
          <Link href="/dashboard" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            Accéder au tableau de bord
          </Link>
        )}
        
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Gestion de projets</h2>
            <p>Créez et gérez facilement vos projets avec une interface intuitive.</p>
          </div>
          <div className="border p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Suivi des tâches</h2>
            <p>Suivez l'avancement de vos tâches et respectez vos délais.</p>
          </div>
          <div className="border p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Collaboration</h2>
            <p>Travaillez efficacement en équipe avec des outils collaboratifs.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
