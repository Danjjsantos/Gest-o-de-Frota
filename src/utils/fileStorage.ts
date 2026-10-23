// src/utils/fileStorage.ts
// Bulletproof persistent storage using native IndexedDB with safe LocalStorage fallback
// Prevents QuotaExceededError when saving vehicle equipments, PDF certificates, and document attachments

const DB_NAME = 'gestao_frotas_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'fleet_data';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const getDeletedIds = (key: string): Set<string> => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch {
    return new Set();
  }
};

export async function saveVehiclesToIdb(vehicles: any[]): Promise<void> {
  try {
    const deletedVehIds = getDeletedIds('gestao_frotas_deleted_vehicle_ids');
    const deletedAttIds = getDeletedIds('gestao_frotas_deleted_attachment_ids');
    const deletedEqIds = getDeletedIds('gestao_frotas_deleted_equipment_ids');

    const cleanVehicles = vehicles
      .filter(v => !deletedVehIds.has(v.id))
      .map(v => ({
        ...v,
        attachments: (v.attachments || []).filter((a: any) => !deletedAttIds.has(a.id)),
        equipments: (v.equipments || []).filter((e: any) => !deletedEqIds.has(e.id)),
      }));

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(cleanVehicles, 'vehicles');

      // Save dedicated attachments map only for non-deleted attachments
      const attMap: Record<string, any[]> = {};
      cleanVehicles.forEach(v => {
        if (Array.isArray(v.attachments) && v.attachments.length > 0) {
          attMap[v.id] = v.attachments;
        }
      });
      store.put(attMap, 'attachments_map');

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.debug('IndexedDB saveVehicles notice:', err);
  }
}

export async function loadVehiclesFromIdb(): Promise<any[] | null> {
  try {
    const deletedVehIds = getDeletedIds('gestao_frotas_deleted_vehicle_ids');
    const deletedAttIds = getDeletedIds('gestao_frotas_deleted_attachment_ids');
    const deletedEqIds = getDeletedIds('gestao_frotas_deleted_equipment_ids');

    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const reqVehicles = store.get('vehicles');
      const reqAtts = store.get('attachments_map');

      tx.oncomplete = () => {
        const rawVehicles = Array.isArray(reqVehicles.result) ? reqVehicles.result : null;
        const attsMap = reqAtts.result || {};

        if (!rawVehicles) {
          resolve(null);
          return;
        }

        // Filter out deleted vehicles
        const vehicles = rawVehicles.filter(v => !deletedVehIds.has(v.id));

        // Enrich existing attachments with missing dataUrls from attsMap, never resurrect deleted ones
        const enriched = vehicles.map(v => {
          const backedUpAtts = attsMap[v.id] || [];
          const currentAtts = (v.attachments || []).filter((a: any) => !deletedAttIds.has(a.id));

          const enrichedAtts = currentAtts.map((a: any) => {
            const b = backedUpAtts.find((ba: any) => ba.id === a.id);
            return {
              ...a,
              ...(b || {}),
              dataUrl: (a.dataUrl && a.dataUrl.length > 0) ? a.dataUrl : (b?.dataUrl || ''),
            };
          });

          const currentEqs = (v.equipments || []).filter((e: any) => !deletedEqIds.has(e.id));

          return {
            ...v,
            attachments: enrichedAtts,
            equipments: currentEqs,
          };
        });

        resolve(enriched);
      };

      tx.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Safely saves vehicles to localStorage with fallback for quota exceeded
 */
export function safeSaveVehiclesToLocalStorage(vehicles: any[]): void {
  try {
    localStorage.setItem('gestao_frotas_vehicles', JSON.stringify(vehicles));
  } catch (err) {
    console.warn('LocalStorage quota exceeded, saving lightweight version to localStorage and keeping full files in IndexedDB:', err);
    try {
      // Strip base64 payloads exceeding 25KB for localStorage fallback (the full files remain preserved in IndexedDB)
      const lightweight = vehicles.map(v => ({
        ...v,
        attachments: (v.attachments || []).map((a: any) => ({
          ...a,
          dataUrl: (a.dataUrl && a.dataUrl.length > 25000) ? '' : a.dataUrl
        })),
        equipments: (v.equipments || []).map((e: any) => ({
          ...e,
          fileUrl: (e.fileUrl && e.fileUrl.length > 25000) ? '' : e.fileUrl,
          dataUrl: (e.dataUrl && e.dataUrl.length > 25000) ? '' : e.dataUrl,
        })),
        documents: Object.fromEntries(
          Object.entries(v.documents || {}).map(([k, d]: [string, any]) => [
            k,
            d ? { ...d, fileUrl: (d.fileUrl && d.fileUrl.length > 25000) ? '' : d.fileUrl } : null
          ])
        )
      }));
      localStorage.setItem('gestao_frotas_vehicles', JSON.stringify(lightweight));
    } catch (fallbackErr) {
      console.debug('Failed to save to localStorage fallback:', fallbackErr);
    }
  }

  // Always save a dedicated equipments map backup so equipments are never lost
  try {
    const equipmentMap: Record<string, any[]> = {};
    vehicles.forEach(v => {
      if (v.equipments && v.equipments.length > 0) {
        equipmentMap[v.id] = v.equipments;
      }
    });
    localStorage.setItem('gestao_frotas_equipments_backup', JSON.stringify(equipmentMap));
  } catch {}
}

