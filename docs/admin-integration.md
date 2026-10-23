# Administración y Control Académico MECRO

## Decisiones confirmadas e implementadas

1. **Los alumnos activos conservan sus grabaciones y reciben todos los materiales nuevos**:
   - Tanto `DRONES_101` como `DRONES_102` reciben acceso al programa actualizado de Drones (`uav`) en [`server/course-access.json`](../server/course-access.json) y conservan las grabaciones históricas de su grupo (`G1`, `G2`, `G3`, `G4`, `G5`…) en [`portal.html`](../portal.html) y [`aula.html`](../aula.html).
   - `ES32_AUTOMATION` conserva sus 17 sesiones históricas grabadas y recibe acceso al programa actualizado de ESP32 (`esp32`).

2. **Cuenta de Administrador (`admin@macro.pe` / `admin@mecro.pe`) y Panel de Control ([`admin.html`](../admin.html) y [`apps-script/Admin.html`](../apps-script/Admin.html))**:
   - Puedes iniciar sesión desde [`login.html`](../login.html) escribiendo `admin@macro.pe` (o `admin@mecro.pe`) y tu clave de administrador, o entrar directamente en [`admin.html`](../admin.html).
   - **Matriz de verificación por grupo**: Muestra tarjetas de progreso (`G1: 5/8 subidas`, `G2: 7/8 subidas`, `G4: 3/8 subidas`…) y el estado de cada clase (`✓ Subida` con enlace para comprobar el video o `⏳ Falta subir` con botón **“Subir aquí”** en 1 clic).
   - **Bandeja de Google Meet (Drive)**: Lista los videos de tu carpeta de grabaciones en Drive (`16cgDq8G7eV2F8Jn12z6XHA7K97USkkqV`) e identifica automáticamente cuáles son **🟢 Nuevos · Sin publicar** y cuáles ya fueron asignados a un curso/clase/grupo. También admite pegar directamente cualquier enlace de Drive recibido en Gmail.
   - **Matrícula rápida tras pago por Yape / Transferencia**:
     - Al escribir el nombre del alumno, autogenera su usuario institucional (`nombre.apellido@macro.pe` o `@mecro.com`, editable).
     - Genera su contraseña segura (almacenada como hash `TOKEN_SHA256:` en la hoja `Usuarios`).
     - Prepara el mensaje completo de bienvenida con un botón **“📋 Copiar mensaje”** y **“💬 Enviar por WhatsApp ↗”**.

## Cómo activarlo en tu Google Sheet (una sola vez)

1. Abre tu hoja de Google Sheets: `https://docs.google.com/spreadsheets/d/1h3M5PwykMt1g3JYuRATcrONLGUs3ngdoXKJwGs4bOYc/edit`
2. En el menú superior, entra a **Extensiones → Apps Script**.
3. Reemplaza el contenido de `Código.gs` por el archivo generado en [`.course-work/deploy/Code.gs`](../.course-work/deploy/Code.gs) y guarda (`Ctrl + S`).
4. En la barra superior del editor de Apps Script, selecciona la función **`configurarAdministrador`** (o **`regenerarClaveAdministrador`** si deseas emitir una clave nueva) y pulsa **Ejecutar**.
   - Copia la **clave de administrador** que aparece en el **Registro de ejecución** inferior.
5. Haz clic en **Implementar → Gestionar implementaciones → Editar (icono de lápiz) → Versión: Nueva versión → Implementar**.
