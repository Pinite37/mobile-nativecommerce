import ApiService from './ApiService';

/**
 * Règlements des livreurs.
 *
 * L'argent ne transite pas par l'application : le paiement se fait entre
 * l'entreprise et le livreur, en dehors. Ce service tient le compte de ce
 * qui est dû et de ce que l'entreprise déclare avoir réglé — c'est une
 * déclaration, pas une preuve de virement.
 */

export interface SettlementLine {
  _id: string;
  deliverer:
    | string
    | { _id: string; firstName?: string; lastName?: string; phone?: string; profileImage?: string };
  enterprise: string;
  missionType: 'OFFER' | 'CALL';
  mission: string;
  amount: number;
  label: string;
  status: 'DUE' | 'PAID' | 'CANCELLED';
  completedAt: string;
  paidAt?: string;
  paymentNote?: string;
}

const BASE_URL = '/settlements';

class SettlementService {
  /** Ce que l'entreprise reste à régler (ou l'historique de ce qu'elle a réglé). */
  async listForEnterprise(status: 'DUE' | 'PAID' = 'DUE'): Promise<SettlementLine[]> {
    try {
      const r = await ApiService.get<SettlementLine[]>(`${BASE_URL}/enterprise`, {
        params: { status },
      });
      return r.success && r.data ? r.data : [];
    } catch (error: any) {
      console.error('❌ SettlementService.listForEnterprise:', error.response?.status, error.message);
      return [];
    }
  }

  /** Déclarer une course réglée. Irréversible depuis l'app, d'où la confirmation côté écran. */
  async markPaid(lineId: string, note?: string): Promise<SettlementLine> {
    try {
      const r = await ApiService.post<SettlementLine>(`${BASE_URL}/${lineId}/paid`, { note });
      if (r.success && r.data) return r.data;
      throw new Error(r.message || 'Échec du marquage');
    } catch (error: any) {
      console.error('❌ SettlementService.markPaid:', error.response?.status, error.response?.data);
      throw new Error(error.response?.data?.message || error.message || 'Impossible de marquer cette course');
    }
  }

  delivererName(line: SettlementLine): string {
    if (typeof line.deliverer !== 'object' || !line.deliverer) return 'Livreur';
    const nom = `${line.deliverer.firstName || ''} ${line.deliverer.lastName || ''}`.trim();
    return nom || 'Livreur';
  }
}

export default new SettlementService();
