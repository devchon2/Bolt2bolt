import * as isomorphicGit from 'isomorphic-git';
import * as fs from 'fs';
import { execa } from 'execa';
import { Environment } from './types';

/**
 * Détecte l'environnement d'exécution actuel
 * @returns {'isolated'|'native'} Le type d'environnement
 */
export const detectGitEnvironment = async (): Promise<'isolated'|'native'> => {
  try {
    // Vérifier si on est dans un WebContainer ou un environnement isolé
    if (typeof window !== 'undefined' && window.hasOwnProperty('webContainerInstance')) {
      return 'isolated';
    }
    
    // Tester si git est disponible nativement
    await execa('git', ['--version']);
    return 'native';
  } catch (error) {
    // Si git n'est pas disponible nativement ou une autre erreur
    return 'isolated';
  }
};

/**
 * Interface commune pour les opérations Git
 */
export interface GitInterface {
  clone: (url: string, dir: string, options?: any) => Promise<void>;
  add: (dir: string, filepath: string) => Promise<void>;
  commit: (dir: string, message: string) => Promise<string>;
  push: (dir: string, options?: any) => Promise<void>;
  pull: (dir: string) => Promise<void>;
  checkout: (dir: string, ref: string, options?: any) => Promise<void>;
  status: (dir: string) => Promise<any>;
}

/**
 * Implémentation Git native
 */
class NativeGit implements GitInterface {
  async clone(url: string, dir: string, options: any = {}): Promise<void> {
    const args = ['clone', url, dir];
    if (options.depth) args.push('--depth', options.depth.toString());
    if (options.branch) args.push('--branch', options.branch);
    await execa('git', args);
  }
  
  async add(dir: string, filepath: string): Promise<void> {
    await execa('git', ['add', filepath], { cwd: dir });
  }
  
  async commit(dir: string, message: string): Promise<string> {
    const { stdout } = await execa('git', ['commit', '-m', message], { cwd: dir });
    return stdout;
  }
  
  async push(dir: string, options: any = {}): Promise<void> {
    const args = ['push'];
    if (options.remote) args.push(options.remote);
    if (options.branch) args.push(options.branch);
    await execa('git', args, { cwd: dir });
  }
  
  async pull(dir: string): Promise<void> {
    await execa('git', ['pull'], { cwd: dir });
  }
  
  async checkout(dir: string, ref: string, options: any = {}): Promise<void> {
    const args = ['checkout', ref];
    if (options.create) args.push('-b');
    await execa('git', args, { cwd: dir });
  }
  
  async status(dir: string): Promise<any> {
    const { stdout } = await execa('git', ['status', '--porcelain'], { cwd: dir });
    // Parser la sortie pour retourner un format similaire à isomorphic-git
    const files = stdout.split('\n').filter(Boolean).map(line => {
      const status = line.substring(0, 2).trim();
      const filepath = line.substring(3);
      
      return {
        filepath,
        staged: status[0] !== ' ' && status[0] !== '?',
        modified: status[1] === 'M' || status[0] === 'M',
        untracked: status[0] === '?'
      };
    });
    
    return { files };
  }
}

/**
 * Implémentation Isomorphic Git
 */
class IsomorphicGitAdapter implements GitInterface {
  async clone(url: string, dir: string, options: any = {}): Promise<void> {
    await isomorphicGit.clone({
      fs,
      http: require('isomorphic-git/http/web'),
      url,
      dir,
      depth: options.depth,
      ref: options.branch,
      singleBranch: !!options.branch
    });
  }
  
  async add(dir: string, filepath: string): Promise<void> {
    await isomorphicGit.add({ fs, dir, filepath });
  }
  
  async commit(dir: string, message: string): Promise<string> {
    const { oid } = await isomorphicGit.commit({
      fs,
      dir,
      message,
      author: {
        name: 'Bolt Optimizer',
        email: 'bot@bolt.diy'
      }
    });
    return oid;
  }
  
  async push(dir: string, options: any = {}): Promise<void> {
    await isomorphicGit.push({
      fs,
      http: require('isomorphic-git/http/web'),
      dir,
      remote: options.remote || 'origin',
      ref: options.branch || 'main',
      onAuth: () => ({ username: process.env.GIT_USERNAME, password: process.env.GIT_TOKEN })
    });
  }
  
  async pull(dir: string): Promise<void> {
    await isomorphicGit.pull({
      fs,
      http: require('isomorphic-git/http/web'),
      dir,
      author: {
        name: 'Bolt Optimizer',
        email: 'bot@bolt.diy'
      }
    });
  }
  
  async checkout(dir: string, ref: string, options: any = {}): Promise<void> {
    await isomorphicGit.checkout({
      fs,
      dir,
      ref,
      force: options.force,
      noUpdateHead: options.detached
    });
  }
  
  async status(dir: string): Promise<any> {
    return isomorphicGit.statusMatrix({ fs, dir });
  }
}

/**
 * Fournit l'implémentation Git appropriée selon l'environnement
 * @param env Environnement d'exécution
 * @returns L'implémentation Git adaptée
 */
export const getGitImplementation = async (): Promise<GitInterface> => {
  const env = await detectGitEnvironment();
  return env === 'isolated' ? new IsomorphicGitAdapter() : new NativeGit();
};

// Export pour compatibilité avec le code mentionné dans le document
export const git = async (env?: Environment): Promise<GitInterface> => {
  if (env) {
    return env === 'isolated' ? new IsomorphicGitAdapter() : new NativeGit();
  }
  return getGitImplementation();
};

export default git;
