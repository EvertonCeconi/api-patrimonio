import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export function SignUpPage() {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(form);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setError('Este email já está cadastrado.');
      } else {
        setError('Erro ao criar conta. Tente novamente.');
      }
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
        </div>

        <p className="text-center text-sm text-surface-600 mt-4">
          Já tem conta?{' '}
          <Link to="/login" className="text-brand-600 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
