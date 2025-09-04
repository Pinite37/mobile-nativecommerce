
export interface Advertisement {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string; // URL
  imageBase64?: string; // For creation
  ctaLabel?: string;
  ctaUrl?: string;
  status: 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export interface CreateAdRequest {
  title: string;
  subtitle?: string;
  description?: string;
  imageBase64?: string; // base64 image
  ctaLabel?: string;
  ctaUrl?: string;
  durationDays?: number; // desired duration
}

// NOTE: Backend endpoints guessed; adjust when real API available.
class AdvertisementService {
  private readonly BASE_URL = '/enterprise/ads';
  private mockAds: Advertisement[] = [];

  async list(): Promise<Advertisement[]> {
    try {
      // Temporary mock (remove when real API ready)
      if (this.mockAds.length === 0) {
        this.mockAds = [
          {
            _id: 'mock-1',
            title: 'Boostez vos ventes',
            subtitle: 'Plus de visibilité',
            description: "Votre boutique devant des milliers de clients",
            image: 'https://via.placeholder.com/600x250/10B981/FFFFFF?text=Publicite',
            ctaLabel: 'En savoir plus',
            ctaUrl: 'https://example.com',
            status: 'ACTIVE',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now()+ 7*86400000).toISOString(),
            createdAt: new Date().toISOString()
          }
        ];
      }
      return Promise.resolve(this.mockAds);
      // const res = await ApiService.get<Advertisement[]>(`${this.BASE_URL}`);
      // return res.data || [];
    } catch (e:any) {
      console.warn('Ads list fallback (mock):', e.message);
      return this.mockAds;
    }
  }

  async create(ad: CreateAdRequest): Promise<Advertisement> {
    try {
      // const res = await ApiService.post<Advertisement>(`${this.BASE_URL}`, ad);
      // if (res.success && res.data) return res.data;
      const newAd: Advertisement = {
        _id: 'ad-' + Date.now(),
        title: ad.title,
        subtitle: ad.subtitle,
        description: ad.description,
        image: ad.imageBase64 ? `https://via.placeholder.com/600x250/34D399/FFFFFF?text=${encodeURIComponent(ad.title)}` : undefined,
        ctaLabel: ad.ctaLabel,
        ctaUrl: ad.ctaUrl,
        status: 'ACTIVE',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + (ad.durationDays || 7) * 86400000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      this.mockAds.unshift(newAd);
      return newAd;
    } catch (e:any) {
      throw new Error(e.response?.data?.message || 'Echec création publicité');
    }
  }

  async pause(adId: string) {
    this.mockAds = this.mockAds.map(a => a._id === adId ? { ...a, status: 'PAUSED'} : a);
  }

  async resume(adId: string) {
    this.mockAds = this.mockAds.map(a => a._id === adId ? { ...a, status: 'ACTIVE'} : a);
  }
}

export default new AdvertisementService();
