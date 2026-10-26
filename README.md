# Avícola del Rey — sitio web

Sitio estático (HTML, CSS y JavaScript, sin dependencias) para vender huevos por bandeja o por caja. El cliente arma su pedido y lo envía como mensaje de WhatsApp ya redactado.

## Funciones

- Lista de precios por **bandejas** y **cajas**, con precio por huevo.
- Precio **mayorista automático** al llevar 2 cajas o más.
- Reglas de **envío gratis** (3+ bandejas o 1+ caja, dentro del Anillo Américo Vespucio).
- Verificador de comuna y guía de calibres.
- Carrito que se guarda en el navegador y envío del pedido por WhatsApp.
- Pago con tarjeta vía **Klap** como **maqueta**: simula el checkout (sin cobro ni datos de tarjeta) y luego envía el pedido por WhatsApp indicando que el pago fue simulado.
- Gallina animada que pone un huevo al agregar productos (o al hacerle clic) y banner principal animado. Las animaciones se desactivan si el sistema tiene activada la opción de reducir movimiento.

## Configuración

Edita la parte superior de `js/app.js`:

- `WHATSAPP_NUMBER`: número que recibe los pedidos, formato internacional sin `+` (ej. `56912345678`).
- `TRAYS` y `BOXES`: precios y productos.
- `COMUNAS_IN` y `COMUNAS_PARTIAL`: zona de despacho.
- `KLAP_PAYMENT`: nombre del medio de pago con tarjeta. Para conectar Klap de verdad, reemplaza la simulación en `openKlap` / `data-klap-pay` por la creación de la orden en la API de Klap (requiere un backend para guardar las credenciales del comercio).

## Imágenes

`assets/img/` contiene el logo, la escena del encabezado y las fotos de bandejas y cajas, recortadas del afiche original (`assets/flyer.jpg`).

El logo fue escalado con IA (Real-ESRGAN, dos pasadas ×4) y recortado con fondo transparente:

- `marca/logo-avicola-del-rey-uhd.png`: versión maestra de 3240 × 3629 px, para imprenta, redes sociales o etiquetas.
- `assets/img/logo.webp` (1200 px) y `assets/img/logo-sm.webp` (256 px): versiones livianas que usa la página.

Si consigues el archivo original del diseñador, reemplaza estos archivos manteniendo el mismo nombre.

## Publicar

Al ser un sitio estático, basta con subir la carpeta a GitHub Pages, Netlify o Vercel. Para probar localmente, abre `index.html` en el navegador.
