import './globals.css';
import logo from '../assets/LA_CLOTHES_Logotipo-04.png';

export const metadata = {
  title: 'Grupo LA | BI Command Center',
  description: 'Portal ejecutivo de inteligencia de negocio de Grupo LA',
  icons: {
    icon: logo.src,
    shortcut: logo.src,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
