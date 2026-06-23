import { useState, useEffect, useCallback } from 'react';
import { adminService } from '@/services/admin.service';
import { useAuthStore } from '@/store/auth.store';
import { extractApiError } from '@/lib/extractError';
import type { User, GetUsersParams, CreateUserPayload, UpdateUserPayload } from '@/services/admin.service';
import type { PaginationMeta } from '@/types';

const USERS_PAGE_LIMIT = 50;
const MAX_ADMINS_TO_FETCH = 100;

export function useAdmin() {
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
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [inlineAction, setInlineAction] = useState<{ id: string; type: string } | null>(null);

  const fetchFirstAdmin = useCallback(async () => {
    try {
      const res = await adminService.getUsers({ role: 'ADMIN', limit: MAX_ADMINS_TO_FETCH, page: 1 });
      if (res.data.length > 0) {
        const oldest = res.data.reduce((prev, curr) =>
          new Date(curr.createdAt) < new Date(prev.createdAt) ? curr : prev
        );
        setFirstAdminId(oldest.id);
      }
    } catch {
      // silencioso
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const params: GetUsersParams = { page, limit: USERS_PAGE_LIMIT };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (activeFilter !== '') params.isActive = activeFilter === 'true';
      const res = await adminService.getUsers(params);
      setUsers(res.data);
      setMeta(res.meta);
    } catch (err) {
      setListError(extractApiError(err));
    } finally {
      setListLoading(false);
    }
  }, [page, search, roleFilter, activeFilter]);

  useEffect(() => { fetchFirstAdmin(); }, [fetchFirstAdmin]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => { setPage(1); }, [search, roleFilter, activeFilter]);

  const isProtected = (user: User) => user.id === firstAdminId;

  // Owner só pode ser editado por ele mesmo; demais usuários qualquer admin pode editar
  const canEdit = (user: User) => !isProtected(user) || user.id === currentUserId;

  const handleCreate = async (
    payload: CreateUserPayload | UpdateUserPayload,
    onSuccess: () => void
  ) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await adminService.createUser(payload as CreateUserPayload);
      onSuccess();
      fetchUsers();
    } catch (err) {
      setActionError(extractApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (
    id: string,
    payload: CreateUserPayload | UpdateUserPayload,
    onSuccess: () => void
  ) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await adminService.updateUser(id, payload as UpdateUserPayload);
      onSuccess();
      fetchUsers();
    } catch (err) {
      setActionError(extractApiError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string, onSuccess: () => void) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await adminService.deleteUser(id);
      onSuccess();
      fetchUsers();
    } catch (err) {
      setActionError(extractApiError(err));
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
      setListError(extractApiError(err));
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
      setListError(extractApiError(err));
    } finally {
      setInlineAction(null);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setRoleFilter('');
    setActiveFilter('');
  };

  return {
    // state
    currentUserId,
    users,
    meta,
    firstAdminId,
    page,
    search,
    roleFilter,
    activeFilter,
    listLoading,
    listError,
    actionLoading,
    actionError,
    inlineAction,
    // setters
    setPage,
    setSearch,
    setRoleFilter,
    setActiveFilter,
    setActionError,
    // helpers
    isProtected,
    canEdit,
    clearFilters,
    // actions
    handleCreate,
    handleUpdate,
    handleDelete,
    handleActivate,
    handlePromote,
  };
}
