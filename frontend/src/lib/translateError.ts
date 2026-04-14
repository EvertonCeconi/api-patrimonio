export function translateError(error: { field: string; code: string; meta?: any }) {
  const map: Record<string, string> = {
    INVALID_FIELD: 'Campo inválido',
    REQUIRED: 'Campo obrigatório',

    INVALID_ENUM: 'Valor inválido',
    INVALID_EMAIL: 'E-mail inválido',
    INVALID_TYPE: 'Tipo inválido',
    INVALID_BOOLEAN: 'Valor inválido',
    INVALID_NUMBER: 'Número inválido',

    MIN_LENGTH: 'Muito curto',
    MAX_LENGTH: 'Muito longo',

    MIN_VALUE: 'Valor muito baixo',
    MAX_VALUE: 'Valor muito alto',
  };

  const fieldMap: Record<string, string> = {
    ipAddress: 'IP',
    name: 'Nome',
    model: 'Modelo',
    location: 'Localização',
    email: 'E-mail',
    password: 'Senha',
    role: 'Permissão',
    isActive: 'Ativo',
    page: 'Página',
    limit: 'Limite',
  };

  const field = fieldMap[error.field] ?? error.field;

  // 🔥 tratamento inteligente com meta
  if (error.code === 'MIN_LENGTH' && error.meta?.min) {
    return `${field}: mínimo de ${error.meta.min} caracteres`;
  }

  if (error.code === 'MAX_LENGTH' && error.meta?.max) {
    return `${field}: máximo de ${error.meta.max} caracteres`;
  }

  if (error.code === 'MIN_VALUE' && error.meta?.min !== undefined) {
    return `${field}: valor mínimo ${error.meta.min}`;
  }

  if (error.code === 'MAX_VALUE' && error.meta?.max !== undefined) {
    return `${field}: valor máximo ${error.meta.max}`;
  }

  const message = map[error.code] ?? error.code;

  return `${field}: ${message}`;
}
