import ApiService from './ApiService';

// Backend schema mapping
export interface Advertisement {
  _id: string;
  title: string;
  description: string;
  images: string[]; // Array of URLs served by backend (Cloudinary)
  type: 'PROMOTION' | 'EVENT' | 'ANNOUNCEMENT' | 'BANNER';
  targetAudience: 'ALL' | 'CLIENTS' | 'ENTERPRISES' | 'DELIVERS';
  startDate: string; // ISO
  endDate: string;   // ISO
  isActive: boolean;
  views?: number;
  clicks?: number;
  createdBy?: {
    enterprise: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface CreateAdvertisementPayload {
  title: string;
  description: string;
  imagesBase64: string[]; // Array of base64 images with data:image/... prefix
  type: Advertisement['type'];
  targetAudience?: Advertisement['targetAudience'];
  startDate: string; // ISO
  endDate: string;   // ISO
}

export interface EnterpriseAdvertisementListResponse {
  advertisements: Advertisement[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  }
}

class AdvertisementService {
  // All endpoints are under /api handled by ApiService baseURL
  private readonly BASE = '/advertisements';

  /** Create an advertisement */
  async create(data: CreateAdvertisementPayload): Promise<Advertisement> {
    const payload = {
      title: data.title.trim(),
      description: data.description.trim(),
      images: data.imagesBase64, // backend expects images array
      type: data.type,
      targetAudience: data.targetAudience || 'ALL',
      startDate: data.startDate,
      endDate: data.endDate,
    };

    const res = await ApiService.post<Advertisement>(`${this.BASE}/create`, payload);
    if ((res as any).success && (res as any).data) return (res as any).data;
    // Some backends return directly data
    return (res as any).data || (res as any);
  }

  /** List enterprise advertisements */
  async listMine(page = 1, limit = 20): Promise<EnterpriseAdvertisementListResponse> {
    const res = await ApiService.get<any>(`${this.BASE}/my-advertisements?page=${page}&limit=${limit}`);
    console.log('AdvertisementService.listMine', res.data.advertisements);
    if ((res as any).success && (res as any).data) return (res as any).data;
    return (res as any).data || { advertisements: [], pagination: { page: 1, limit, total: 0, pages: 0 } };
  }

  async getById(id: string): Promise<Advertisement> {
    const res = await ApiService.get<{ data: Advertisement }>(`${this.BASE}/${id}`);
    if ((res as any).success && (res as any).data) return (res as any).data;
    return (res as any).data || (res as any);
  }

  async deactivate(id: string): Promise<Advertisement> {
    const res = await ApiService.patch<any>(`${this.BASE}/${id}/deactivate`, {});
    return (res as any).data?.data || (res as any).data || (res as any);
  }

  async activate(id: string): Promise<Advertisement> {
    const res = await ApiService.patch<any>(`${this.BASE}/${id}/activate`, {});
    return (res as any).data?.data || (res as any).data || (res as any);
  }

  async delete(id: string): Promise<boolean> {
    const res = await ApiService.delete<any>(`${this.BASE}/${id}`);
    return !!(res as any).success;
  }

  /** Get active advertisements for current user audience (public) */
  async getActive(limit = 10): Promise<Advertisement[]> {
    const res = await ApiService.get<any>(`${this.BASE}/public/active?limit=${limit}`);
    console.log('AdvertisementService.getActive', res);
    if ((res as any).success && (res as any).data) return (res as any).data;
    return (res as any).data || (res as any).advertisements || [];
  }

  /** Get active advertisement by ID (public endpoint) */
  async getActiveAdvertisementById(id: string): Promise<Advertisement> {
    const res = await ApiService.get<{ data: Advertisement }>(`${this.BASE}/public/${id}`);
    if ((res as any).success && (res as any).data) return (res as any).data;
    return (res as any).data || (res as any);
  }

  /** Increment click count for advertisement */
  async incrementClick(id: string): Promise<number | undefined> {
    const res = await ApiService.post<any>(`${this.BASE}/${id}/click`, {});
    if ((res as any).success && (res as any).data?.data?.clicks != null) return (res as any).data.data.clicks;
    if ((res as any).data?.clicks != null) return (res as any).data.clicks;
    return (res as any).clicks;
  }
}

export default new AdvertisementService();
