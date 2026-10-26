# Avícola del Rey — sitio web

Sitio estático (HTML, CSS y JavaScript, sin dependencias) para vender huevos por bandeja o por caja. El cliente arma su pedido y lo envía como mensaje de WhatsApp ya redactado.

## Funciones

- Lista de precios por **bandejas** y **cajas**, con precio por huevo.
- Precio **mayorista automático** al llevar 2 cajas o más.
- Reglas de **envío gratis** (3+ bandejas o 1+ caja, dentro del Anillo Américo Vespucio).
- Verificador de comuna y guía de calibres.
- Carrito que se guarda en el navegador y envío del pedido por WhatsApp.

## Configuración

Edita la parte superior de `js/app.js`:

- `WHATSAPP_NUMBER`: número que recibe los pedidos, formato internacional sin `+` (ej. `56912345678`).
- `TRAYS` y `BOXES`: precios y productos.
- `COMUNAS_IN` y `COMUNAS_PARTIAL`: zona de despacho.

## Imágenes

`assets/img/` contiene el logo, la escena del encabezado y las fotos de bandejas y cajas, todas recortadas del afiche original (`assets/flyer.jpg`). Si consigues versiones en mayor resolución (por ejemplo, el logo original del diseñador), reemplaza estos archivos manteniendo el mismo nombre.

## Publicar

Al ser un sitio estático, basta con subir la carpeta a GitHub Pages, Netlify o Vercel. Para probar localmente, abre `index.html` en el navegador.
