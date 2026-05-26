export interface VFSTree {
	[key: string]: string | VFSTree;
}

export type VFSFiles = Map<string, string>;

type PendingAdds = Map<string, string>;

const FILE_LEAF = "";
const PROCESS_BUDGET_MS = 8;

export class VFS {
	private files: VFSFiles = new Map();
	private structureTree: VFSTree = {};

	private listeners = new Set<(version: number) => void>();
	private notifyScheduled = false;
	private dirty = false;
	private version = 0;

	private pendingAdds: PendingAdds = new Map();
	private processScheduled = false;

	subscribe(listener: (version: number) => void): () => void {
		this.listeners.add(listener);
		listener(this.version);

		return () => {
			this.listeners.delete(listener);
		};
	}

	private scheduleNotify(): void {
		this.dirty = true;

		if (this.notifyScheduled) {
			return;
		}

		this.notifyScheduled = true;

		requestAnimationFrame(() => {
			this.notifyScheduled = false;

			if (!this.dirty) {
				return;
			}

			this.dirty = false;
			this.version++;

			for (const fn of this.listeners) {
				fn(this.version);
			}
		});
	}

	private decodeContent(content: string): string {
		try {
			return atob(content);
		} catch {
			return content;
		}
	}

	private resolvePath(path: string, content: string): string | null {
		let candidate = path;

		while (this.files.has(candidate)) {
			const existing = this.files.get(candidate);

			if (existing === content) {
				return null;
			}

			candidate = candidate + "_";
		}

		return candidate;
	}

	private normalizeParts(path: string): string[] {
		return path.replace(/\\/g, "/").split("/").filter((p) => p.length > 0);
	}

	private structureInsert(path: string): void {
		const pathParts = this.normalizeParts(path);

		if (pathParts.length === 0) {
			return;
		}

		let current = this.structureTree;

		for (let i = 0; i < pathParts.length; i++) {
			const part = pathParts[i];
			const isLast = i === pathParts.length - 1;

			if (isLast) {
				current[part] = FILE_LEAF;
			} else {
				const existing = current[part];

				if (existing === undefined || typeof existing === "string") {
					current[part] = {};
				}

				current = current[part] as VFSTree;
			}
		}
	}

	private structureRemove(path: string): void {
		const pathParts = this.normalizeParts(path);

		if (pathParts.length === 0) {
			return;
		}

		const stack: { parent: VFSTree; key: string }[] = [];
		let current = this.structureTree;

		for (let i = 0; i < pathParts.length - 1; i++) {
			const part = pathParts[i];
			const node = current[part];

			if (node === undefined || typeof node === "string") {
				return;
			}

			stack.push({ parent: current, key: part });

			current = node as VFSTree;
		}

		const leafKey = pathParts[pathParts.length - 1];

		if (!(leafKey in current)) {
			return;
		}

		delete current[leafKey];

		for (let i = stack.length - 1; i >= 0; i--) {
			const { parent, key } = stack[i];
			const node = parent[key];

			if (
				typeof node === "object" &&
				node !== null &&
				Object.keys(node).length === 0
			) {
				delete parent[key];
			} else {
				break;
			}
		}
	}

	private applyAdd(path: string, rawContent: string): boolean {
		const content = this.decodeContent(String(rawContent));
		const targetPath = this.resolvePath(path, content);

		if (targetPath === null) {
			return false;
		}

		this.files.set(targetPath, content);
		this.structureInsert(targetPath);

		return true;
	}

	private processPendingAdds(deadline?: IdleDeadline): void {
		const start = performance.now();

		const idleBudget =
			deadline && deadline.timeRemaining() > 0
				? deadline.timeRemaining()
				: PROCESS_BUDGET_MS;

		const budget = Math.min(idleBudget, PROCESS_BUDGET_MS);
		let changed = false;

		for (const [path, rawContent] of this.pendingAdds) {
			if (performance.now() - start >= budget) {
				break;
			}

			this.pendingAdds.delete(path);

			if (this.applyAdd(path, rawContent)) {
				changed = true;
			}
		}

		if (changed) {
			this.scheduleNotify();
		}

		if (this.pendingAdds.size > 0) {
			this.scheduleProcessQueue();
		} else {
			this.processScheduled = false;

			if (this.pendingAdds.size > 0) {
				this.processScheduled = true;
				this.scheduleProcessQueue();
			}
		}
	}

	private scheduleProcessQueue(): void {
		if (typeof requestIdleCallback !== "undefined") {
			requestIdleCallback((deadline) => this.processPendingAdds(deadline), {
				timeout: 100,
			});

			return;
		}

		requestAnimationFrame(() => this.processPendingAdds());
	}

	private enqueueProcess(): void {
		if (this.processScheduled) {
			return;
		}

		this.processScheduled = true;

		this.scheduleProcessQueue();
	}

	add(path: string, content: string | number): void {
		this.pendingAdds.set(path, String(content));
		this.enqueueProcess();
	}

	get(path: string): string | undefined {
		return this.files.get(path);
	}

	has(path: string): boolean {
		return this.files.has(path);
	}

	remove(path: string): boolean {
		const existed = this.files.delete(path);

		if (existed) {
			this.structureRemove(path);
			this.scheduleNotify();
		}

		return existed;
	}

	getAllPaths(): string[] {
		return Array.from(this.files.keys());
	}

	getStructure(): VFSTree {
		return this.structureTree;
	}

	getVersion(): number {
		return this.version;
	}

	getAll(): VFSTree {
		const treeResult: VFSTree = {};

		for (const [path, content] of this.files.entries()) {
			const pathParts = this.normalizeParts(path);
			let current = treeResult;

			for (let i = 0; i < pathParts.length; i++) {
				const part = pathParts[i];
				const isLast = i === pathParts.length - 1;

				if (isLast) {
					current[part] = content;
				} else {
					const next = current[part];

					if (!next || typeof next !== "object") {
						current[part] = {};
					}
					current = current[part] as VFSTree;
				}
			}
		}

		return treeResult;
	}

	clear(): void {
		if (this.files.size === 0 && this.pendingAdds.size === 0) {
			return;
		}

		this.pendingAdds.clear();
		this.processScheduled = false;
		this.files.clear();
		this.structureTree = {};
		this.scheduleNotify();
	}

	size(): number {
		return this.files.size;
	}

	pendingCount(): number {
		return this.pendingAdds.size;
	}
}
