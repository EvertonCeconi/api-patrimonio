import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { adminService } from '@/services/admin.service';
import { useAuthStore } from '@/store/auth.store';
import type { User, GetUsersParams, CreateUserPayload, UpdateUserPayload } from '@/services/admin.service';
import type { PaginationMeta } from '@/types';

// ─── Error extractor ─────────────────────────────────────────────────────────
// Suporta:
//   { message: string | string[] }                    → NestJS padrão
//   { errors: [{ field: string; code: string }] }     → class-validator customizado

function extractErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: unknown } }).response?.data;

    if (data && typeof data === 'object') {
      // Formato class-validator: { errors: [{ field, code }] }
      if ('errors' in data && Array.isArray((data as { errors: unknown[] }).errors)) {
        const fieldErrors = (data as { errors: { field: string; code: string }[] }).errors;
        return fieldErrors.map(({ field, code }) => `${field}: ${code}`).join(', ');
      }

      // Formato NestJS padrão: { message: string | string[] }
      if ('message' in data) {
        const msg = (data as { message: string | string[] }).message;
        if (Array.isArray(msg)) return msg.join(', ');
        if (typeof msg === 'string') return msg;
      }
    }
  }
  return 'Erro inesperado. Tente novamente.';
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${
      role === 'ADMIN'
        ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
        : 'bg-surface-100 text-surface-600 ring-1 ring-surface-200'
    }`}>
      {role}
    </span>
  );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
      isActive
        ? 'bg-green-50 text-green-700 ring-1 ring-green-200'
        : 'bg-red-50 text-red-600 ring-1 ring-red-200'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-500' : 'bg-red-400'}`} />
      {isActive ? 'Ativo' : 'Inativo'}
    </span>
  );
}

// ─── User Form ────────────────────────────────────────────────────────────────

interface UserFormProps {
  initial?: User | null;
  onSubmit: (payload: CreateUserPayload | UpdateUserPayload) => Promise<void>;
  loading: boolean;
  error: string | null;
}

function UserForm({ initial, onSubmit, loading, error }: UserFormProps) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'USER'>(initial?.role ?? 'USER');
  const [isActive, setIsActive] = useState(initial?.isActive ?? false);

  const handleSubmit = async () => {
    const payload: CreateUserPayload | UpdateUserPayload = isEdit
      ? {
          ...(name !== initial?.name && { name }),
          ...(email !== initial?.email && { email }),
          ...(password && { password }),
          ...(role !== initial?.role && { role }),
          ...(isActive !== initial?.isActive && { isActive }),
        }
      : { name, email, password, role, isActive };

    await onSubmit(payload);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">Nome</label>
        <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome completo" />
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">E-mail</label>
        <input className="input w-full" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
      </div>

      <div>
        <label className="block text-xs font-medium text-surface-700 mb-1">
          Senha {isEdit && <span className="text-surface-400">(deixe em branco para manter)</span>}
        </label>
        <input className="input w-full" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isEdit ? '••••••••' : 'Mínimo 8 caracteres'} />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-surface-700 mb-1">Role</label>
          <select className="input w-full" value={role} onChange={(e) => setRole(e.target.value as 'ADMIN' | 'USER')}>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>

        <div className="flex-1 flex flex-col justify-end">
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <span className="text-xs font-medium text-surface-700">Ativo</span>
            <div onClick={() => setIsActive((v) => !v)} className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${isActive ? 'bg-brand-600' : 'bg-surface-200'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-4' : ''}`} />
            </div>
          </label>
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button onClick={handleSubmit} disabled={loading} className="btn-primary min-w-[120px] justify-center">
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Salvando...
            </span>
          ) : isEdit ? 'Salvar alterações' : 'Criar usuário'}
        </button>
      </div>
    </div>
  );
}

// ─── Confirm Delete ───────────────────────────────────────────────────────────

interface ConfirmDeleteProps {
  user: User;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  error: string | null;
}

function ConfirmDelete({ user, onConfirm, onCancel, loading, error }: ConfirmDeleteProps) {
  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <p className="text-sm text-surface-700">
        Tem certeza que deseja excluir o usuário{' '}
        <span className="font-semibold text-surface-900">{user.name}</span>? Esta ação não pode ser desfeita.
      </p>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-secondary">Cancelar</button>
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

// ─── Main AdminPage ───────────────────────────────────────────────────────────

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; user: User }
  | { type: 'delete'; user: User }
  | null;

const LIMIT = 10;

export function AdminPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [firstAdminId, setFirstAdminId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');

  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [inlineAction, setInlineAction] = useState<{ id: string; type: string } | null>(null);

  // ─── Busca o primeiro admin criado (menor createdAt com role ADMIN) ──────

  const fetchFirstAdmin = useCallback(async () => {
    try {
      // Busca admins ordenados por createdAt asc com limit=1
      // Como a API só ordena desc, buscamos todos admins e pegamos o mais antigo
      const res = await adminService.getUsers({ role: 'ADMIN', limit: 100, page: 1 });
      if (res.data.length > 0) {
        const oldest = res.data.reduce((prev, curr) =>
          new Date(curr.createdAt) < new Date(prev.createdAt) ? curr : prev
        );
        setFirstAdminId(oldest.id);
      }
    } catch {
      // silencioso — proteção best-effort
    }
  }, []);

  // ─── Fetch users ──────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params: GetUsersParams = { page, limit: LIMIT };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (activeFilter !== '') params.isActive = activeFilter === 'true';

      const res = await adminService.getUsers(params);
      setUsers(res.data);
      setMeta(res.meta);
    } catch (err) {
      setListError(extractErrorMessage(err));
    } finally {
      setListLoading(false);
    }
  }, [page, search, roleFilter, activeFilter]);

  useEffect(() => { fetchFirstAdmin(); }, [fetchFirstAdmin]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, roleFilter, activeFilter]);

  // ─── Verifica se usuário é o primeiro admin (protegido) ──────────────────

  const isProtected = (user: User) => user.id === firstAdminId;

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleCreate = async (payload: CreateUserPayload | UpdateUserPayload) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await adminService.createUser(payload as CreateUserPayload);
      setModal(null);
      fetchUsers();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (id: string, payload: CreateUserPayload | UpdateUserPayload) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await adminService.updateUser(id, payload as UpdateUserPayload);
      setModal(null);
      fetchUsers();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await adminService.deleteUser(id);
      setModal(null);
      fetchUsers();
    } catch (err) {
      setActionError(extractErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (user: User) => {
    setInlineAction({ id: user.id, type: 'activate' });
    try {
      await adminService.activateUser(user.id);
      fetchUsers();
    } catch (err) {
      setListError(extractErrorMessage(err));
    } finally {
      setInlineAction(null);
    }
  };

  const handlePromote = async (user: User) => {
    setInlineAction({ id: user.id, type: 'promote' });
    try {
      await adminService.promoteUser(user.id);
      fetchUsers();
    } catch (err) {
      setListError(extractErrorMessage(err));
    } finally {
      setInlineAction(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-surface-900">Painel Administrativo</h1>
          <p className="text-sm text-surface-500 mt-0.5">Gerenciamento de usuários do sistema</p>
        </div>
        <button
          onClick={() => { setActionError(null); setModal({ type: 'create' }); }}
          className="btn-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo usuário
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input w-full pl-9"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select className="input min-w-[140px]" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">Todas as roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="USER">USER</option>
        </select>

        <select className="input min-w-[140px]" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as '' | 'true' | 'false')}>
          <option value="">Todos os status</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>

        {(search || roleFilter || activeFilter) && (
          <button className="btn-ghost text-surface-500" onClick={() => { setSearch(''); setRoleFilter(''); setActiveFilter(''); }}>
            Limpar filtros
          </button>
        )}
      </div>

      {/* Error banner */}
      {listError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {listError}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
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

                  return (
                    <tr key={user.id} className={`hover:bg-surface-50 transition-colors ${protected_ ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-semibold text-brand-700 shrink-0">
                            {user.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-surface-900">{user.name}</span>
                            {protected_ && (
                              <span title="Primeiro admin — protegido" className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 ring-1 ring-amber-200">
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
                      <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                      <td className="px-4 py-3"><ActiveBadge isActive={user.isActive} /></td>
                      <td className="px-4 py-3 text-surface-500 text-xs">
                        {new Date(user.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Editar — bloqueado para o primeiro admin */}
                          <button
                            title={protected_ ? 'Owner não pode ser editado' : 'Editar'}
                            disabled={protected_}
                            onClick={() => { if (!protected_) { setActionError(null); setModal({ type: 'edit', user }); } }}
                            className={`btn-ghost p-1.5 transition-colors ${protected_ ? 'opacity-30 cursor-not-allowed' : 'text-surface-500 hover:text-brand-600'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>

                          {/* Ativar */}
                          {!user.isActive && (
                            <button
                              title="Ativar"
                              disabled={isInlineLoading}
                              onClick={() => handleActivate(user)}
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

                          {/* Promover */}
                          {user.role !== 'ADMIN' && (
                            <button
                              title="Promover para Admin"
                              disabled={isInlineLoading}
                              onClick={() => handlePromote(user)}
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

                          {/* Excluir — bloqueado para o primeiro admin */}
                          <button
                            title={protected_ ? 'Owner não pode ser excluído' : 'Excluir'}
                            disabled={protected_}
                            onClick={() => { if (!protected_) { setActionError(null); setModal({ type: 'delete', user }); } }}
                            className={`btn-ghost p-1.5 transition-colors ${protected_ ? 'opacity-30 cursor-not-allowed' : 'text-surface-500 hover:text-red-500'}`}
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

        {meta && meta.totalPages > 1 && (
          <div className="px-4 py-4 border-t border-surface-100">
            <Pagination meta={meta} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal open={modal?.type === 'create'} onClose={() => setModal(null)} title="Criar usuário">
        <UserForm onSubmit={handleCreate} loading={actionLoading} error={actionError} />
      </Modal>

      <Modal open={modal?.type === 'edit'} onClose={() => setModal(null)} title="Editar usuário">
        {modal?.type === 'edit' && (
          <UserForm
            initial={modal.user}
            onSubmit={(payload) => handleUpdate(modal.user.id, payload)}
            loading={actionLoading}
            error={actionError}
          />
        )}
      </Modal>

      <Modal open={modal?.type === 'delete'} onClose={() => setModal(null)} title="Excluir usuário" width="max-w-sm">
        {modal?.type === 'delete' && (
          <ConfirmDelete
            user={modal.user}
            onConfirm={() => handleDelete(modal.user.id)}
            onCancel={() => setModal(null)}
            loading={actionLoading}
            error={actionError}
          />
        )}
      </Modal>
    </div>
  );
}
