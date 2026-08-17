import './globals.css';

export const metadata = {
  title: 'Grupo LA | BI Command Center',
  description: 'Portal ejecutivo de inteligencia de negocio de Grupo LA',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
