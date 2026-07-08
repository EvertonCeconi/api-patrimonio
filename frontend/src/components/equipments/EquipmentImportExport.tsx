import { useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { useExportEquipmentsCsv, useExportEquipmentsXlsx, useImportPreview, useImportConfirm } from '@/hooks/useEquipments';
import { Modal } from '@/components/ui/Modal';
import { downloadCsv, downloadXlsx } from '@/lib/extractError';
import type { EquipmentFilters, ImportPreviewResult, ImportResult } from '@/types';

interface EquipmentImportExportProps {
  open: boolean;
  onClose: () => void;
  filters: EquipmentFilters;
}

export function EquipmentImportExport({ open, onClose, filters }: EquipmentImportExportProps) {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');
  const [upsertMode, setUpsertMode] = useState(true);

  const exportCsvMutation = useExportEquipmentsCsv();
  const exportXlsxMutation = useExportEquipmentsXlsx();
  const previewMutation = useImportPreview();
  const confirmMutation = useImportConfirm();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setPreview(null);
    setResult(null);
    setError('');

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx') {
      setError('Formato não suportado. Use .csv ou .xlsx');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError('Arquivo excede o limite de 5 MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const mode = upsertMode ? 'upsert' : 'insert';
    previewMutation.mutate({ file: selectedFile, mode }, {
      onSuccess: (data) => setPreview(data),
      onError: () => {
        setError('Erro ao processar arquivo.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  }

  function handleConfirm() {
    if (!preview?.token) return;
    confirmMutation.mutate(preview.token, {
      onSuccess: (data) => {
        setResult(data);
        setPreview(null);
      },
    });
  }

  function handleReset() {
    setPreview(null);
    setResult(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleClose() {
    handleReset();
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose} title={isAdmin ? 'Exportar / Importar' : 'Exportar'} width="max-w-lg">
      <div className="space-y-6">
        {/* Export */}
        <div>
          <h3 className="text-sm font-medium text-surface-900 mb-3">Exportar</h3>
          <div className="flex gap-2">
            <button
              onClick={() => exportCsvMutation.mutate(filters, {
                onSuccess: downloadCsv,
              })}
              className="btn-secondary flex-1"
              disabled={exportCsvMutation.isPending}
            >
              {exportCsvMutation.isPending ? 'Exportando…' : 'Baixar CSV'}
            </button>
            <button
              onClick={() => exportXlsxMutation.mutate(filters, {
                onSuccess: downloadXlsx,
              })}
              className="btn-secondary flex-1"
              disabled={exportXlsxMutation.isPending}
            >
              {exportXlsxMutation.isPending ? 'Exportando…' : 'Baixar Excel'}
            </button>
          </div>
        </div>

        {isAdmin && (
          <>
            <hr className="border-surface-200" />

            {/* Import */}
            <div>
              <h3 className="text-sm font-medium text-surface-900 mb-3">Importar</h3>
              <p className="text-xs text-surface-600 mb-3">
                Formatos aceitos: .csv e .xlsx. Limite: 500 linhas e 5 MB.
                Colunas obrigatórias: name, model, serialNumber, location.
              </p>

              {/* Step 1: file picker */}
              {!preview && !result && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-surface-700">
                    <input
                      type="checkbox"
                      checked={upsertMode}
                      onChange={(e) => setUpsertMode(e.target.checked)}
                      className="rounded border-surface-300"
                    />
                    Atualizar registros existentes (por serialNumber)
                  </label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary w-full"
                    disabled={previewMutation.isPending}
                  >
                    {previewMutation.isPending ? 'Analisando…' : 'Selecionar arquivo'}
                  </button>
                </div>
              )}

              {error && (
                <p className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              {/* Step 2: preview summary */}
              {preview && !result && (
                <div className="space-y-3">
                  <div className="bg-surface-50 rounded-lg p-3 space-y-1">
                    <p className="text-sm">
                      <strong>{preview.total}</strong> registro{preview.total !== 1 ? 's' : ''} encontrado{preview.total !== 1 ? 's' : ''}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="badge bg-green-100 text-green-800">
                        {preview.toCreate} novo{preview.toCreate !== 1 ? 's' : ''}
                      </span>
                      {preview.toUpdate > 0 && (
                        <span className="badge bg-blue-100 text-blue-800">
                          {preview.toUpdate} atualizado{preview.toUpdate !== 1 ? 's' : ''}
                        </span>
                      )}
                      {preview.toSkip > 0 && (
                        <span className="badge bg-gray-100 text-gray-700">
                          {preview.toSkip} sem alteração{preview.toSkip !== 1 ? 'es' : ''}
                        </span>
                      )}
                      {preview.errors.length > 0 && (
                        <span className="badge bg-red-100 text-red-800">
                          {preview.errors.length} erro{preview.errors.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {preview.errors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {preview.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          Linha {err.row}: {err.message}
                        </p>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleConfirm}
                      className="btn-primary flex-1"
                      disabled={confirmMutation.isPending}
                    >
                      {confirmMutation.isPending ? 'Importando…' : 'Confirmar importação'}
                    </button>
                    <button onClick={handleReset} className="btn-secondary" disabled={confirmMutation.isPending}>
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: final result */}
              {result && (
                <div className="space-y-3">
                  <div className="bg-surface-50 rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium">Importação concluída</p>
                    <div className="flex gap-2">
                      <span className="badge bg-green-100 text-green-800">
                        {result.created} criado{result.created !== 1 ? 's' : ''}
                      </span>
                      <span className="badge bg-blue-100 text-blue-800">
                        {result.updated} atualizado{result.updated !== 1 ? 's' : ''}
                      </span>
                      {result.errors.length > 0 && (
                        <span className="badge bg-red-100 text-red-800">
                          {result.errors.length} erro{result.errors.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {result.errors.length > 0 && (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                          Linha {err.row}: {err.message}
                        </p>
                      ))}
                    </div>
                  )}

                  <button onClick={handleReset} className="btn-primary w-full">
                    Importar outro arquivo
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end pt-2">
          <button onClick={handleClose} className="btn-secondary">Fechar</button>
        </div>
      </div>
    </Modal>
  );
}
