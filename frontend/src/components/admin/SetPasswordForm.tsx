import { useState } from 'react';
import type { User } from '@/services/admin.service';

interface SetPasswordFormProps {
  user: User;
  onSubmit: (password: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function SetPasswordForm({ user, onSubmit, loading, error }: SetPasswordFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setValidationError(null);

    if (password.length < 8) {
      setValidationError('A senha deve ter no mínimo 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('As senhas não conferem');
      return;
    }

    await onSubmit(password);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-500">
        Definir nova senha para <span className="font-medium text-surface-700">{user.name}</span>
      </p>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {validationError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {validationError}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">
          Nova senha
        </label>
        <input
          className="input w-full"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 8 caracteres"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">
          Confirmar senha
        </label>
        <input
          className="input w-full"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita a senha"
        />
      </div>

      <div className="pt-2 flex justify-end gap-2">
        <button
          type="button"
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
              Salvando...
            </span>
          ) : (
            'Definir senha'
          )}
        </button>
      </div>
    </div>
  );
}
