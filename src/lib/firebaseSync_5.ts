import { 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc, 
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Employee } from '../types';

// Collection Names
const EMPLOYEES_COLLECTION = 'employees';
const DIRECTIVES_COLLECTION = 'directives';
const CONFIG_DOC_PATH = 'config/app_state';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively cleans any object by removing keys with 'undefined' values,
 * which is required because Firestore throws an error if any field is 'undefined'.
 */
function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;
  return JSON.parse(JSON.stringify(obj)) as T;
}

/**
 * Pushes a single employee to Firestore
 */
export async function pushEmployeeToFirestore(employee: Employee): Promise<void> {
  if (!employee.id) return;
  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, employee.id);
    const sanitized = sanitizeForFirestore(employee);
    await setDoc(docRef, sanitized, { merge: true });
    console.log(`Saved employee ${employee.id} to Firestore`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${EMPLOYEES_COLLECTION}/${employee.id}`);
  }
}

/**
 * Pushes multiple employees to Firestore in batches (and removes deleted ones)
 */
export async function pushAllEmployeesToFirestore(employees: Employee[]): Promise<void> {
  try {
    const currentSnapshot = await getDocs(collection(db, EMPLOYEES_COLLECTION));
    const activeIds = new Set(employees.map(emp => emp.id).filter(Boolean));
    
    // We will do chunked batch writes to stay well below the Firestore 500 operations limit.
    let batch = writeBatch(db);
    let operationCount = 0;
    const batchSize = 200; // Safe chunk size
    
    // 1. Save/Update current employees
    for (const emp of employees) {
      if (emp.id) {
        const docRef = doc(db, EMPLOYEES_COLLECTION, emp.id);
        const sanitized = sanitizeForFirestore(emp);
        batch.set(docRef, sanitized);
        operationCount++;
        
        if (operationCount >= batchSize) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }
    }
    
    // 2. Delete any employee documents that are no longer in the state array
    let deletedCount = 0;
    for (const docSnap of currentSnapshot.docs) {
      const docId = docSnap.id;
      if (!activeIds.has(docId)) {
        const docRef = doc(db, EMPLOYEES_COLLECTION, docId);
        batch.delete(docRef);
        operationCount++;
        deletedCount++;
        
        if (operationCount >= batchSize) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }
    }
    
    // Commit any remaining operations in the last batch
    if (operationCount > 0) {
      await batch.commit();
    }
    
    console.log(`Successfully chunk-saved ${employees.length} employees and deleted ${deletedCount} stale employees from Firestore`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, EMPLOYEES_COLLECTION);
  }
}

/**
 * Fetches all employees from Firestore
 */
export async function fetchEmployeesFromFirestore(): Promise<Employee[]> {
  try {
    const querySnapshot = await getDocs(collection(db, EMPLOYEES_COLLECTION));
    const employees: Employee[] = [];
    querySnapshot.forEach((docSnapshot) => {
      employees.push(docSnapshot.data() as Employee);
    });
    return employees;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, EMPLOYEES_COLLECTION);
    return [];
  }
}

/**
 * Deletes a single employee from Firestore
 */
export async function deleteEmployeeFromFirestore(id: string): Promise<void> {
  try {
    const docRef = doc(db, EMPLOYEES_COLLECTION, id);
    await deleteDoc(docRef);
    console.log(`Deleted employee ${id} from Firestore`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${EMPLOYEES_COLLECTION}/${id}`);
  }
}

/**
 * Deletes all employees except specified ones (like admin)
 */
export async function clearAllEmployeesExceptAdmin(keepIds: string[]): Promise<void> {
  try {
    const currentEmployees = await fetchEmployeesFromFirestore();
    let batch = writeBatch(db);
    let operationCount = 0;
    const batchSize = 200;
    let deletedCount = 0;
    
    for (const emp of currentEmployees) {
      if (!keepIds.includes(emp.id)) {
        const docRef = doc(db, EMPLOYEES_COLLECTION, emp.id);
        batch.delete(docRef);
        operationCount++;
        deletedCount++;
        
        if (operationCount >= batchSize) {
          await batch.commit();
          batch = writeBatch(db);
          operationCount = 0;
        }
      }
    }
    
    if (operationCount > 0) {
      await batch.commit();
    }
    
    console.log(`Cleared ${deletedCount} employees from Firestore`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, EMPLOYEES_COLLECTION);
  }
}

/**
 * Saves directives list to Firestore
 */
export async function saveDirectivesToFirestore(directives: any[]): Promise<void> {
  try {
    const docRef = doc(db, DIRECTIVES_COLLECTION, 'all_directives');
    const sanitized = sanitizeForFirestore({ list: directives });
    await setDoc(docRef, sanitized);
    console.log('Saved directives to Firestore');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DIRECTIVES_COLLECTION}/all_directives`);
  }
}

/**
 * Fetches directives from Firestore
 */
export async function fetchDirectivesFromFirestore(): Promise<any[]> {
  try {
    const docRef = doc(db, DIRECTIVES_COLLECTION, 'all_directives');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().list || [];
    }
    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${DIRECTIVES_COLLECTION}/all_directives`);
    return [];
  }
}

/**
 * Saves app configuration to Firestore (lock state, departments, units)
 */
export async function saveConfigToFirestore(
  isQuarterLocked: boolean,
  departments: string[],
  units: string[]
): Promise<void> {
  try {
    const docRef = doc(db, CONFIG_DOC_PATH);
    const payload = {
      isQuarterLocked,
      departments,
      units,
      updatedAt: new Date().toISOString()
    };
    const sanitized = sanitizeForFirestore(payload);
    await setDoc(docRef, sanitized, { merge: true });
    console.log('Saved config and metadata to Firestore');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, CONFIG_DOC_PATH);
  }
}

/**
 * Fetches app configuration from Firestore
 */
export async function fetchConfigFromFirestore(): Promise<{
  isQuarterLocked?: boolean;
  departments?: string[];
  units?: string[];
} | null> {
  try {
    const docRef = doc(db, CONFIG_DOC_PATH);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as any;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, CONFIG_DOC_PATH);
    return null;
  }
}
