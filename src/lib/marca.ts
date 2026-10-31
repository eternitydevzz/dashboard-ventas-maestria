// La marca de la app, en un solo sitio. Para poner la tuya:
// 1. Cambia aquí el nombre y la descripción.
// 2. Sustituye los logos de public/marca/ (logo.png cuadrado de 256 × 256 o más; logo-blanco.png, el mismo
//    dibujo en blanco con fondo transparente, para el chip del proyecto).
// 3. Los colores están en src/app/globals.css (--primario y --marca-acento).
// El remitente de los emails se cambia con la variable EMAIL_REMITENTE (ver .env.example).
export const EMPRESA = {
  nombre: "Tu Empresa",
  descripcion: "Panel de ventas",
  logo: "/marca/logo.png",
  logoBlanco: "/marca/logo-blanco.png",
  remitentePorDefecto: "Tu Empresa <no-reply@tudominio.com>",
} as const;
