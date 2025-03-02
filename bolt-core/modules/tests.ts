export interface Test {
    id: string;
    name: string;
    execute: () => Promise<boolean>;
}

export const runTests = async (): Promise<boolean> => {
    return true;
};
