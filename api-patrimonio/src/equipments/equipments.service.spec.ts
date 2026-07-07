import { EquipmentsService } from './equipments.service';
import { PrismaService } from '../prisma/prisma.service';

describe('EquipmentsService — import validation', () => {
  let service: EquipmentsService;

  beforeEach(async () => {
    const prisma = {} as PrismaService;
    service = new EquipmentsService(prisma);
  });

  describe('isValidIp', () => {
    const isValidIp = (ip: string) =>
      (service as any).isValidIp(ip) as boolean;

    it('deve aceitar IPs válidos', () => {
      expect(isValidIp('192.168.0.1')).toBe(true);
      expect(isValidIp('10.0.0.1')).toBe(true);
      expect(isValidIp('255.255.255.255')).toBe(true);
      expect(isValidIp('0.0.0.0')).toBe(true);
    });

    it('deve rejeitar string aleatória', () => {
      expect(isValidIp('1211233213')).toBe(false);
    });

    it('deve rejeitar IP com octeto faltando', () => {
      expect(isValidIp('192.168.1')).toBe(false);
    });

    it('deve rejeitar octetos acima de 255', () => {
      expect(isValidIp('999.999.999.999')).toBe(false);
    });

    it('deve rejeitar IP com caracteres não numéricos', () => {
      expect(isValidIp('abc.def.ghi.jkl')).toBe(false);
    });

    it('deve rejeitar string vazia', () => {
      expect(isValidIp('')).toBe(false);
    });
  });

  describe('hasFormulaInjection', () => {
    const hasFormulaInjection = (val: string) =>
      (service as any).hasFormulaInjection(val) as boolean;

    it('deve detectar = no início', () => {
      expect(hasFormulaInjection('=CMD')).toBe(true);
    });

    it('deve detectar + no início', () => {
      expect(hasFormulaInjection('+CMD')).toBe(true);
    });

    it('deve detectar - no início', () => {
      expect(hasFormulaInjection('-CMD')).toBe(true);
    });

    it('deve detectar @ no início', () => {
      expect(hasFormulaInjection('@CMD')).toBe(true);
    });

    it('deve aceitar valor normal', () => {
      expect(hasFormulaInjection('Notebook Dell')).toBe(false);
    });

    it('deve aceitar string vazia', () => {
      expect(hasFormulaInjection('')).toBe(false);
    });
  });

  describe('validateRow', () => {
    const validateRow = (record: Record<string, string>) =>
      (service as any).validateRow(record) as string[];

    it('deve aceitar linha válida', () => {
      const errors = validateRow({
        name: 'Notebook',
        model: 'M1',
        assetTag: 'PAT-001',
        serialNumber: 'SN-001',
        location: 'Local',
      });
      expect(errors).toHaveLength(0);
    });

    it('deve rejeitar name ausente', () => {
      const errors = validateRow({
        name: '',
        model: 'M1',
        assetTag: 'PAT-001',
        serialNumber: 'SN-001',
        location: 'Local',
      });
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/name/i)]),
      );
    });

    it('deve rejeitar model ausente', () => {
      const errors = validateRow({
        name: 'Notebook',
        model: '',
        assetTag: 'PAT-001',
        serialNumber: 'SN-001',
        location: 'Local',
      });
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/model/i)]),
      );
    });

    it('deve rejeitar assetTag ausente', () => {
      const errors = validateRow({
        name: 'Notebook',
        model: 'M1',
        assetTag: '',
        serialNumber: 'SN-001',
        location: 'Local',
      });
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/assetTag/i)]),
      );
    });

    it('deve rejeitar serialNumber ausente', () => {
      const errors = validateRow({
        name: 'Notebook',
        model: 'M1',
        assetTag: 'PAT-001',
        serialNumber: '',
        location: 'Local',
      });
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/serialNumber/i)]),
      );
    });

    it('deve rejeitar location ausente', () => {
      const errors = validateRow({
        name: 'Notebook',
        model: 'M1',
        assetTag: 'PAT-001',
        serialNumber: 'SN-001',
        location: '',
      });
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/location/i)]),
      );
    });

    it('deve rejeitar status inválido', () => {
      const errors = validateRow({
        name: 'Notebook',
        model: 'M1',
        assetTag: 'PAT-001',
        serialNumber: 'SN-001',
        location: 'Local',
        status: 'INVALIDO',
      });
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/status/i)]),
      );
    });

    it('deve rejeitar IP inválido', () => {
      const errors = validateRow({
        name: 'Notebook',
        model: 'M1',
        assetTag: 'PAT-001',
        serialNumber: 'SN-001',
        location: 'Local',
        ipAddress: '999.999.999.999',
      });
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/IP/i)]),
      );
    });

    it('deve rejeitar fórmula injection no name', () => {
      const errors = validateRow({
        name: '=CMD',
        model: 'M1',
        assetTag: 'PAT-001',
        serialNumber: 'SN-001',
        location: 'Local',
      });
      expect(errors).toEqual(
        expect.arrayContaining([expect.stringMatching(/fórmula/i)]),
      );
    });

    it('deve rejeitar todos os campos obrigatórios ausentes de uma vez', () => {
      const errors = validateRow({
        name: '',
        model: '',
        assetTag: '',
        serialNumber: '',
        location: '',
      });
      expect(errors).toHaveLength(5);
    });
  });
});
