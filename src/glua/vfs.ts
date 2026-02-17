export interface VFSTree {
    [key: string]: string | VFSTree;
}

export type VFSFiles = Map<string, string>;

export class VFS {
    private files: VFSFiles = new Map();

    add(path: string, content: string): void {
        this.files.set(path, content);
    }

    get(path: string): string | undefined {
        return this.files.get(path);
    }

    has(path: string): boolean {
        return this.files.has(path);
    }

    remove(path: string): boolean {
        return this.files.delete(path);
    }

    getAllPaths(): string[] {
        return Array.from(this.files.keys());
    }

    getAll(): VFSTree {
        const treeResult: VFSTree = {};

        for (const [path, content] of this.files.entries()) {
            const normalizedPath = path.replace(/\\/g, "/");
            const pathParts = normalizedPath
                .split("/")
                .filter((part) => part.length > 0);
            let current = treeResult;

            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                const isLast = i === pathParts.length - 1;

                if (isLast) {
                    current[part] = content;
                } else {
                    if (!current[part] || typeof current[part] !== "object") {
                        current[part] = {};
                    }

                    current = current[part];
                }
            }
        }

        return treeResult;
    }

    clear(): void {
        this.files.clear();
    }

    size(): number {
        return this.files.size;
    }
}
