import ApiService from './ApiService';

export interface StatusItem {
  _id: string;
  enterprise: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  type: 'IMAGE' | 'TEXT' | 'IMAGE_TEXT';
  imageUrl?: string | null;
  text?: string | null;
  backgroundColor: string;
  textColor: string;
  expiresAt: string;
  viewedBy: { user: string; viewedAt: string }[];
  viewCount: number;
  viewed?: boolean;
  createdAt: string;
}

export interface StatusGroup {
  enterprise: StatusItem['enterprise'];
  statuses: StatusItem[];
  hasUnviewed: boolean;
}

export interface CreateStatusPayload {
  type: 'IMAGE' | 'TEXT' | 'IMAGE_TEXT';
  text?: string;
  imageBase64?: string;
  backgroundColor?: string;
  textColor?: string;
}

class StatusService {
  private readonly BASE = '/statuses';

  async getAll(): Promise<{ groups: StatusGroup[]; currentUserId: string }> {
    console.log('[StatusService] GET /statuses - récupération des statuts...');
    try {
      const res = await ApiService.get<{ groups: StatusGroup[]; currentUserId: string }>(this.BASE);
      console.log('[StatusService] ✅ Statuts reçus:', JSON.stringify({ groupCount: res.data?.groups?.length, currentUserId: res.data?.currentUserId }));
      return res.data;
    } catch (e: any) {
      console.error('[StatusService] ❌ getAll error:', e?.message, e?.response?.data);
      throw e;
    }
  }

  async getMine(): Promise<StatusItem[]> {
    console.log('[StatusService] GET /statuses/mine...');
    try {
      const res = await ApiService.get<StatusItem[]>(`${this.BASE}/mine`);
      console.log('[StatusService] ✅ Mes statuts:', res.data?.length);
      return res.data;
    } catch (e: any) {
      console.error('[StatusService] ❌ getMine error:', e?.message, e?.response?.data);
      throw e;
    }
  }

  async create(payload: CreateStatusPayload): Promise<StatusItem> {
    console.log('[StatusService] POST /statuses - création statut type:', payload.type);
    try {
      const res = await ApiService.post<StatusItem>(this.BASE, payload);
      console.log('[StatusService] ✅ Statut créé:', res.data?._id);
      return res.data;
    } catch (e: any) {
      console.error('[StatusService] ❌ create error:', e?.message, e?.response?.data);
      throw e;
    }
  }

  async markViewed(statusId: string): Promise<void> {
    console.log('[StatusService] POST view statusId:', statusId);
    try {
      await ApiService.post(`${this.BASE}/${statusId}/view`, {});
      console.log('[StatusService] ✅ Statut marqué vu');
    } catch (e: any) {
      console.warn('[StatusService] ⚠️ markViewed error:', e?.message);
    }
  }

  async remove(statusId: string): Promise<void> {
    console.log('[StatusService] DELETE statusId:', statusId);
    try {
      await ApiService.delete(`${this.BASE}/${statusId}`);
      console.log('[StatusService] ✅ Statut supprimé');
    } catch (e: any) {
      console.error('[StatusService] ❌ remove error:', e?.message, e?.response?.data);
      throw e;
    }
  }
}

export default new StatusService();
