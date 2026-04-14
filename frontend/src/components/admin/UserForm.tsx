import { useState } from 'react';
import type { User, CreateUserPayload, UpdateUserPayload } from '@/services/admin.service';

interface UserFormProps {
  initial?: User | null;
  onSubmit: (payload: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  loading: boolean;
  error: string | null;
  isProtectedUser?: boolean;
  isSelf?: boolean; // editando o próprio usuário logado
}

export function UserForm({
  initial,
  onSubmit,
  loading,
  error,
  isProtectedUser = false,
  isSelf = false,
}: UserFormProps) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'USER'>(initial?.role ?? 'USER');
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);

  const handleSubmit = async () => {
    const isChangingPassword = password.length > 0;
    const payload: CreateUserPayload | UpdateUserPayload = isEdit
      ? {
          ...(name !== initial?.name && { name }),
          ...(email !== initial?.email && { email }),
          ...(isChangingPassword && { password, ...(isSelf && currentPassword && { currentPassword }),}),
          ...(role !== initial?.role && { role }),
          ...(isActive !== initial?.isActive && { isActive }),
        }
      : { name, email, password, role, isActive };

    await onSubmit(payload);
  };

  // Owner não pode alterar role ou status de si mesmo
  const disableRoleStatus = isEdit && isProtectedUser;

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">Nome</label>
        <input
          className="input w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome completo"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">E-mail</label>
        <input
          className="input w-full"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">
          Senha {isEdit && <span className="text-surface-400">(deixe em branco para manter)</span>}
        </label>
        <input
          className="input w-full"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isEdit ? '••••••••' : 'Mínimo 8 caracteres'}
        />
      </div>

      {isEdit && isSelf && password.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-surface-700 mb-1">
            Senha atual <span className="text-red-500">*</span>
          </label>
          <input
            className="input w-full"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Confirme sua senha atual"
            required
          />
        </div>
      )}

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-surface-700 mb-1">Role</label>
          <select
            className="input w-full"
            value={role}
            onChange={(e) => setRole(e.target.value as 'ADMIN' | 'USER')}
            disabled={disableRoleStatus}
            title={disableRoleStatus ? 'Owner não pode alterar sua própria role' : ''}
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>

        <div className="flex-1 flex flex-col justify-end">
          <label
            className={`flex items-center gap-2 pb-2 ${
              disableRoleStatus ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            }`}
          >
            <span className="text-xs font-medium text-surface-700">Ativo</span>
            <div
              onClick={() => !disableRoleStatus && setIsActive((v) => !v)}
              className={`relative w-9 h-5 rounded-full transition-colors ${
                isActive ? 'bg-brand-600' : 'bg-surface-200'
              }`}
              title={disableRoleStatus ? 'Owner não pode alterar seu próprio status' : ''}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  isActive ? 'translate-x-4' : ''
                }`}
              />
            </div>
          </label>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
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
              Salvando...
            </span>
          ) : isEdit ? (
            'Salvar alterações'
          ) : (
            'Criar usuário'
          )}
        </button>
      </div>
    </div>
  );
}
