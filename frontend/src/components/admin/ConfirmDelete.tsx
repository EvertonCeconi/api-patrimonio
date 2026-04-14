import type { User } from '@/services/admin.service';

interface ConfirmDeleteProps {
  user: User;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

export function ConfirmDelete({ user, onConfirm, onCancel, loading, error }: ConfirmDeleteProps) {
  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <p className="text-sm text-surface-700">
        Tem certeza que deseja excluir o usuário <strong>{user.name}</strong>? Esta ação não pode ser desfeita.
      </p>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500 min-w-[100px] justify-center"
        >
          {loading ? 'Excluindo...' : 'Excluir'}
        </button>
      </div>
    </div>
  );
}
