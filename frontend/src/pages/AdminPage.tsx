import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useAdmin } from '@/hooks/useAdmin';
import { UserTable } from '@/components/admin/UserTable';
import { UserFilters } from '@/components/admin/UserFilters';
import { UserForm } from '@/components/admin/UserForm';
import { SetPasswordForm } from '@/components/admin/SetPasswordForm';
import { ConfirmDelete } from '@/components/admin/ConfirmDelete';
import type { User } from '@/services/admin.service';

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; user: User }
  | { type: 'set-password'; user: User }
  | { type: 'delete'; user: User }
  | null;

export function AdminPage() {
  const [modal, setModal] = useState<ModalState>(null);

  const {
    currentUserId,
    users,
    meta,
    firstAdminId,
    search,
    roleFilter,
    activeFilter,
    listLoading,
    listError,
    actionLoading,
    actionError,
    inlineAction,
    setPage,
    setSearch,
    setRoleFilter,
    setActiveFilter,
    setActionError,
    isProtected,
    canEdit,
    clearFilters,
    handleCreate,
    handleUpdate,
    handleSetPassword,
    handleDelete,
    handleActivate,
    handlePromote,
  } = useAdmin();

  const closeModal = () => setModal(null);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Painel Administrativo</h1>
          <p className="text-sm text-surface-500">Gerenciamento de usuários do sistema</p>
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

      {/* Filtros */}
      <UserFilters
        search={search}
        roleFilter={roleFilter}
        activeFilter={activeFilter}
        onSearchChange={setSearch}
        onRoleChange={setRoleFilter}
        onActiveChange={setActiveFilter}
        onClear={clearFilters}
      />

      {/* Erro de listagem */}
      {listError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {listError}
        </div>
      )}

      {/* Tabela */}
      <div className="card overflow-hidden">
        <UserTable
          users={users}
          listLoading={listLoading}
          currentUserId={currentUserId}
          inlineAction={inlineAction}
          isProtected={isProtected}
          canEdit={canEdit}
          onEdit={(user) => { setActionError(null); setModal({ type: 'edit', user }); }}
          onSetPassword={(user) => { setActionError(null); setModal({ type: 'set-password', user }); }}
          onDelete={(user) => { setActionError(null); setModal({ type: 'delete', user }); }}
          onActivate={handleActivate}
          onPromote={handlePromote}
        />

        {meta && meta.totalPages > 1 && (
          <div className="px-4 py-4 border-t border-surface-100">
            <Pagination meta={meta} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Modal — Criar */}
      <Modal open={modal?.type === 'create'} onClose={closeModal} title="Criar usuário">
        <UserForm
          onSubmit={(payload) => handleCreate(payload, closeModal)}
          loading={actionLoading}
          error={actionError}
        />
      </Modal>

      {/* Modal — Editar (apenas o próprio usuário) */}
      <Modal open={modal?.type === 'edit'} onClose={closeModal} title="Editar usuário">
        {modal?.type === 'edit' && (
          <UserForm
            initial={modal.user}
            onSubmit={(payload) => handleUpdate(modal.user.id, payload, closeModal)}
            loading={actionLoading}
            error={actionError}
            isSelf={modal.user.id === currentUserId}
            isProtectedUser={
              modal.user.id === firstAdminId && modal.user.id === currentUserId
            }
          />
        )}
      </Modal>

      {/* Modal — Definir senha */}
      <Modal open={modal?.type === 'set-password'} onClose={closeModal} title="Definir senha" width="max-w-sm">
        {modal?.type === 'set-password' && (
          <SetPasswordForm
            user={modal.user}
            onSubmit={(password) => handleSetPassword(modal.user.id, password, closeModal)}
            loading={actionLoading}
            error={actionError}
          />
        )}
      </Modal>

      {/* Modal — Excluir */}
      <Modal open={modal?.type === 'delete'} onClose={closeModal} title="Excluir usuário" width="max-w-sm">
        {modal?.type === 'delete' && (
          <ConfirmDelete
            user={modal.user}
            onConfirm={() => handleDelete(modal.user.id, closeModal)}
            onCancel={closeModal}
            loading={actionLoading}
            error={actionError}
          />
        )}
      </Modal>
    </div>
  );
}
