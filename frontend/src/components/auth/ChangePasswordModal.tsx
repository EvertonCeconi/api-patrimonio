import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { authService } from '@/services/auth.service';
import { extractApiError } from '@/lib/extractError';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    setError(null);

    if (!currentPassword) {
      setError('Informe sua senha atual');
      return;
    }
    if (newPassword.length < 8) {
      setError('A nova senha deve ter no mínimo 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem');
      return;
    }
    if (currentPassword === newPassword) {
      setError('Nova senha deve ser diferente da senha atual');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onClose();
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Alterar senha" width="max-w-sm">
      <div className="space-y-4">
        <p className="text-sm text-surface-500">
          Sua senha será alterada e você precisará fazer login novamente.
        </p>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Senha atual <span className="text-red-500">*</span>
          </label>
          <input
            className="input w-full"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Sua senha atual"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Nova senha <span className="text-red-500">*</span>
          </label>
          <input
            className="input w-full"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Confirmar nova senha <span className="text-red-500">*</span>
          </label>
          <input
            className="input w-full"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
          />
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost px-4 py-2 text-sm">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary min-w-[120px] justify-center"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Alterando...
              </span>
            ) : (
              'Alterar senha'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}
