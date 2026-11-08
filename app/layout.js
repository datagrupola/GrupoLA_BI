import './globals.css';
import logo from '../assets/LA_CLOTHES_Logotipo-04.png';

export const metadata = {
  title: 'Grupo LA BI | Inteligencia comercial',
  description: 'Dashboard ejecutivo de La Rousse: ventas, proyecciones, productividad y desempeño por sucursal.',
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
