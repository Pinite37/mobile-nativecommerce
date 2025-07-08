import { User } from '../../types/auth';
import ApiService from './ApiService';

// Enable mock mode for testing
const USE_MOCK_API = false; // Use real API

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  location?: {
    coordinates: [number, number];
    address: string;
  };
}

export interface UpdatePreferencesRequest {
  language?: string;
  currency?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    sms?: boolean;
  };
}

export interface UpdateLocationRequest {
  coordinates: [number, number];
  address: string;
}

class CustomerService {
  private readonly BASE_URL = '/customer';

  // Récupérer le profil du client
  async getProfile(): Promise<User> {
    try {
      // Use mock service in development mode
      if (USE_MOCK_API) {
        // Simuler un délai réseau
        await new Promise(resolve => setTimeout(resolve, 800));
        
        return {
          _id: '1',
          email: 'client@example.com',
          role: 'CLIENT',
          firstName: 'Jean',
          lastName: 'Dupont',
          phone: '+229 12345678',
          address: 'Cotonou, Bénin',
          profileImage: 'https://via.placeholder.com/150x150/3B82F6/FFFFFF?text=JD',
          isBlocked: false,
          lastActive: new Date(),
          location: {
            type: 'Point',
            coordinates: [6.3573, 2.4181],
            address: 'Cotonou, Bénin',
          },
          preferences: {
            language: 'fr',
            currency: 'XOF',
            notifications: {
              email: true,
              push: true,
              sms: false,
            },
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      
      // Utiliser l'appel rapide pour le profil utilisateur (optimisé pour le démarrage)
      const response = await ApiService.getFast<User>(`${this.BASE_URL}/profile`);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to fetch profile');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to fetch profile');
    }
  }

  // Mettre à jour le profil du client
  async updateProfile(profileData: UpdateProfileRequest): Promise<User> {
    try {
      // Use mock service in development mode
      if (USE_MOCK_API) {
        // Simuler un délai réseau
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const currentProfile = await this.getProfile();
        
        return {
          ...currentProfile,
          ...profileData,
          location: profileData.location ? {
            type: 'Point',
            coordinates: profileData.location.coordinates,
            address: profileData.location.address,
          } : currentProfile.location,
          updatedAt: new Date(),
        };
      }
      
      const response = await ApiService.put<User>(`${this.BASE_URL}/profile`, profileData);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to update profile');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to update profile');
    }
  }

  // Mettre à jour le profil avec image
  async updateProfileWithImage(userData: UpdateProfileRequest, imageBase64: string, mimeType: string): Promise<User> {
    try {
      // Use mock service in development mode
      if (USE_MOCK_API) {
        // Simuler un délai réseau
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const currentProfile = await this.getProfile();
        const mockImageUrl = `https://via.placeholder.com/150x150/3B82F6/FFFFFF?text=${Date.now()}`;
        
        return {
          ...currentProfile,
          ...userData,
          profileImage: mockImageUrl,
          updatedAt: new Date(),
        } as User;
      }

      const updateData = {
        ...userData,
        image: {
          base64: imageBase64,
          type: mimeType
        }
      };

      console.log('📤 Updating profile with base64 image, size:', imageBase64.length, 'type:', mimeType);

      const response = await ApiService.put<User>(`${this.BASE_URL}/profile`, updateData);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to update profile with image');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update profile with image');
    }
  }

  // Supprimer la photo de profil
  async removeProfileImage(): Promise<User> {
    try {
      // Use mock service in development mode
      if (USE_MOCK_API) {
        // Simuler un délai réseau
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const currentProfile = await this.getProfile();
        
        return {
          ...currentProfile,
          profileImage: undefined,
          updatedAt: new Date(),
        };
      }
      
      // Mettre à jour le profil en supprimant l'image
      const updateData = {
        image: null // Envoyer null pour supprimer l'image
      };

      const response = await ApiService.put<User>(`${this.BASE_URL}/profile`, updateData);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to remove profile image');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to remove profile image');
    }
  }

  // Mettre à jour les préférences
  async updatePreferences(preferences: UpdatePreferencesRequest): Promise<User> {
    try {
      // Use mock service in development mode
      if (USE_MOCK_API) {
        // Simuler un délai réseau
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const currentProfile = await this.getProfile();
        
        return {
          ...currentProfile,
          preferences: {
            ...currentProfile.preferences,
            ...preferences,
            notifications: {
              ...currentProfile.preferences.notifications,
              ...preferences.notifications,
            },
          },
          updatedAt: new Date(),
        };
      }
      
      const response = await ApiService.put<User>(`${this.BASE_URL}/preferences`, preferences);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to update preferences');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update preferences');
    }
  }

  // Mettre à jour la localisation
  async updateLocation(location: UpdateLocationRequest): Promise<User> {
    try {
      // Use mock service in development mode
      if (USE_MOCK_API) {
        // Simuler un délai réseau
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const currentProfile = await this.getProfile();
        
        return {
          ...currentProfile,
          location: {
            type: 'Point',
            coordinates: location.coordinates,
            address: location.address,
          },
          updatedAt: new Date(),
        };
      }
      
      const response = await ApiService.put<User>(`${this.BASE_URL}/location`, location);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      throw new Error('Failed to update location');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to update location');
    }
  }
}

export default new CustomerService();
