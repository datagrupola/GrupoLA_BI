export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const hasError = params?.error === '1';

  return (
    <main className="password-gate">
      <section className="password-card">
        <h1>Acceso restringido</h1>
        <p>Ingresa la contraseña para acceder al panel de BI.</p>

        <form id="password-form" action="/api/login" method="POST">
          <input
            id="password-input"
            type="password"
            name="password"
            placeholder="Contraseña"
            autoComplete="current-password"
            required
            autoFocus
          />
          <button type="submit">Entrar</button>
        </form>

        <p className="password-error" aria-live="polite">
          {hasError ? 'Contraseña incorrecta' : ''}
        </p>
      </section>
    </main>
  );
}
