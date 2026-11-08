// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDocs,
  Unsubscribe
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  Property,
  Unit,
  Tenant,
  Contract,
  Invoice,
  Payment,
  PropertyExpense,
  JournalEntry,
  Account,
  InventoryItem,
  AuditLog
} from '../types';

/**
 * Check if real-time Firestore sync is enabled and active
 */
export const isFirestoreReady = (): boolean => {
  return isFirebaseConfigured() && !!db;
};

/**
 * Generic listener for a Firestore collection with real-time updates via onSnapshot
 */
export function subscribeToFirestoreCollection<T>(
  collectionName: string,
  onData: (items: T[]) => void,
  sortField?: string,
  sortDirection: 'asc' | 'desc' = 'desc'
): Unsubscribe | null {
  if (!isFirestoreReady() || !db) return null;

  try {
    const colRef = collection(db, collectionName);
    const q = sortField ? query(colRef, orderBy(sortField, sortDirection)) : colRef;

    return onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as unknown as T[];
        onData(items);
      },
      (error) => {
        console.warn(`[Firestore onSnapshot] Error on collection ${collectionName}:`, error);
      }
    );
  } catch (err) {
    console.error(`[Firestore Subscribe] Failed to subscribe to ${collectionName}:`, err);
    return null;
  }
}

/**
 * Save or create a document with specific ID (setDoc with merge)
 */
export async function syncSetDoc<T extends { id?: string }>(
  collectionName: string,
  docId: string,
  data: T
): Promise<boolean> {
  if (!isFirestoreReady() || !db) return false;
  try {
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
    return true;
  } catch (err) {
    console.error(`[Firestore setDoc] Error writing to ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Add a new document (auto-generated ID or preserved ID)
 */
export async function syncAddDoc<T extends Record<string, any>>(
  collectionName: string,
  data: T
): Promise<string | null> {
  if (!isFirestoreReady() || !db) return null;
  try {
    if (data.id) {
      await syncSetDoc(collectionName, data.id, data);
      return data.id;
    }
    const docRef = await addDoc(collection(db, collectionName), data);
    return docRef.id;
  } catch (err) {
    console.error(`[Firestore addDoc] Error creating in ${collectionName}:`, err);
    return null;
  }
}

/**
 * Update an existing document
 */
export async function syncUpdateDoc<T extends Record<string, any>>(
  collectionName: string,
  docId: string,
  updates: Partial<T>
): Promise<boolean> {
  if (!isFirestoreReady() || !db) return false;
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, updates as any);
    return true;
  } catch (err) {
    console.error(`[Firestore updateDoc] Error updating ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Production pure-data mode: No mock seeding to Firestore.
 * The application depends purely on Firestore real documents.
 */
export async function seedInitialFirestoreData(_initialData?: any): Promise<boolean> {
  return false;
}

