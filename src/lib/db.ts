import { Recording } from '../types';

const DB_NAME = 'pointly_db';
const STORE_NAME = 'recordings';
const DB_VERSION = 1;

export interface DBRecording extends Recording {
  videoBlob: Blob;
}

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('IndexedDB failed to open:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveRecording(recording: Omit<DBRecording, 'videoUrl'> & { videoBlob: Blob }): Promise<DBRecording> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Save the recording
    const dbPayload = {
      ...recording,
      // videoUrl will be generated on retrieve by URL.createObjectURL
    };

    const request = store.put(dbPayload);

    request.onsuccess = () => {
      const videoUrl = URL.createObjectURL(recording.videoBlob);
      resolve({
        ...recording,
        videoUrl,
      });
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getAllRecordings(): Promise<DBRecording[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const recordings = request.result as (Omit<DBRecording, 'videoUrl'> & { videoBlob: Blob })[];
      
      // Map and create temporary objectURLs
      const mappedRecordings = recordings.map((rec) => {
        let videoUrl = '';
        try {
          videoUrl = URL.createObjectURL(rec.videoBlob);
        } catch (e) {
          console.error('Failed to create URL for recording:', rec.id, e);
        }
        return {
          ...rec,
          videoUrl,
        } as DBRecording;
      });

      // Sort by newest first
      mappedRecordings.sort((a, b) => b.createdAt - a.createdAt);
      resolve(mappedRecordings);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function updateRecordingName(id: string, name: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const data = getRequest.result;
      if (data) {
        data.name = name;
        const updateRequest = store.put(data);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        reject(new Error(`Recording with ID ${id} not found.`));
      }
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
}

export async function getStorageEstimate(): Promise<{ used: number; quota: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        quota: estimate.quota || 0,
      };
    } catch (e) {
      console.warn('Unable to retrieve storage estimate:', e);
    }
  }
  return { used: 0, quota: 1024 * 1024 * 500 }; // 500MB fallback guess
}
