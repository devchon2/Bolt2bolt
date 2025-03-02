import { atom } from 'nanostores';

interface Preview {
  port: number;
  baseUrl: string;
}

export const workbenchStore = {
  previews: atom<Preview[]>([])
};