import { getSession } from 'next-auth/react';
import clientPromise from '../../../lib/db';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ error: 'Non autorisé' });
  }
  
  const client = await clientPromise;
  const db = client.db();
  const projectsCollection = db.collection('projects');
  
  switch (req.method) {
    case 'GET':
      try {
        const projects = await projectsCollection
          .find({ userId: session.user.id })
          .sort({ createdAt: -1 })
          .toArray();
        
        res.status(200).json(projects);
      } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la récupération des projets' });
      }
      break;
      
    case 'POST':
      try {
        const { name, description, deadline } = req.body;
        
        if (!name) {
          return res.status(400).json({ error: 'Le nom du projet est requis' });
        }
        
        const newProject = {
          name,
          description: description || '',
          deadline: deadline || null,
          status: 'active',
          userId: session.user.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        const result = await projectsCollection.insertOne(newProject);
        
        res.status(201).json({
          _id: result.insertedId,
          ...newProject
        });
      } catch (error) {
        res.status(500).json({ error: 'Erreur lors de la création du projet' });
      }
      break;
      
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
