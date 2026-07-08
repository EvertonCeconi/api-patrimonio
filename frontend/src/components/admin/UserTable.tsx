import { RoleBadge, ActiveBadge } from './AdminBadges';
import type { User } from '@/services/admin.service';

interface UserTableProps {
  users: User[];
  listLoading: boolean;
  currentUserId: string | undefined;
  inlineAction: { id: string; type: string } | null;
  isProtected: (user: User) => boolean;
  canEdit: (user: User) => boolean;
  onEdit: (user: User) => void;
  onSetPassword: (user: User) => void;
  onDelete: (user: User) => void;
  onActivate: (user: User) => void;
  onPromote: (user: User) => void;
}

export function UserTable({
  users,
  listLoading,
  currentUserId,
  inlineAction,
  isProtected,
  canEdit,
  onEdit,
  onSetPassword,
  onDelete,
  onActivate,
  onPromote,
}: UserTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-100 bg-surface-50">
            <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Nome</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">E-mail</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Role</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Criado em</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-50">
          {listLoading ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center">
                <div className="flex items-center justify-center gap-2 text-surface-500">
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Carregando usuários...
                </div>
              </td>
            </tr>
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-surface-400 text-sm">
                Nenhum usuário encontrado.
              </td>
            </tr>
          ) : (
            users.map((user) => {
              const isInlineLoading = inlineAction?.id === user.id;
              const protected_ = isProtected(user);
              const isSelf = user.id === currentUserId;
              const editAllowed = canEdit(user);

              return (
                <tr
                  key={user.id}
                  className={`hover:bg-surface-50 transition-colors ${protected_ ? 'bg-amber-50/40' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 shrink-0">
                        {user.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-surface-900">{user.name}</span>
                        {protected_ && (
                          <span
                            title="Primeiro admin — protegido"
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 ring-1 ring-amber-200"
                          >
                            🛡 Owner
                          </span>
                        )}
                        {isSelf && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-surface-100 text-surface-500">
                            você
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-surface-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-4 py-3">
                    <ActiveBadge isActive={user.isActive} />
                  </td>
                  <td className="px-4 py-3 text-surface-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Definir senha */}
                      <button
                        title={protected_ ? 'Owner não pode ter senha alterada' : 'Definir senha'}
                        disabled={protected_}
                        onClick={() => { if (!protected_) onSetPassword(user); }}
                        className={`btn-ghost p-1.5 transition-colors ${
                          protected_
                            ? 'opacity-30 cursor-not-allowed'
                            : 'text-surface-500 hover:text-amber-600'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </button>

                      {/* Editar — apenas o próprio usuário pode editar a si mesmo */}
                      <button
                        title={!editAllowed ? 'Você só pode editar seu próprio usuário' : 'Editar'}
                        disabled={!editAllowed}
                        onClick={() => { if (editAllowed) onEdit(user); }}
                        className={`btn-ghost p-1.5 transition-colors ${
                          !editAllowed
                            ? 'opacity-30 cursor-not-allowed'
                            : 'text-surface-500 hover:text-brand-600'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>

                      {!user.isActive && (
                        <button
                          title="Ativar"
                          disabled={isInlineLoading}
                          onClick={() => onActivate(user)}
                          className="btn-ghost p-1.5 text-surface-500 hover:text-green-600 disabled:opacity-40"
                        >
                          {isInlineLoading && inlineAction?.type === 'activate' ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                      )}

                      {user.role !== 'ADMIN' && (
                        <button
                          title="Promover para Admin"
                          disabled={isInlineLoading}
                          onClick={() => onPromote(user)}
                          className="btn-ghost p-1.5 text-surface-500 hover:text-brand-600 disabled:opacity-40"
                        >
                          {isInlineLoading && inlineAction?.type === 'promote' ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                          )}
                        </button>
                      )}

                      <button
                        title={protected_ ? 'Owner não pode ser excluído' : 'Excluir'}
                        disabled={protected_}
                        onClick={() => { if (!protected_) onDelete(user); }}
                        className={`btn-ghost p-1.5 transition-colors ${
                          protected_
                            ? 'opacity-30 cursor-not-allowed'
                            : 'text-surface-500 hover:text-red-500'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
