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
  contactInfo: {
    email: string;
    phone: string;
    whatsapp?: string;
    website?: string;
  };
  logo: string;
  description: string;
  products: string[];
  socialLinks: SocialLink[];
  deliveryPartners: DeliveryPartner[];
  stats: EnterpriseStats;
  location: {
    city: string;
    district: string;
  };
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
  location?: {
    city: string;
    district: string;
  };
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
            contactInfo: {
              email: 'contact@entreprise-test.com',
              phone: '+229 12345678',
              whatsapp: '+229 12345678',
              website: 'https://entreprise-test.com'
            },
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
            location: {
              city: 'Cotonou',
              district: 'Fidjrossè'
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
          contactInfo: {
            email: 'contact@entreprise-test.com',
            phone: '+229 12345678',
            whatsapp: '+229 12345678',
            website: 'https://entreprise-test.com'
          },
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
          location: {
            city: 'Cotonou',
            district: 'Fidjrossè'
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
          contactInfo: {
            email: 'contact@entreprise-test.com',
            phone: '+229 12345678',
            whatsapp: '+229 12345678',
            website: 'https://entreprise-test.com'
          },
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
          location: {
            city: 'Cotonou',
            district: 'Fidjrossè'
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
          contactInfo: {
            email: 'contact@entreprise-test.com',
            phone: '+229 12345678',
            whatsapp: '+229 12345678',
            website: 'https://entreprise-test.com'
          },
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
          location: {
            city: 'Cotonou',
            district: 'Fidjrossè'
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
          contactInfo: {
            email: 'contact@entreprise-test.com',
            phone: '+229 12345678',
            whatsapp: '+229 12345678',
            website: 'https://entreprise-test.com'
          },
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
          location: {
            city: 'Cotonou',
            district: 'Fidjrossè'
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
          contactInfo: {
            email: 'contact@entreprise-test.com',
            phone: '+229 12345678',
            whatsapp: '+229 12345678',
            website: 'https://entreprise-test.com'
          },
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
          location: {
            city: 'Cotonou',
            district: 'Fidjrossè'
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

  /**
   * Récupérer les informations publiques d'une entreprise par son ID
   */
  async getPublicEnterpriseById(enterpriseId: string): Promise<Enterprise> {
    try {
      console.log('🔄 ENTERPRISE SERVICE - Récupération entreprise publique:', enterpriseId);
      
      const response = await ApiService.get<Enterprise>(`${this.BASE_URL}/public/${enterpriseId}`);
      
      if (response.success && response.data) {
        console.log('✅ Entreprise publique récupérée');
        return response.data;
      }
      
      throw new Error('Entreprise non trouvée');
    } catch (error: any) {
      console.error('❌ ENTERPRISE SERVICE - Erreur récupération entreprise publique:', error);
      throw new Error(error.response?.data?.message || error.message || 'Échec de récupération de l\'entreprise');
    }
  }

  /**
   * Récupérer les produits d'une entreprise (vue publique)
   */
  async getEnterpriseProducts(
    enterpriseId: string, 
    page: number = 1, 
    limit: number = 20, 
    filters: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      sort?: string;
      search?: string;
    } = {}
  ): Promise<{
    products: any[];
    enterprise: {
      id: string;
      companyName: string;
      logo: string;
    };
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      console.log('🔄 ENTERPRISE SERVICE - Récupération produits entreprise:', enterpriseId);
      console.log('📄 Page:', page, 'Limite:', limit);
      console.log('🔍 Filtres:', filters);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        ),
      });

      const response = await ApiService.get<{
        products: any[];
        enterprise: {
          id: string;
          companyName: string;
          logo: string;
        };
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>(`${this.BASE_URL}/public/${enterpriseId}/products?${params}`);
      
      console.log('🔍 Response structure:', JSON.stringify(response, null, 2));
      
      if (response.success) {
        // Gérer différentes structures de réponse possibles
        let products = [];
        let pagination = { page: 1, limit: 20, total: 0, pages: 0 };
        let enterprise = { id: enterpriseId, companyName: 'Entreprise', logo: '' };
        
        if (response.data) {
          // Si response.data contient directement les produits
          if (Array.isArray(response.data)) {
            products = response.data;
          } 
          // Si response.data a une structure avec products
          else if (response.data.products) {
            products = response.data.products;
            pagination = response.data.pagination || pagination;
            enterprise = response.data.enterprise || enterprise;
          }
          // Si response.data est un objet avec d'autres propriétés
          else {
            products = response.data.products || [];
            pagination = response.data.pagination || pagination;
            enterprise = response.data.enterprise || enterprise;
          }
        }
        
        console.log('✅ Produits entreprise récupérés:', products.length);
        return {
          products: products,
          enterprise: enterprise,
          pagination: pagination
        };
      }
      
      throw new Error('Échec de récupération des produits');
    } catch (error: any) {
      console.error('❌ ENTERPRISE SERVICE - Erreur récupération produits entreprise:', error);
      throw new Error(error.response?.data?.message || error.message || 'Échec de récupération des produits de l\'entreprise');
    }
  }
}

export default new EnterpriseService();
