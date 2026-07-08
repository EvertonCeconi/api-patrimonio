import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { EquipmentDto } from './dtos/equipment.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEquipmentDto } from './dtos/update-equipment.dto';
import { PaginationDto } from './dtos/pagination.dto';
import { Prisma, Estado } from '@prisma/client';
import { buildPaginationMeta } from '../common/utils/pagination';
import type {
  RowAction,
  RowSummary,
  ImportPreviewResult,
  ImportResult,
} from '../common/utils/import-types';
import * as XLSX from 'xlsx';
import { randomBytes } from 'crypto';

interface StagedImport {
  records: Record<string, string>[];
  filename: string;
  createdAt: number;
  mode: 'upsert' | 'insert';
}

type SanitizedRow = {
  name?: string;
  model?: string;
  serialNumber?: string;
  location?: string;
  ipAddress?: string;
  description?: string;
  status?: Estado;
};

@Injectable()
export class EquipmentsService implements OnModuleDestroy {
  private readonly logger = new Logger(EquipmentsService.name);

  private readonly VALID_STATUSES: Estado[] = [
    'ESTOQUE',
    'CLIENTE',
    'MANUTENCAO',
    'RETIRADA_PECAS',
  ];
  private readonly MAX_ROWS = 500;
  private readonly MAX_FIELD_LENGTH = 255;
  private readonly MAX_DESC_LENGTH = 1000;
  private readonly REQUIRED_COLUMNS = [
    'name',
    'model',
    'serialNumber',
    'location',
  ];
  private readonly EXPORT_COLUMNS = [
    'name',
    'model',
    'serialNumber',
    'ipAddress',
    'location',
    'status',
    'description',
  ];
  private readonly stagedImports = new Map<string, StagedImport>();
  private readonly STAGE_TTL = 10 * 60 * 1000;
  private readonly stageTimeouts = new Map<string, NodeJS.Timeout>();

  constructor(private readonly prisma: PrismaService) {}

  onModuleDestroy() {
    for (const timeout of this.stageTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.stageTimeouts.clear();
  }

  async create(dto: EquipmentDto) {
    return this.prisma.equipment.create({ data: dto });
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    return this.prisma.equipment.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    return this.prisma.equipment.delete({ where: { id } });
  }

  async findOne(id: string) {
    const equipment = await this.prisma.equipment.findUnique({ where: { id } });

    if (!equipment) {
      throw new NotFoundException(`Equipamento ${id} não encontrado`);
    }

    return equipment;
  }

  async findAll(query: PaginationDto) {
    const { page, limit } = query;

    if (query.search && query.search.length > 100) {
      throw new BadRequestException('Busca muito longa');
    }

    const skip = (page - 1) * limit;
    const where = this.buildWhereFromQuery(query);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.equipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.equipment.count({ where }),
    ]);

    return {
      data,
      meta: buildPaginationMeta(total, page, limit),
      message: data.length === 0 ? 'Nenhum equipamento encontrado' : undefined,
    };
  }

  private buildWhereFromQuery(
    query: PaginationDto,
  ): Prisma.EquipmentWhereInput {
    const { search, status } = query;

    return {
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
          
          { serialNumber: { contains: search, mode: 'insensitive' } },
          { ipAddress: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  async exportCsv(
    query: PaginationDto,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const equipments = await this.prisma.equipment.findMany({
      where: this.buildWhereFromQuery(query),
      orderBy: { createdAt: 'desc' },
    });

    const header = this.EXPORT_COLUMNS.join(';');
    const rows = equipments.map((eq) =>
      this.EXPORT_COLUMNS.map((col) => {
        const val = eq[col as keyof typeof eq];
        if (val === null || val === undefined) return '';
        const str = String(val);
        if (str.includes(';') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(';'),
    );

    const csvContent = '\uFEFF' + header + '\n' + rows.join('\n');
    return {
      buffer: Buffer.from(csvContent, 'utf-8'),
      filename: 'equipamentos.csv',
    };
  }

  async exportXlsx(
    query: PaginationDto,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const equipments = await this.prisma.equipment.findMany({
      where: this.buildWhereFromQuery(query),
      orderBy: { createdAt: 'desc' },
    });

    const data = equipments.map((eq) => {
      const row: Record<string, string> = {};
      for (const col of this.EXPORT_COLUMNS) {
        const val = eq[col as keyof typeof eq];
        row[col] = val !== null && val !== undefined ? String(val) : '';
      }
      return row;
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipamentos');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return { buffer, filename: 'equipamentos.xlsx' };
  }

  async importPreview(
    file: Express.Multer.File,
    mode: 'upsert' | 'insert' = 'upsert',
  ): Promise<ImportPreviewResult> {
    let records: Record<string, string>[] = [];

    try {
      records = this.parseFile(file);
    } catch {
      throw new BadRequestException('Arquivo corrompido ou formato inválido');
    }

    if (records.length === 0) {
      throw new BadRequestException('Arquivo vazio');
    }

    if (records.length > this.MAX_ROWS) {
      throw new BadRequestException(
        `Arquivo excede o limite de ${this.MAX_ROWS} linhas`,
      );
    }

    const errors: { row: number; message: string }[] = [];
    const rows: RowSummary[] = [];
    let toCreate = 0;
    let toUpdate = 0;
    let toSkip = 0;

    for (let i = 0; i < records.length; i++) {
      const rowNum = i + 1;
      const record = records[i];
      const validationErrors = this.validateRow(record);

      if (validationErrors.length > 0) {
        const message = validationErrors.join('; ');
        errors.push({ row: rowNum, message });
        rows.push({ row: rowNum, action: 'error', message });
        continue;
      }

      const sanitized = this.sanitizeRow(record);
      const action = await this.resolveRowAction(sanitized, mode);

      switch (action.action) {
        case 'update':
          toUpdate++;
          rows.push({ row: rowNum, action: 'update' });
          break;
        case 'skip':
          toSkip++;
          rows.push({ row: rowNum, action: 'skip' });
          break;
        case 'error':
          errors.push({ row: rowNum, message: action.message });
          rows.push({ row: rowNum, action: 'error', message: action.message });
          break;
        default:
          toCreate++;
          rows.push({ row: rowNum, action: 'create' });
      }
    }

    const token = randomBytes(16).toString('hex');
    this.stagedImports.set(token, {
      records,
      filename: file.originalname,
      createdAt: Date.now(),
      mode,
    });

    const timeout = setTimeout(() => {
      this.stagedImports.delete(token);
      this.stageTimeouts.delete(token);
    }, this.STAGE_TTL);
    this.stageTimeouts.set(token, timeout);

    return {
      token,
      total: records.length,
      toCreate,
      toUpdate,
      toSkip,
      errors,
      rows,
    };
  }

  async importConfirm(token: string): Promise<ImportResult> {
    const staged = this.stagedImports.get(token);
    if (!staged) {
      throw new BadRequestException(
        'Token inválido ou expirado. Faça o preview novamente.',
      );
    }

    this.stagedImports.delete(token);

    const { records, mode } = staged;
    const errors: { row: number; message: string }[] = [];
    let created = 0;
    let updated = 0;

    for (let i = 0; i < records.length; i++) {
      const row = i + 1;
      const record = records[i];
      const validationErrors = this.validateRow(record);

      if (validationErrors.length > 0) {
        errors.push({ row, message: validationErrors.join('; ') });
        continue;
      }

      try {
        const sanitized = this.sanitizeRow(record);
        const action = await this.resolveRowAction(sanitized, mode);

        if (action.action === 'update') {
          await this.prisma.equipment.update({
            where: { id: action.record.id },
            data: sanitized as Prisma.EquipmentUpdateInput,
          });
          updated++;
        } else if (action.action === 'error') {
          errors.push({ row, message: action.message });
        } else if (action.action !== 'skip') {
          await this.prisma.equipment.create({
            data: sanitized as Prisma.EquipmentCreateInput,
          });
          created++;
        }
      } catch (err: unknown) {
        if (!errors.some((e) => e.row === row)) {
          const message =
            err instanceof Error ? err.message : 'Erro inesperado';
          errors.push({ row, message });
        }
      }
    }

    return { total: records.length, created, updated, errors };
  }

  private async resolveRowAction(
    sanitized: SanitizedRow,
    mode: 'upsert' | 'insert' = 'upsert',
  ): Promise<RowAction> {
    if (!sanitized.serialNumber) {
      return { action: 'error', message: 'serialNumber é obrigatório' };
    }

    const bySerial = await this.prisma.equipment.findUnique({
      where: { serialNumber: sanitized.serialNumber },
    });

    if (!bySerial) {
      return { action: 'create' };
    }

    if (mode === 'insert') {
      if (!this.hasChanges(sanitized, bySerial)) {
        return { action: 'skip', record: { id: bySerial.id } };
      }
      return {
        action: 'error',
        message: `serialNumber "${sanitized.serialNumber}" já cadastrado`,
      };
    }

    if (!this.hasChanges(sanitized, bySerial)) {
      return { action: 'skip', record: { id: bySerial.id } };
    }

    return { action: 'update', record: { id: bySerial.id } };
  }

  private hasChanges(
    sanitized: SanitizedRow,
    existing: Record<string, unknown>,
  ): boolean {
    for (const key of Object.keys(sanitized) as (keyof SanitizedRow)[]) {
      const incoming = sanitized[key] ?? null;
      const current = existing[key] ?? null;
      if (incoming !== current) return true;
    }
    return false;
  }

  private parseFile(file: Express.Multer.File): Record<string, string>[] {
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    const mime = file.mimetype;

    const allowedCsvMimes = ['text/csv', 'application/vnd.ms-excel'];
    const allowedXlsxMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const isCsv = ext === 'csv' && allowedCsvMimes.includes(mime);
    const isXlsx = ext === 'xlsx' && allowedXlsxMimes.includes(mime);

    if (!isCsv && !isXlsx) {
      throw new BadRequestException(
        'Tipo de arquivo não suportado. Use .csv ou .xlsx',
      );
    }

    const raw: Record<string, string>[] = isCsv
      ? this.parseWorkbook(file.buffer, true)
      : this.parseWorkbook(file.buffer, false);

    return raw.map((row) => this.normalizeRow(row));
  }

  private parseWorkbook(
    buffer: Buffer,
    raw: boolean,
  ): Record<string, string>[] {
    const workbook = XLSX.read(buffer, { type: 'buffer', raw });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: '',
      raw: false,
    });
  }

  private normalizeRow(row: Record<string, string>): Record<string, string> {
    const normalized: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      normalized[key.trim()] = String(val ?? '').trim();
    }
    return normalized;
  }

  private validateRow(record: Record<string, string>): string[] {
    const errors: string[] = [];

    for (const col of this.REQUIRED_COLUMNS) {
      if (!record[col] || record[col].trim() === '') {
        errors.push(`${col} é obrigatório`);
      }
    }

    if (errors.length > 0) return errors;

    for (const [key, val] of Object.entries(record)) {
      if (!val) continue;

      if (this.hasFormulaInjection(val)) {
        errors.push(`Campo ${key} contém fórmula inválida`);
        return errors;
      }

      if (this.hasControlCharacters(val)) {
        errors.push(`Campo ${key} contém caracteres de controle`);
        return errors;
      }

      const maxLen =
        key === 'description' ? this.MAX_DESC_LENGTH : this.MAX_FIELD_LENGTH;
      if (val.length > maxLen) {
        errors.push(`${key} excede ${maxLen} caracteres`);
        return errors;
      }
    }

    if (record.ipAddress && record.ipAddress.trim()) {
      if (!this.isValidIp(record.ipAddress)) {
        errors.push('IP inválido');
        return errors;
      }
    }

    if (record.status && record.status.trim()) {
      if (!this.VALID_STATUSES.includes(record.status as Estado)) {
        errors.push(
          `Status inválido: ${record.status}. Valores: ${this.VALID_STATUSES.join(', ')}`,
        );
        return errors;
      }
    }

    return errors;
  }

  private sanitizeRow(record: Record<string, string>): SanitizedRow {
    const sanitized: SanitizedRow = {};

    for (const [key, val] of Object.entries(record)) {
      if (!val) continue;

      if (key === 'status') {
        sanitized.status = val as Estado;
      } else if (key === 'ipAddress') {
        sanitized.ipAddress = val;
      } else if (key === 'description') {
        sanitized.description = val;
      } else if ((this.REQUIRED_COLUMNS as readonly string[]).includes(key)) {
        (sanitized as Record<string, string | undefined>)[key] = val;
      }
    }

    return sanitized;
  }

  private hasFormulaInjection(val: string): boolean {
    const formulaChars = ['=', '+', '-', '@'];
    return val.length > 0 && formulaChars.includes(val[0]);
  }

  private hasControlCharacters(val: string): boolean {
    // eslint-disable-next-line no-control-regex
    return /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(val);
  }

  private isValidIp(ip: string): boolean {
    const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = ip.match(ipRegex);
    if (!match) return false;
    return match.slice(1).every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }
}
