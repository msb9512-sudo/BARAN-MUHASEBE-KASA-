import { getAccessToken } from './googleAuth';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  parents?: string[];
}

export const listDriveFiles = async (
  query = "trashed = false",
  pageSize = 30
): Promise<DriveFileItem[]> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Hesabı oturumu açık değil.');

  const params = new URLSearchParams({
    q: query,
    pageSize: String(pageSize),
    fields: 'files(id, name, mimeType, modifiedTime, size, webViewLink, iconLink, parents)',
    orderBy: 'modifiedTime desc',
  });

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Google Drive listeleme başarısız oldu (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
};

export const getOrCreateDriveFolder = async (folderName = 'Kasa & Vega Raporları'): Promise<string> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Hesabı oturumu açık değil.');

  // Search if folder already exists
  const q = `mimeType = 'application/vnd.google-apps.folder' and name = '${folderName}' and trashed = false`;
  const existing = await listDriveFiles(q, 1);
  if (existing && existing.length > 0) {
    return existing[0].id;
  }

  // Create folder
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Google Drive klasörü oluşturulamadı.');
  }

  const created = await res.json();
  return created.id;
};

export const uploadFileToDrive = async (
  fileName: string,
  content: string | Blob,
  mimeType: string,
  folderId?: string
): Promise<DriveFileItem> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Hesabı oturumu açık değil.');

  const metadata: any = {
    name: fileName,
    mimeType: mimeType,
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );

  const fileBlob = typeof content === 'string' ? new Blob([content], { type: mimeType }) : content;
  form.append('file', fileBlob);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink,modifiedTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Google Drive'a dosya yüklenemedi (${res.status})`);
  }

  return await res.json();
};

export const downloadDriveFile = async (fileId: string): Promise<Blob> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Hesabı oturumu açık değil.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Dosya indirilemedi.');
  }

  return await res.blob();
};

export const downloadDriveFileText = async (fileId: string): Promise<string> => {
  const blob = await downloadDriveFile(fileId);
  return await blob.text();
};

export const deleteDriveFile = async (fileId: string): Promise<boolean> => {
  const token = await getAccessToken();
  if (!token) throw new Error('Google Hesabı oturumu açık değil.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || 'Dosya Google Drive üzerinden silinemedi.');
  }

  return true;
};
