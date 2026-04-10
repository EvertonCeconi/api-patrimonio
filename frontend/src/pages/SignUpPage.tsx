import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '@/services/auth.service';

function extractApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const data = (err as { response?: { data?: unknown } }).response?.data;

    if (data && typeof data === 'object') {
      if ('errors' in data && Array.isArray((data as { errors: unknown[] }).errors)) {
        const fieldErrors = (data as { errors: { field: string; code: string }[] }).errors;
        return fieldErrors
          .map(({ field, code }) => `${field}: ${code}`)
          .join(', ');
      }

      if ('message' in data) {
        const msg = (data as { message: string | string[] }).message;
        if (Array.isArray(msg)) return msg.join(', ');
        if (typeof msg === 'string') return msg;
      }
    }
  }
  return 'Erro inesperado. Tente novamente.';
}

export function SignUpPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.signUp(form);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-surface-900 tracking-tight">
            <span className="text-brand-600">Patri</span>mônio
          </h1>
          <p className="mt-1 text-sm text-surface-600">Crie sua conta</p>
        </div>

        <div className="card p-6">
          {success ? (
            <div className="text-center space-y-3 py-2">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-surface-900">Conta criada com sucesso!</p>
              <p className="text-sm text-surface-500">
                Aguarde a ativação pelo administrador antes de fazer login. Redirecionando…
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="label">Nome</label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  placeholder="Seu nome"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  minLength={2}
                />
              </div>

              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="seu@email.com"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label htmlFor="password" className="label">Senha</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="Mínimo 8 caracteres"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button type="submit" className="btn-primary w-full" disabled={loading}>
                {loading ? 'Criando conta…' : 'Criar conta'}
              </button>
            </form>
          )}
        </div>

        {!success && (
          <p className="text-center text-sm text-surface-600 mt-4">
            Já tem conta?{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
