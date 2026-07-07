import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { EquipmentDto } from './equipment.dto';

const validPayload = {
  name: 'Notebook Dell',
  assetTag: 'PAT-001',
  serialNumber: 'SN-001',
  model: 'Latitude 5420',
  location: 'Estoque Principal',
};

describe('EquipmentDto', () => {
  describe('campos obrigatórios', () => {
    it('deve aceitar payload válido', async () => {
      const dto = plainToInstance(EquipmentDto, validPayload);
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve rejeitar quando name está ausente', async () => {
      const { name, ...rest } = validPayload;
      const dto = plainToInstance(EquipmentDto, rest);
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('name');
    });

    it('deve rejeitar quando location está ausente', async () => {
      const { location, ...rest } = validPayload;
      const dto = plainToInstance(EquipmentDto, rest);
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('location');
    });

    it('deve rejeitar quando model está ausente', async () => {
      const { model, ...rest } = validPayload;
      const dto = plainToInstance(EquipmentDto, rest);
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('model');
    });

    it('deve rejeitar quando assetTag está ausente', async () => {
      const { assetTag, ...rest } = validPayload;
      const dto = plainToInstance(EquipmentDto, rest);
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('assetTag');
    });

    it('deve rejeitar quando serialNumber está ausente', async () => {
      const { serialNumber, ...rest } = validPayload;
      const dto = plainToInstance(EquipmentDto, rest);
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('serialNumber');
    });
  });

  describe('campos opcionais', () => {
    it('deve aceitar ipAddress válido', async () => {
      const dto = plainToInstance(EquipmentDto, {
        ...validPayload,
        ipAddress: '192.168.0.1',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve aceitar status válido', async () => {
      const dto = plainToInstance(EquipmentDto, {
        ...validPayload,
        status: 'MANUTENCAO',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('deve aceitar description', async () => {
      const dto = plainToInstance(EquipmentDto, {
        ...validPayload,
        description: 'Notebook para desenvolvimento',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('validação de IP', () => {
    it('deve rejeitar IP com string aleatória', async () => {
      const dto = plainToInstance(EquipmentDto, {
        ...validPayload,
        ipAddress: '1211233213',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ipAddress');
    });

    it('deve rejeitar IP com octeto faltando', async () => {
      const dto = plainToInstance(EquipmentDto, {
        ...validPayload,
        ipAddress: '192.168.1',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('ipAddress');
    });
  });

  describe('validação de enum', () => {
    it('deve rejeitar status inválido', async () => {
      const dto = plainToInstance(EquipmentDto, {
        ...validPayload,
        status: 'INVALIDO',
      });
      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('status');
    });
  });

  describe('forbidNonWhitelisted', () => {
    it('deve rejeitar campos não permitidos', async () => {
      const dto = plainToInstance(EquipmentDto, {
        ...validPayload,
        campoInvalido: 'valor',
      });
      const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('campoInvalido');
    });
  });
});
