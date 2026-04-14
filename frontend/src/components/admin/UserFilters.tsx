interface UserFiltersProps {
  search: string;
  roleFilter: string;
  activeFilter: '' | 'true' | 'false';
  onSearchChange: (v: string) => void;
  onRoleChange: (v: string) => void;
  onActiveChange: (v: '' | 'true' | 'false') => void;
  onClear: () => void;
}

export function UserFilters({
  search,
  roleFilter,
  activeFilter,
  onSearchChange,
  onRoleChange,
  onActiveChange,
  onClear,
}: UserFiltersProps) {
  const hasFilters = !!(search || roleFilter || activeFilter);

  return (
    <div className="card p-4 flex flex-wrap gap-3">
      <div className="flex-1 min-w-[200px] relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="input w-full pl-9"
          placeholder="Buscar por nome ou e-mail..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <select
        className="input min-w-[140px]"
        value={roleFilter}
        onChange={(e) => onRoleChange(e.target.value)}
      >
        <option value="">Todas as roles</option>
        <option value="ADMIN">ADMIN</option>
        <option value="USER">USER</option>
      </select>

      <select
        className="input min-w-[140px]"
        value={activeFilter}
        onChange={(e) => onActiveChange(e.target.value as '' | 'true' | 'false')}
      >
        <option value="">Todos os status</option>
        <option value="true">Ativos</option>
        <option value="false">Inativos</option>
      </select>

      {hasFilters && (
        <button className="btn-ghost text-surface-500" onClick={onClear}>
          Limpar filtros
        </button>
      )}
    </div>
  );
}
