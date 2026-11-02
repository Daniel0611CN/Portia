# Portia

Entrega local del MVP de Portia, basada en la Fase 1 del plan de arquitectura:

- landing responsive con la identidad visual definida;
- navegación por secciones y menú móvil;
- tema claro/oscuro persistente;
- logo y sistema de marca consistente;
- demo de usuario de GitHub con validación local;
- sección de fuentes e integraciones locales para GitHub, LinkedIn, Notion y datos propios;
- selector de plantillas;
- precios, FAQ y CTA;
- registro e inicio de sesión local;
- panel privado, cierre de sesión y borrado de cuenta;
- perfil profesional editable con persistencia local;
- editor básico de portfolio con vista previa en vivo y borrador local;
- espacio privado con vistas de resumen, perfil y portfolio;
- hash de contraseñas con Web Crypto, PBKDF2-SHA-256, sal aleatoria y comparación constante;
- Content Security Policy restrictiva: solo permite consultar `https://api.github.com` cuando el usuario solicita una importación.

## Ejecutar

No necesita dependencias ni build para revisar esta entrega. Sirve los archivos con cualquier servidor estático:

```powershell
python -m http.server 4173
```

Después abre `http://localhost:4173`.

## Seguridad y alcance

Esta versión es **local-first**: las cuentas, perfiles, portfolios y snapshots importados se almacenan en el navegador actual. La base de datos usa IndexedDB (`portia-local-database`) y mantiene `localStorage` como compatibilidad para los datos creados en versiones anteriores. La contraseña nunca se guarda en claro.

No es todavía un sistema de autenticación de producción ni permite recuperar cuentas entre dispositivos. Para el lanzamiento habrá que sustituir esta capa por Supabase Auth con GitHub OAuth, email verificado, recuperación, cierre global, RLS y una API Hono con validación de JWT. Hasta entonces, no se debe usar esta demo para datos reales.

GitHub ya dispone de una importación explícita de datos públicos. Portia intenta leer el README principal del perfil (`usuario/usuario`) y añade automáticamente los repositorios que aparecen allí y que también tienen README propio. Cada repositorio conserva todos los lenguajes devueltos por `/languages`, no solo el lenguaje principal. Para las imágenes se prioriza una captura del sitio desplegado cuando existe `homepage`; si no, se usa la imagen asociada al proyecto en el README del perfil y después una imagen del README del propio repositorio. Los repositorios sin README o no mencionados no se muestran automáticamente: aparecen en un selector para que el usuario decida cuáles quiere añadir. Se guarda un snapshot local y los proyectos se convierten en una galería de cards interactiva con descripción, lenguajes, estrellas, topics y modal de detalle. El modal incluye enlaces directos al repositorio, README y web desplegada cuando están disponibles.

La galería y los portfolios creados siguen siendo locales: todavía no existe una URL pública, subida de imágenes personalizadas ni publicación persistente en servidor. Las imágenes Open Graph se solicitan desde `opengraph.githubassets.com` únicamente para mostrar previews de repositorios.

El MVP incluye límites locales por plan: Gratis permite 1 portfolio y 1 exportación HTML al mes; Pro y Descarga permiten hasta 5 portfolios, con exportación ilimitada o limitada a 5 exportaciones respectivamente. La exportación genera un HTML descargable con una marca de Portia. La selección de plan se persiste por cuenta en el navegador; los importes son una simulación de producto y el cobro real requiere integrar Stripe Checkout, webhooks y un backend.

Cada portfolio también conserva una temática visual independiente: Minimalista, Alegre, Divertida, Elegante o Tech. La temática modifica la paleta, fondos, tipografía y tratamiento visual de la vista previa y se aplica igualmente al HTML exportado.

La exportación genera una página HTML completa con navegación, contenido principal y pie de página. El plan Gratis incluye un estilo base, mientras que Pro y Descarga añaden logo generado con iniciales, tipografías, tarjetas con imágenes y estilos avanzados. Las exportaciones gratuitas muestran un aviso de mejora hacia Pro.

El editor permite elegir el modo Claro u Oscuro del portfolio exportado, independientemente del tema de la aplicación. También incluye branding por portfolio: nombre de marca, iniciales, color principal y estilo de logo (monograma, nombre o insignia). En Pro y Descarga estos datos se reflejan en la marca visual de la web exportada; Gratis conserva la marca base de Portia y muestra la invitación a mejorar el plan.

La navegación de la web exportada reserva espacio para el header sticky al saltar a Inicio, Sobre mí o Proyectos. Las imágenes de previews de despliegues se capturan desde la página inicial publicada mediante Microlink; si el servicio no está disponible se conserva el fallback de `image.thum.io` y, finalmente, el preview de GitHub. Malaga-Tech-Calendar usa ahora la captura real de su web publicada, no la imagen del repositorio.

## Publicación

Portia es una aplicación estática y puede publicarse directamente en GitHub Pages. El repositorio incluye `.nojekyll` para que GitHub sirva los archivos sin procesado adicional. La aplicación mantiene el almacenamiento de cuentas, perfiles y portfolios en el navegador de cada visitante; no hay backend ni sincronización entre dispositivos en esta versión.
