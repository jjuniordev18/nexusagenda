const DB_NAME = 'nexus-offline';
const DB_VERSION = 1;
const STORES = {
  tasks: 'tasks',
  categories: 'categories',
  syncQueue: 'syncQueue',
};

interface SyncQueueItem {
  id: number;
  action: 'create' | 'update' | 'delete';
  store: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.tasks)) {
          const taskStore = db.createObjectStore(STORES.tasks, { keyPath: 'id' });
          taskStore.createIndex('createdAt', 'createdAt', { unique: false });
          taskStore.createIndex('status', 'status', { unique: false });
          taskStore.createIndex('synced', 'synced', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.categories)) {
          const categoryStore = db.createObjectStore(STORES.categories, { keyPath: 'id' });
          categoryStore.createIndex('name', 'name', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.syncQueue)) {
          const syncStore = db.createObjectStore(STORES.syncQueue, { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
          syncStore.createIndex('synced', 'synced', { unique: false });
        }
      };
    });
  }

  // Tasks
  async saveTasks(tasks: any[]): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction(STORES.tasks, 'readwrite');
    const store = tx.objectStore(STORES.tasks);

    // Limpar tarefas antigas
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Salvar novas tarefas
    for (const task of tasks) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ ...task, synced: true });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getTasks(): Promise<any[]> {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.tasks, 'readonly');
      const store = tx.objectStore(STORES.tasks);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTask(task: any): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction(STORES.tasks, 'readwrite');
    const store = tx.objectStore(STORES.tasks);
    return new Promise((resolve, reject) => {
      const request = store.put({ ...task, synced: false });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction(STORES.tasks, 'readwrite');
    const store = tx.objectStore(STORES.tasks);
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Categories
  async saveCategories(categories: any[]): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction(STORES.categories, 'readwrite');
    const store = tx.objectStore(STORES.categories);

    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    for (const category of categories) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(category);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getCategories(): Promise<any[]> {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.categories, 'readonly');
      const store = tx.objectStore(STORES.categories);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Queue
  async addToSyncQueue(action: 'create' | 'update' | 'delete', store: string, data: any): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction(STORES.syncQueue, 'readwrite');
    const syncStore = tx.objectStore(STORES.syncQueue);
    const item: Omit<SyncQueueItem, 'id'> = {
      action,
      store,
      data,
      timestamp: Date.now(),
      synced: false,
    };
    return new Promise((resolve, reject) => {
      const request = syncStore.add(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    if (!this.db) return [];
    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.syncQueue, 'readonly');
      const store = tx.objectStore(STORES.syncQueue);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueue(): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction(STORES.syncQueue, 'readwrite');
    const store = tx.objectStore(STORES.syncQueue);
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async markAsSynced(id: number): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction(STORES.syncQueue, 'readwrite');
    const store = tx.objectStore(STORES.syncQueue);
    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.synced = true;
          const putRequest = store.put(item);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();
export type { SyncQueueItem };