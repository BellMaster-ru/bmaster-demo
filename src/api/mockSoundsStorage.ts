const DB_NAME = 'bmaster-mock-db';
const DB_VERSION = 1;
const SOUNDS_STORE = 'sounds';

export type StoredSoundBlob = {
	name: string;
	blob: Blob;
	size: number;
	mime: string;
	duration?: number;
	updated_at: number;
};

const canUseIndexedDb = () =>
	typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';

const openDatabase = async (): Promise<IDBDatabase | null> => {
	if (!canUseIndexedDb()) {
		return null;
	}

	return new Promise((resolve, reject) => {
		const request = window.indexedDB.open(DB_NAME, DB_VERSION);

		request.onupgradeneeded = () => {
			const db = request.result;
			if (!db.objectStoreNames.contains(SOUNDS_STORE)) {
				db.createObjectStore(SOUNDS_STORE, { keyPath: 'name' });
			}
		};

		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error || new Error('Failed to open DB'));
	});
};

const withStore = async <T>(
	mode: IDBTransactionMode,
	runner: (store: IDBObjectStore) => Promise<T>
): Promise<T> => {
	const db = await openDatabase();
	if (!db) {
		throw new Error('IndexedDB is not available');
	}

	try {
		const tx = db.transaction(SOUNDS_STORE, mode);
		const store = tx.objectStore(SOUNDS_STORE);
		const result = await runner(store);
		await new Promise<void>((resolve, reject) => {
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error || new Error('DB transaction failed'));
			tx.onabort = () => reject(tx.error || new Error('DB transaction aborted'));
		});
		return result;
	} finally {
		db.close();
	}
};

const requestToPromise = <T>(request: IDBRequest<T>) =>
	new Promise<T>((resolve, reject) => {
		request.onsuccess = () => resolve(request.result);
		request.onerror = () =>
			reject(request.error || new Error('IndexedDB request failed'));
	});

export const putSoundBlob = async (record: StoredSoundBlob): Promise<void> => {
	await withStore('readwrite', async (store) => {
		await requestToPromise(store.put(record));
	});
};

export const getSoundBlobRecord = async (
	name: string
): Promise<StoredSoundBlob | undefined> => {
	return await withStore('readonly', async (store) => {
		const result = await requestToPromise<StoredSoundBlob | undefined>(
			store.get(name)
		);
		return result;
	});
};

export const deleteSoundBlob = async (name: string): Promise<void> => {
	await withStore('readwrite', async (store) => {
		await requestToPromise(store.delete(name));
	});
};

export const clearSoundBlobStore = async (): Promise<void> => {
	if (!canUseIndexedDb()) {
		return;
	}

	await withStore('readwrite', async (store) => {
		await requestToPromise(store.clear());
	});
};
