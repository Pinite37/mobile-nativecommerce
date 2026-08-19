import ApiService from './ApiService';

export interface FollowStatus {
  isFollowing: boolean;
  followerCount: number;
}

class FollowService {
  private readonly BASE = '/follows';

  async getStatus(enterpriseId: string): Promise<FollowStatus> {
    const res = await ApiService.get<FollowStatus>(`${this.BASE}/status/${enterpriseId}`);
    return res.data!;
  }

  async follow(enterpriseId: string): Promise<{ followerCount: number }> {
    const res = await ApiService.post<{ followerCount: number }>(`${this.BASE}/${enterpriseId}`, {});
    return res.data!;
  }

  async unfollow(enterpriseId: string): Promise<{ followerCount: number }> {
    const res = await ApiService.delete<{ followerCount: number }>(`${this.BASE}/${enterpriseId}`);
    return res.data!;
  }

  async getMyFollowing(): Promise<string[]> {
    const res = await ApiService.get<string[]>(`${this.BASE}/my-following`);
    return res.data!;
  }

  async getMyFollowers(): Promise<{ followers: any[]; total: number }> {
    const res = await ApiService.get<{ followers: any[]; total: number }>(`${this.BASE}/my-followers`);
    return res.data!;
  }
}

export default new FollowService();
