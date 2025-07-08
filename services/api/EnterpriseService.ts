import { User } from '../../types/auth';
import ApiService from './ApiService';

// Types pour l'API Enterprise
export interface EnterpriseProfile {
  user: User;
  enterprise: Enterprise;
}

export interface Enterprise {
  _id: string;
  user: string;
  companyName: string;
  logo: string;
  description: string;
  products: string[];
  socialLinks: SocialLink[];
  deliveryPartners: DeliveryPartner[];
  stats: EnterpriseStats;
  isActive: boolean;
  lastActiveDate: string;
  blockedUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface DeliveryPartner {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface EnterpriseStats {
  totalSales: number;
  totalOrders: number;
  averageRating: number;
  totalReviews: number;
}

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
  preferences?: any;
}

export interface UpdateEnterpriseInfoRequest {
  companyName?: string;
  description?: string;
  socialLinks?: SocialLink[];
}

export interface UpdateStatsRequest {
  totalSales?: number;
  totalOrders?: number;
  averageRating?: number;
  totalReviews?: number;
}

export interface AddDeliveryPartnerRequest {
  partnerId: string;
}

const USE_MOCK_API = false; // Toujours utiliser la vraie API

class EnterpriseService {
  private readonly BASE_URL = '/enterprise';

  // Récupérer le profil complet de l'entreprise
  async getProfile(): Promise<EnterpriseProfile> {
    try {
      if (USE_MOCK_API) {
        // Mock pour développement
        await new Promise(resolve => setTimeout(resolve, 800));
        
        return {
          user: {
            _id: 'mock-user-id',
            firstName: 'Jean',
            lastName: 'Dupont',
            email: 'jean.dupont@enterprise.com',
            phone: '+229 12345678',
            address: 'Cotonou, Bénin',
            role: 'ENTERPRISE',
            profileImage: 'https://via.placeholder.com/150x150/3B82F6/FFFFFF?text=JD',
            createdAt: new Date(),
            updatedAt: new Date(),
          } as User,
          enterprise: {
            _id: 'mock-enterprise-id',
            user: 'mock-user-id',
            companyName: 'Entreprise Test',
            logo: 'https://via.placeholder.com/150x150/FE8C00/FFFFFF?text=ET',
            description: 'Une entreprise de test pour le développement',
            products: [],
            socialLinks: [
              { platform: 'Facebook', url: 'https://facebook.com/entreprise-test' },
              { platform: 'Twitter', url: 'https://twitter.com/entreprise-test' }
            ],
            deliveryPartners: [],
            stats: {
              totalSales: 1250000,
              totalOrders: 85,
              averageRating: 4.3,
              totalReviews: 42
            },
            isActive: true,
            lastActiveDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        };
      }

      const response = await ApiService.get<EnterpriseProfile>(`${this.BASE_URL}/profile`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to get enterprise profile');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get enterprise profile');
    }
  }

  // Mettre à jour le profil utilisateur avec image
  async updateUserProfileWithImage(userData: UpdateUserProfileRequest, imageBase64?: string): Promise<User> {
    try {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockUser = {
          _id: 'mock-user-id',
          firstName: userData.firstName || 'Jean',
          lastName: userData.lastName || 'Dupont',
          email: 'jean.dupont@enterprise.com',
          phone: userData.phone || '+229 12345678',
          address: userData.address || 'Cotonou, Bénin',
          role: 'ENTERPRISE',
          profileImage: imageBase64 ? 'https://via.placeholder.com/150x150/3B82F6/FFFFFF?text=NEW' : 'https://via.placeholder.com/150x150/3B82F6/FFFFFF?text=JD',
          createdAt: new Date(),
          updatedAt: new Date(),
        } as User;
        
        return mockUser;
      }

      const updateData = {
        ...userData,
        ...(imageBase64 && {
          image: {
            base64: imageBase64,
            type: 'image/jpeg'
          }
        })
      };

      console.log('📤 Updating enterprise user profile:', updateData);

      const response = await ApiService.put<User>(`${this.BASE_URL}/profile/user`, updateData);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to update user profile');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update user profile');
    }
  }

  // Mettre à jour les informations de l'entreprise avec logo
  async updateEnterpriseInfoWithLogo(enterpriseData: UpdateEnterpriseInfoRequest, logoBase64?: string): Promise<Enterprise> {
    try {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockEnterprise = {
          _id: 'mock-enterprise-id',
          user: 'mock-user-id',
          companyName: enterpriseData.companyName || 'Entreprise Test',
          logo: logoBase64 ? 'https://via.placeholder.com/150x150/FE8C00/FFFFFF?text=NEW' : 'https://via.placeholder.com/150x150/FE8C00/FFFFFF?text=ET',
          description: enterpriseData.description || 'Une entreprise de test',
          products: [],
          socialLinks: enterpriseData.socialLinks || [],
          deliveryPartners: [],
          stats: {
            totalSales: 1250000,
            totalOrders: 85,
            averageRating: 4.3,
            totalReviews: 42
          },
          isActive: true,
          lastActiveDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return mockEnterprise;
      }

      const updateData = {
        ...enterpriseData,
        ...(logoBase64 && {
          logo: {
            base64: logoBase64,
            type: 'image/jpeg'
          }
        })
      };

      console.log('📤 Updating enterprise info:', updateData);

      const response = await ApiService.put<Enterprise>(`${this.BASE_URL}/profile/enterprise`, updateData);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to update enterprise info');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update enterprise info');
    }
  }

  // Mettre à jour les statistiques
  async updateStats(stats: UpdateStatsRequest): Promise<Enterprise> {
    try {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockEnterprise = {
          _id: 'mock-enterprise-id',
          user: 'mock-user-id',
          companyName: 'Entreprise Test',
          logo: 'https://via.placeholder.com/150x150/FE8C00/FFFFFF?text=ET',
          description: 'Une entreprise de test',
          products: [],
          socialLinks: [],
          deliveryPartners: [],
          stats: {
            totalSales: stats.totalSales || 1250000,
            totalOrders: stats.totalOrders || 85,
            averageRating: stats.averageRating || 4.3,
            totalReviews: stats.totalReviews || 42
          },
          isActive: true,
          lastActiveDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return mockEnterprise;
      }

      const response = await ApiService.put<Enterprise>(`${this.BASE_URL}/stats`, stats);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to update stats');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update stats');
    }
  }

  // Ajouter un partenaire de livraison
  async addDeliveryPartner(partnerId: string): Promise<Enterprise> {
    try {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockPartner = {
          _id: partnerId,
          firstName: 'Nouveau',
          lastName: 'Livreur',
          email: 'livreur@example.com',
          phone: '+229 98765432'
        };
        
        const mockEnterprise = {
          _id: 'mock-enterprise-id',
          user: 'mock-user-id',
          companyName: 'Entreprise Test',
          logo: 'https://via.placeholder.com/150x150/FE8C00/FFFFFF?text=ET',
          description: 'Une entreprise de test',
          products: [],
          socialLinks: [],
          deliveryPartners: [mockPartner],
          stats: {
            totalSales: 1250000,
            totalOrders: 85,
            averageRating: 4.3,
            totalReviews: 42
          },
          isActive: true,
          lastActiveDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return mockEnterprise;
      }

      const response = await ApiService.post<Enterprise>(`${this.BASE_URL}/delivery-partners`, { partnerId });
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to add delivery partner');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to add delivery partner');
    }
  }

  // Supprimer un partenaire de livraison
  async removeDeliveryPartner(partnerId: string): Promise<Enterprise> {
    try {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockEnterprise = {
          _id: 'mock-enterprise-id',
          user: 'mock-user-id',
          companyName: 'Entreprise Test',
          logo: 'https://via.placeholder.com/150x150/FE8C00/FFFFFF?text=ET',
          description: 'Une entreprise de test',
          products: [],
          socialLinks: [],
          deliveryPartners: [], // Partenaire supprimé
          stats: {
            totalSales: 1250000,
            totalOrders: 85,
            averageRating: 4.3,
            totalReviews: 42
          },
          isActive: true,
          lastActiveDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return mockEnterprise;
      }

      const response = await ApiService.delete<Enterprise>(`${this.BASE_URL}/delivery-partners/${partnerId}`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to remove delivery partner');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to remove delivery partner');
    }
  }

  // Activer/désactiver l'entreprise
  async toggleActiveStatus(): Promise<Enterprise> {
    try {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const mockEnterprise = {
          _id: 'mock-enterprise-id',
          user: 'mock-user-id',
          companyName: 'Entreprise Test',
          logo: 'https://via.placeholder.com/150x150/FE8C00/FFFFFF?text=ET',
          description: 'Une entreprise de test',
          products: [],
          socialLinks: [],
          deliveryPartners: [],
          stats: {
            totalSales: 1250000,
            totalOrders: 85,
            averageRating: 4.3,
            totalReviews: 42
          },
          isActive: false, // Statut changé
          lastActiveDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        return mockEnterprise;
      }

      const response = await ApiService.put<Enterprise>(`${this.BASE_URL}/toggle-status`, {});
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to toggle active status');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to toggle active status');
    }
  }
}

export default new EnterpriseService();
