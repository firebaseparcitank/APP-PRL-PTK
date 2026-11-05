# Permiso de entrada · Espacios confinados

Esta guía explica, paso a paso, cómo publicar esta app web en tu proyecto de Firebase. No hace falta haber usado Firebase antes.

Orden de trabajo:
1. Instala Node.js y un editor de texto, y comprueba que sabes abrir el Símbolo del sistema en la carpeta de la app (apartado 2). La herramienta de Firebase se instala en el apartado 6.
2. Crea el proyecto de Firebase, la base de datos y el sitio de Hosting, y registra la app web (apartado 4).
3. Rellena la configuración de Firebase dentro de la app (apartado 5).
4. Sube las reglas de la base de datos y publica la app (apartado 6).
5. Comprueba que todo funciona (apartado 8).

Al final, un anexo explica cómo funciona la app y qué se puede cambiar. Para publicarla no hace falta leerlo.

Hay cuatro cosas que no se deben olvidar:
- Crear la base de datos en Madrid **antes** de subir las reglas (apartado 4.2).
- Rellenar el bloque `CONFIG` de `js/almacen-firebase.js`. Viene vacío, y mientras esté vacío la app no arranca (apartado 5).
- `firestore.rules` lleva escrita la fecha 15/11/2026. Desde ese momento, la base de datos lo deniega todo y la app deja de funcionar. Pon la fecha que necesites antes de subir las reglas (apartado 6, paso 8).
- La app no tiene inicio de sesión: cualquiera que tenga la URL puede ver, cambiar y borrar los permisos. Solo vale para probar con datos inventados (apartados 3 y 7).

En los comandos y ejemplos:
- `ID_DEL_PROYECTO` es el ID de tu proyecto de Firebase (apartado 4.1).
- `ID_DEL_SITIO` es el ID del sitio de Hosting (apartado 4.3). Normalmente coincide con el del proyecto.
- La URL de la app será `https://ID_DEL_SITIO.web.app`.

## 1. Qué hace la app

La app pasa al móvil el permiso de entrada a espacios confinados en papel (el que lleva en la cabecera los procedimientos PRL-PT-10 y PRL-PT-14). Tiene tres perfiles, y cada uno se abre con su URL. El OPERARIO (`…/#operario`) pide la entrada desde el móvil. El VIGILANTE (`…/#vigilante`) es el recurso preventivo y la aprueba o la deniega. PREVENCIÓN (`…/#prevencion`) es el verificador, y es opcional. Si la URL no lleva nada detrás, sale la pantalla de inicio, con un botón para cada perfil. Las personas que salen en la app son inventadas, y no se deben cambiar por personas reales (anexo, «Datos inventados»). En la pantalla de inicio está el interruptor «Modo demo», que viene activado: con él se puede pedir a cualquier hora y no mandan los turnos.

## 2. Qué hay que instalar y cómo probarla en el ordenador

Es una página web normal, hecha con HTML, CSS y JavaScript, sin frameworks, sin paquetes de npm y sin compilación. Los archivos de la carpeta se publican tal cual. Para cambiar la app, basta con editarlos.

Para cambiarla y publicarla hace falta:
1. **Un editor de texto**, por ejemplo Visual Studio Code o Notepad++.
2. **Node.js 24.** Se descarga de https://nodejs.org y trae `npm`. En la página de descarga, elige la 24 en el selector de versiones, aunque la que salga marcada como LTS sea otra. También vale la 22. Sirve para instalar la herramienta de Firebase y para probar la app en el ordenador.
3. **La herramienta de Firebase** (Firebase CLI). Se instala con npm (apartado 6, paso 2).
   - Si no se puede instalar Node.js en el ordenador, la página oficial (https://firebase.google.com/docs/cli) ofrece la herramienta para Windows como programa suelto (standalone binary), que no necesita Node.js. Descarga de esa página `firebase-tools-instant-win.exe` y ábrelo con doble clic. Se abre una ventana en la que ya funciona `firebase`. Usa esa ventana en el apartado 6 y sáltate los pasos 1 y 2.
   - Para probar la app en el ordenador con `servidor.js`, en cambio, sí hace falta Node.js.
4. **Una cuenta de Google.** Firebase se gestiona con cuentas de Google: con ella se crea el proyecto y se publica la app. Si no tienes ninguna, puedes crear una con un correo que ya tengas, también uno de trabajo. No hace falta crear una cuenta de Gmail.
5. **Chrome o Edge** en el ordenador, y uno o dos móviles para probar.

Antes de empezar:
- Si la carpeta viene en un zip, descomprímela: clic derecho > «Extraer todo…».
- Trabaja en la carpeta que tiene `firebase.json`, `index.html` y este `LEEME.md`. En esta guía es la «carpeta de la app».
- Los comandos de esta guía son para el **Símbolo del sistema** (cmd). Para abrirlo, pulsa la tecla Windows, escribe `cmd` y pulsa Intro.
- Para abrirlo ya dentro de la carpeta de la app: en el Explorador de archivos, entra en ella, haz clic en la barra de direcciones, escribe `cmd` y pulsa Intro.
- No uses PowerShell. Su política de ejecución puede bloquear `npm` y `firebase` con el error «la ejecución de scripts está deshabilitada en este sistema».
- Si usas Windows Terminal, abre una pestaña de «Símbolo del sistema».

### Probarla en el ordenador

Desde la carpeta de la app, ejecuta:

```
node servidor.js
```

Después abre http://localhost:8080 en el navegador. También puedes ir directamente a un perfil: `http://localhost:8080/#operario`, `#vigilante` o `#prevencion`.
- El servidor solo atiende a este ordenador. Desde un móvil no se llega.
- Se para con Ctrl+C.
- Si al arrancar sale un error con «EADDRINUSE», el puerto 8080 está ocupado. Ejecuta este comando en la misma ventana, vuelve a ejecutar `node servidor.js` y abre la URL que escribe (http://localhost:8081):

```
set PUERTO=8081
```

**Con Firebase:** probándola así, la app se conecta al proyecto de Firebase que esté configurado en `js/almacen-firebase.js`.
- Hasta que rellenes `CONFIG` (apartado 5), no arranca.
- Cuando esté rellenado y las reglas estén subidas (apartado 6, paso 8), la app usa la misma base de datos que la app publicada. Lo que hagas en el ordenador se verá en los móviles.

**Sin Firebase:** para probar sin configurar nada y sin tocar ninguna base de datos, añade `?almacen=local` antes del `#`:

```
http://localhost:8080/?almacen=local#operario
```

En ese modo la app no se conecta a Firebase:
- Los permisos se guardan solo en ese navegador.
- Las pestañas del mismo navegador se ven entre sí. Abre una pestaña con `#operario` y otra con `#vigilante`, las dos con `?almacen=local`.
- En la pantalla de inicio, abajo, pone «almacenamiento LOCAL».

## 3. Cómo está montada

Firebase es un servicio de Google que sirve para publicar webs (Hosting) y para guardar datos en la nube (Firestore, una base de datos sin tablas).
- Todo va dentro de un «proyecto» de Firebase, que se crea con una cuenta de Google.
- El proyecto se maneja desde la consola web o con la herramienta de Firebase.
- Firestore guarda «documentos», que son fichas con campos, parecidas a un JSON.
- Los documentos se agrupan en «colecciones», que funcionan como carpetas.

```
Navegador (móvil u ordenador)
 ├─ carga la app (HTML, CSS y JS) ................ Firebase Hosting (https://ID_DEL_SITIO.web.app)
 ├─ carga el SDK de Firebase 10.12.2 ............. www.gstatic.com
 └─ lee y escribe los permisos en tiempo real .... Cloud Firestore: base de datos (default), en Madrid
```

- **El SDK de Firebase no se instala.** La app lo descarga de `www.gstatic.com` al arrancar. Es la versión «compat» 10.12.2, indicada en la línea 17 de `js/almacen-firebase.js`.
- **No usa nada más de Firebase:** ni inicio de sesión (Authentication), ni Storage, ni Functions, ni Analytics.
- **Necesita internet** para funcionar.

### Archivos

| Archivo | Para qué sirve |
|---|---|
| `index.html` | Es la única página. Carga `css/estilos.css` y los 19 scripts de `js/`, en orden. |
| `js/config.js` | Ajustes: almacenamiento, oxígeno, secciones, turnos, «Modo demo» y fotos (anexo). |
| `js/datos-demo.js` | Las personas inventadas de la app. |
| `js/almacen-firebase.js` | Conexión con Firestore. Lleva el bloque `CONFIG`, que hay que rellenar (apartado 5). |
| `js/almacen-local.js` y `js/almacen.js` | El almacenamiento LOCAL (`?almacen=local`) y la elección entre los dos almacenamientos. |
| `js/permisos.js`, `js/reglas.js` y `js/turnos.js` | Qué le pasa a un permiso, qué impide pedir la entrada y los horarios. |
| `js/inicio.js`, `js/operario.js`, `js/vigilante.js` y `js/prevencion.js` | Las pantallas. |
| `js/app.js`, `js/vistas.js`, `js/util.js`, `js/camara.js`, `js/firma.js`, `js/sonido.js` y `js/iconos.js` | Arranque, partes de pantalla comunes (con la cabecera), utilidades, cámara, firma con el dedo, pitido y sirena, e iconos. |
| `css/estilos.css` | Estilos. |
| `manifest.webmanifest`, `sw.js` e `iconos/` | Lo necesario para instalarla como app: manifiesto, service worker e iconos. |
| `firebase.json` | Qué publica la herramienta de Firebase y dónde están las reglas. |
| `firestore.rules` | Las reglas de la base de datos. |
| `firestore.indexes.json` | Índices. Está vacío porque no hacen falta. |
| `servidor.js` y `herramientas/generar-iconos.js` | Sirven para probar en el ordenador y para crear los iconos. No se publican. |
| `LEEME.md` | Esta guía. No se publica. |

### Hosting

- Firebase Hosting sirve los archivos de la app por HTTPS. La cámara y la instalación como app necesitan HTTPS.
- `firebase.json` publica la carpeta entera (`"public": "."`). Deja fuera la propia configuración, las reglas, los índices, los archivos y carpetas cuyo nombre empieza por punto (como `.firebaserc` o `.firebase`), los `.md`, los `.log`, `servidor.js` y `herramientas/`. Quedan 27 archivos.
- **Por eso, no dejes en esta carpeta nada que no sea de la app:** ni el zip, ni listas de personal, ni notas. Se publicaría, y cualquiera que tenga la URL podría descargarlo. Al publicar, la herramienta dice cuántos archivos ha encontrado para publicar (apartado 6, paso 9).
- Todos los archivos llevan la cabecera `Cache-Control: no-cache`, para que los móviles cojan siempre la última versión.
- El service worker (`sw.js`) guarda en el móvil una copia de la app, con el nombre que pone en la línea 3 de `sw.js`. Siempre intenta primero la red, y si no hay, usa la copia. No guarda nada de Firebase.

### Firestore

La app usa la base de datos `(default)`. En el código es `firebase.firestore()`, sin nombre. No necesita índices.

Usa dos colecciones:

| Colección | Documentos | Qué guarda |
|---|---|---|
| `permisos` | Uno por permiso. Su ID es igual que el campo `id`: una `p` seguida de letras y números. | Todo el permiso, con sus fotos y firmas. |
| `ajustes` | Uno solo, `general`. | `{ modoDemo: true }` o `false`. Se crea la primera vez que alguien toca el interruptor «Modo demo». Mientras no existe, la app usa el valor de la línea 28 de `js/config.js`, que viene activado. |

- **Lectura:** cada pantalla abierta está suscrita en tiempo real a **toda** la colección `permisos`, ordenada por `creado`, sin filtro ni límite. Lo que eso supone para el cupo gratuito está en el apartado 4, «Plan y límites».
- **Tamaño:** Firestore admite como mucho 1 MiB por documento.
  - Cada foto se reduce a 720 píxeles por el lado más largo, en JPEG.
  - Como referencia, un permiso con su foto ocupa unos 30 KB, y cada firma unos 5 KB. Con fotos reales de móvil ocupará algo más.
  - Las fotos de las verificaciones de prevención también van dentro del permiso.
  - Hay margen, pero no es infinito.

Los campos de cada permiso y lo que la app guarda en el navegador están en el anexo.

### Reglas de la base de datos (`firestore.rules`)

- **Quién puede leer y escribir:** cualquiera puede **leer, crear, cambiar y borrar** los documentos de `permisos` y `ajustes`. Basta con abrir la app o con usar la configuración que va dentro de la página, que es pública. **Las reglas no piden inicio de sesión**, y no hay nada más que proteja los datos.
- **Otras colecciones:** cualquier otra colección queda cerrada.
- **Fecha de cierre:** el archivo lleva escrita la fecha 15/11/2026, en la línea 9:

  ```
  return request.time < timestamp.date(2026, 11, 15);
  ```

  Las reglas dejan de permitir nada el 15/11/2026 a la 01:00, hora peninsular (00:00 UTC). Desde ese momento:
  - Al abrir la app, la pantalla se queda en «Cargando…», y abajo sale durante unos 3 segundos el aviso «La base de datos de la demo está cerrada (reglas caducadas).». Si no lo has visto, mira el principio de la lista del apartado 8.
  - En una pantalla que ya estaba abierta, al pulsar casi cualquier botón sale el error en inglés «Missing or insufficient permissions.» (faltan permisos). Con «Borrar datos de demo» no sale nada.
- **Para cambiar la fecha:** cambia la línea 9 y vuelve a subir las reglas (apartado 6, paso 8).
- **Avisos de Firebase:** Firebase puede mandar correos avisando de que la base de datos no está protegida o de que el acceso va a caducar. Es lo esperado.

Estas reglas solo sirven para probar con datos inventados. Para datos reales harían falta un inicio de sesión y unas reglas que lo exijan (apartado 7).

## 4. Crear el proyecto de Firebase, con la base de datos en Madrid

Todo se hace en la consola de Firebase (https://console.firebase.google.com), con tu cuenta de Google.
- La consola puede salir en castellano o en inglés. Por eso cada menú y cada botón llevan entre paréntesis su nombre en inglés.
- La consola cambia a veces los nombres de los menús. Si no encuentras alguno, búscalo con el buscador de la consola.

**Plan y límites:**
- Los proyectos nuevos tienen el plan gratuito (Spark), que basta para probar la app y para empezar.
- El cupo gratuito de Firestore es de 50.000 lecturas, 20.000 escrituras y 20.000 borrados al día. Además, 1 GiB de datos guardados y 10 GiB al mes de datos descargados.
- Cada vez que alguien abre la app, su móvil descarga todos los permisos, con sus fotos y firmas. No guarda copia, porque la app no activa la persistencia de Firestore. Cada permiso descargado cuenta como una lectura.
- Con pocos permisos no es un problema. Con el uso, la colección crecerá y el cupo se puede pasar.
- Si se pasa, la base de datos deja de responder hasta que se renueva el cupo:
  - El cupo diario se renueva hacia las 9:00, hora peninsular.
  - El de datos descargados, al mes siguiente.
- Mientras tanto, la app se queda en «Cargando…» o avisa «Sin conexión con la base de datos. Revisa internet.», aunque internet funcione.
- El consumo se ve en Firestore > «Uso» (Usage).
- Para un uso continuado habría que limitar la consulta o archivar los permisos antiguos. Otra opción es pasar al plan Blaze, que mantiene ese cupo sin coste y solo cobra lo que pase de él.
- Si pasas a Blaze, pon una alerta de presupuesto. Avisa, pero no corta el servicio.

### 4.1 Crear el proyecto

1. Pulsa «Crear un proyecto nuevo de Firebase» (Create a new Firebase project).
2. Escribe el nombre del proyecto, por ejemplo «Permiso espacios confinados».
3. Firebase propone un **ID del proyecto** a partir del nombre. Puedes cambiarlo con el icono del lápiz, «Editar» (Edit). **Apúntalo**: es el `ID_DEL_PROYECTO` de esta guía. Después ya no se puede cambiar.
4. Si te pide aceptar las condiciones, acéptalas. Pulsa «Continuar» (Continue).
5. Si te ofrece «Gemini en Firebase» (Gemini in Firebase) o «Google Analytics», puedes dejarlos desactivados, porque la app no los usa.
6. Pulsa «Crear proyecto» (Create project). Espera a que termine y pulsa «Continuar» (Continue).
7. Recomendado, no obligatorio: para que el proyecto no dependa de una sola cuenta, da acceso al menos a otra cuenta de Google. Ve a la rueda de ajustes > «Usuarios y permisos» (Users and permissions) > «Añadir miembro» (Add member), con el rol «Propietario» (Owner). La otra persona recibe un correo y tiene que aceptar la invitación. Puedes seguir sin esperar.

### 4.2 Crear la base de datos en Madrid

Hazlo **antes** de subir las reglas (apartado 6, paso 8). Si subes las reglas sin haber creado la base de datos, la herramienta de Firebase la crea ella sola en Estados Unidos (`nam5`).
- Se nota porque, al subir las reglas, sale un mensaje que empieza por «Creating the new Firestore database» (creando la base de datos nueva).
- Si te pasa, habría que borrar la base de datos, esperar 5 minutos y volver a crearla en Madrid. Si la consola no te deja, lo más sencillo es crear un proyecto nuevo.

1. En el menú de la izquierda, entra en «Bases de datos y almacenamiento» (Databases & Storage) > «Firestore». Si no ves ese menú, busca «Compilación» (Build) > «Base de datos de Firestore» (Firestore Database), o escribe Firestore en el buscador de la consola.
2. Pulsa «Crear base de datos» (Create database).
3. Si te pregunta por la edición, elige «Edición Standard» (Standard edition) y pulsa «Siguiente» (Next).
4. En «ID de la base de datos» (Database ID), deja `(default)`. Es la que usa la app; con otro nombre no la encontraría.
5. En «Ubicación» (Location), elige **`europe-southwest1` (Madrid)** y pulsa «Siguiente» (Next). **La ubicación no se puede cambiar después.**
6. En las reglas, elige «Iniciar en modo de producción» (Start in production mode). Así todo queda cerrado hasta que subas las reglas de la app. Pulsa «Crear» (Create).

### 4.3 Crear el sitio de Hosting

Puede que el proyecto nuevo no traiga creado ningún sitio de Hosting. Créalo antes de registrar la app web (apartado 4.4): así, la configuración de la app traerá el valor `authDomain`, como recomienda Firebase.

1. En el menú de la izquierda, entra en «Hosting». Suele estar en el grupo que en inglés se llama «Hosting & Serverless». Si no lo ves, escribe Hosting en el buscador de la consola.
2. Pulsa «Comenzar» (Get started).
3. Cuando te pida el ID del sitio (site ID), escribe tu `ID_DEL_PROYECTO`.
   - Los ID de sitio son únicos en todo Firebase. Si ese ya lo tiene otra persona, pon otro, por ejemplo `ID_DEL_PROYECTO-ec`.
   - **Apúntalo**: es el `ID_DEL_SITIO` de esta guía.
   - La URL de la app será `https://ID_DEL_SITIO.web.app`. También funcionará `https://ID_DEL_SITIO.firebaseapp.com`.
4. Las pantallas siguientes explican cómo instalar la herramienta de Firebase y cómo publicar. No ejecutes nada: pulsa «Siguiente» (Next) hasta llegar a «Ir a la consola» (Continue to console). La publicación se hace en el apartado 6.

Si la consola no te deja crear el sitio aquí, sigue igualmente: te lo pedirán en el apartado 4.4 o al publicar (apartado 6, paso 9). La app funciona aunque la configuración no traiga `authDomain`, porque no tiene inicio de sesión. Solo haría falta si se añade un inicio de sesión (apartado 7).

### 4.4 Registrar la app web y copiar su configuración

1. En «Descripción general del proyecto» (Project Overview), pulsa el icono de **Web** (`</>`). Si el proyecto ya tiene alguna app, pulsa antes «Añadir app» (Add app).
2. Escribe un apodo (App nickname), por ejemplo «Permiso EC». Solo se ve en la consola.
3. **Hosting:** si la consola te ofrece configurar también Firebase Hosting, o te pide el ID del sitio (site ID), elige el sitio del apartado 4.3. Si no llegaste a crearlo, créalo aquí con tu `ID_DEL_PROYECTO` (o con otro, si ese no está libre) y apúntalo: es el `ID_DEL_SITIO`.
4. Pulsa «Registrar app» (Register app).
5. La consola enseña un trozo de código con `const firebaseConfig = { … }`.
   - **Copia los valores que traiga**: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId` y `appId`. Se usan en el apartado 5.
   - El resto de esa pantalla no hace falta (instalar el paquete `firebase` con npm, los `import`…), porque la app ya carga Firebase por su cuenta.
   - Si después salen pantallas para instalar la herramienta de Firebase o para publicar, no ejecutes nada y pulsa «Siguiente» (Next). Eso se hace en el apartado 6.
   - Termina con «Ir a la consola» (Continue to console).

Para volver a ver esos valores más adelante:
- En la consola: rueda de ajustes > «Configuración del proyecto» (Project settings) > «Tus apps» (Your apps) > la app > «Configuración» (Config).
- Con la herramienta de Firebase, una vez instalada y con la sesión iniciada (apartado 6, pasos 2 a 4):

```
firebase apps:sdkconfig web --project ID_DEL_PROYECTO
```

Estos valores no son secretos, porque acaban dentro de la página publicada. Lo que protege los datos son las reglas.

## 5. Rellenar la configuración de Firebase en la app

**Archivo:** `js/almacen-firebase.js`. El bloque `CONFIG` va de la **línea 8** (`var CONFIG = {`) a la **línea 15** (`};`). Los seis valores que hay que rellenar están en las **líneas 9 a 14**, uno en cada línea.

**Viene vacío**, con todos los valores entre comillas vacías. Mientras `projectId` esté vacío, la app no arranca (apartado 8):

```js
  var CONFIG = {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  };
```

**Tiene que quedar así**, cambiando cada hueco por el valor que copiaste en el apartado 4.4:

```js
  var CONFIG = {
    apiKey: 'VALOR_DE_APIKEY',
    authDomain: 'VALOR_DE_AUTHDOMAIN',
    projectId: 'ID_DEL_PROYECTO',
    storageBucket: 'VALOR_DE_STORAGEBUCKET',
    messagingSenderId: 'VALOR_DE_MESSAGINGSENDERID',
    appId: 'VALOR_DE_APPID'
  };
```

| Línea | Campo | Qué va entre las comillas |
|---|---|---|
| 9 | `apiKey` | El `apiKey` de la consola. Empieza por `AIza`. |
| 10 | `authDomain` | El `authDomain`. Termina en `.firebaseapp.com`. |
| 11 | `projectId` | El `projectId`, que es tu `ID_DEL_PROYECTO`. |
| 12 | `storageBucket` | El `storageBucket`. Suele terminar en `.firebasestorage.app`. |
| 13 | `messagingSenderId` | El `messagingSenderId`. Son solo números. |
| 14 | `appId` | El `appId`. Empieza por `1:`. |

Cómo hacerlo:
1. Abre el archivo con el editor de texto (clic derecho > «Abrir con»).
2. Pega cada valor entre las comillas simples de su línea. Copia solo lo que va entre comillas en la consola, y deja las comillas y las comas como están.
3. Guárdalo con Ctrl+S, sin cambiar la codificación (UTF-8).

Además:
- Si la configuración no trae `authDomain` o `storageBucket`, deja esa línea con las comillas vacías. La app no los usa, porque no tiene inicio de sesión ni usa Storage.
- Si la consola da también `measurementId`, no hace falta copiarlo.
- No hay que poner el ID del proyecto en ningún otro archivo: ni `firebase.json` ni `firestore.rules` lo nombran. El proyecto se elige con `--project` en cada comando (apartado 6).
- Si ya has publicado la app con `CONFIG` vacío, rellénalo y vuelve a publicar (apartado 6, paso 9). No hace falta tocar `sw.js`.

## 6. Subir las reglas y publicar la app

Abre el Símbolo del sistema (cmd) y ejecuta los comandos de uno en uno.

**Si tu red sale a internet por un proxy**, ejecuta antes este comando, en la misma ventana y con los datos de tu proxy. Lo usan npm y la herramienta de Firebase:

```
set HTTPS_PROXY=http://servidor:puerto
```

Si al instalar o al publicar sale un error de certificado («self-signed certificate in certificate chain» o «unable to get local issuer certificate»), es que el proxy revisa el tráfico HTTPS con un certificado propio.
- Consigue el certificado raíz del proxy en formato PEM (un archivo `.pem`).
- Ejecuta también este comando, en la misma ventana, y repite el paso que falló:

```
set NODE_EXTRA_CA_CERTS=C:\ruta\certificado-proxy.pem
```

1. Comprueba que Node.js está instalado. Tiene que salir `v22` o un número mayor (mejor `v24`):

   ```
   node --version
   ```

   Si no reconoce el comando, instala Node.js (apartado 2). Después cierra el Símbolo del sistema y vuelve a abrirlo.

2. Instala la herramienta de Firebase. Solo hace falta la primera vez en cada ordenador. Es normal que salgan avisos que empiezan por «npm warn»; no son errores.

   ```
   npm install -g firebase-tools
   ```

   - Si da un error de red o de certificado, mira la nota del proxy, al principio de este apartado, y vuelve a empezar desde aquí.
   - Los comandos de esta guía son los de la versión 15 de la herramienta. Si una versión más nueva diera problemas con ellos, instala la última de la 15:

   ```
   npm install -g firebase-tools@15
   ```

3. Comprueba que se ha instalado. Tiene que salir el número de versión:

   ```
   firebase --version
   ```

4. Inicia sesión con la cuenta de Google con la que creaste el proyecto, o con otra que tenga acceso a él:

   ```
   firebase login
   ```

   - Antes de nada hace dos preguntas en inglés. Puedes contestar `n` a las dos:
     - «Enable Gemini in Firebase features?» (¿activar Gemini en Firebase?).
     - «Allow Firebase to collect CLI and Emulator Suite usage and error reporting information?» (¿dejar que Firebase recoja datos de uso y de errores?).
   - Después se abre el navegador para que elijas la cuenta y des permiso. Si no se abre solo, copia en el navegador el enlace que sale debajo de «Visit this URL on this device to log in:» (abre este enlace para iniciar sesión).
   - Si dice «Already logged in as …» (ya has iniciado sesión como…) con otra cuenta, ejecuta `firebase logout` y después vuelve a ejecutar `firebase login`.
   - Si, después de elegir la cuenta, el navegador da error y no vuelve a la herramienta, cancela con Ctrl+C y usa este otro comando:

   ```
   firebase login --no-localhost
   ```

   Saldrán un ID de sesión y un enlace.
   - Abre el enlace en el navegador, entra con la cuenta y sigue los pasos hasta que te dé un código.
   - Pega el código en la ventana, donde pone «Enter authorization code:» (escribe el código de autorización), y pulsa Intro. En el Símbolo del sistema se pega con clic derecho.

5. Comprueba que ves el proyecto. En la columna «Project ID» tiene que salir tu `ID_DEL_PROYECTO`:

   ```
   firebase projects:list
   ```

   Si no sale, has iniciado sesión con otra cuenta: ejecuta `firebase logout` y después `firebase login` con la cuenta del proyecto.

6. Entra en la carpeta de la app, la que tiene `firebase.json`. Cambia la ruta del ejemplo por la tuya. Si abriste el Símbolo del sistema desde la carpeta (apartado 2), ya estás en ella.

   ```
   cd /d "C:\ruta\de\la\carpeta"
   ```

7. Comprueba que la base de datos existe y está en Madrid. En «Location» tiene que salir `europe-southwest1`. Si dice que no existe, créala antes (apartado 4.2). Si sale otra ubicación, no sigas: lee el principio del apartado 4.2.

   ```
   firebase firestore:databases:get --project ID_DEL_PROYECTO
   ```

8. Sube las reglas de la base de datos. Antes, abre `firestore.rules` y mira la línea 9:

   ```
   return request.time < timestamp.date(2026, 11, 15);
   ```

   - Si la dejas así, la base de datos se cerrará el 15/11/2026 a la 01:00 y la app dejará de funcionar. Si esa fecha ya ha pasado, no funcionará desde el principio.
   - Ábrelo con el editor de texto, como en el apartado 5, y cambia solo los tres números (año, mes, día). Por ejemplo, para el 31 de enero de 2027: `timestamp.date(2027, 1, 31)`. Guarda el archivo.
   - No la alargues más de lo necesario: hasta esa fecha, cualquiera que tenga la URL puede leer, cambiar y borrar los datos.

   Después, ejecuta este comando. Al terminar, dice «Deploy complete!» (publicación terminada):

   ```
   firebase deploy --only firestore:rules --project ID_DEL_PROYECTO
   ```

   Las reglas tardan hasta un minuto en aplicarse, y hasta 10 minutos en las pantallas que ya estuvieran abiertas.

9. Comprueba que has rellenado `CONFIG` (apartado 5). Después, publica la app:

   ```
   firebase deploy --only hosting --project ID_DEL_PROYECTO
   ```

   - Si el sitio no se creó en el apartado 4.3, sale «No Hosting site detected.» (no hay ningún sitio de Hosting) y la pregunta «Please provide an unique, URL-friendly id for your site…» (escribe un ID único para el sitio).
     - Si propone `ID_DEL_PROYECTO` entre paréntesis, pulsa Intro. Si no, escríbelo y pulsa Intro.
     - No hace falta añadirle letras, aunque el ejemplo que enseña lo sugiera.
     - Si no está libre, escribe otro, por ejemplo `ID_DEL_PROYECTO-ec`. Ese será tu `ID_DEL_SITIO`.
   - Durante la publicación escribe `hosting[ID_DEL_SITIO]: found 27 files in .` (ha encontrado 27 archivos). Si sale un número mayor y no has añadido nada a la app (por ejemplo, el logotipo), sobra algo en la carpeta: quítalo y repite este paso. Puede ser un archivo oculto de Windows, como `desktop.ini` o `Thumbs.db`, que no empieza por punto y sí se publicaría. El Explorador de archivos no los enseña aunque actives «Elementos ocultos», porque Windows los marca también como archivos de sistema. Para verlos, ejecuta este comando en el Símbolo del sistema, dentro de la carpeta de la app. Lista todos los archivos, también los ocultos y los de sistema:

     ```
     dir /a-d /s /b
     ```

     En la lista salen también los archivos que no se publican (apartado 3, «Hosting»). Cualquier otro que no sea de la app (apartado 3, «Archivos») sobra.
   - Al terminar, escribe `Hosting URL: https://….web.app`. Esa es la URL de la app.
   - Si, en vez de preguntar, da un error porque no hay sitio de Hosting, créalo con el comando de abajo y repite el paso 9. Si dice que ese ID ya está cogido, cambia el primer `ID_DEL_PROYECTO` del comando por otro, por ejemplo `ID_DEL_PROYECTO-ec`. Ese será tu `ID_DEL_SITIO`.

   ```
   firebase hosting:sites:create ID_DEL_PROYECTO --project ID_DEL_PROYECTO
   ```

Notas:
- No ejecutes `firebase init`: la carpeta ya trae su configuración en `firebase.json`.
- Si no quieres escribir `--project` cada vez, ejecuta este comando dentro de la carpeta y elige el proyecto. Cuando pregunte «What alias do you want to use for this project?» (¿qué alias quieres para este proyecto?), escribe `default`. Se crea el archivo `.firebaserc`, que no se publica. A partir de ahí, los comandos funcionan sin `--project`.

  ```
  firebase use --add
  ```

### Para publicar cambios más adelante

1. Cambia los archivos.
2. En la línea 3 de `sw.js` está el nombre de la copia: `var CACHE = 'permiso-ec-v`, un número y `';`. Sube ese número en uno cada vez que publiques cambios, y deja igual el resto de la línea. De esta forma, los móviles tiran la copia vieja. En la primera publicación no hace falta.
3. Si añades, quitas o cambias de nombre algún archivo, actualiza también la lista de `sw.js` (líneas 4 a 10). Si la lista nombra un archivo que no existe, el service worker no se instala. La app funciona igual, pero sin copia en el móvil.
4. Repite el paso 9. Si has cambiado las reglas, repite también el paso 8.

## 7. Inicio de sesión

**La app no tiene inicio de sesión.** No pide usuario ni contraseña.

Así se identifica cada persona:
- Abre su perfil con la URL (`#operario`, `#vigilante` o `#prevencion`).
- En la pantalla «¿Quién eres?», elige su nombre de la lista de `js/datos-demo.js`, sin contraseña ni PIN.
- Ese nombre es el que queda apuntado en el permiso.
- Solo se recuerda en esa pestaña. Para cambiarlo, toca el nombre en la barra de arriba.

Cualquiera que tenga la URL puede entrar en cualquier perfil y con cualquier nombre. Las reglas de la base de datos tampoco piden usuario.

Para añadir un inicio de sesión habría que cambiar el código de la app:
- Cargar Firebase Authentication (ahora no se carga) con el proveedor que se elija (Google, Microsoft, correo y contraseña…) y añadir una pantalla de entrada. El permiso apuntaría el nombre de quien ha iniciado sesión, en vez de elegirlo de una lista.
- Activar ese proveedor en la consola de Firebase, en «Authentication» > «Método de acceso» (Sign-in method). Si es un proveedor externo, registrar también la app en él. Para eso hace falta el `authDomain` (apartado 4.4).
- Cambiar las reglas para que solo dejen leer y escribir a quien haya iniciado sesión.
- Leer la plantilla de personas de la base de datos, con esas mismas reglas, en vez de `js/datos-demo.js` (anexo, «Datos inventados»).

## 8. Qué comprobar al final

### En el ordenador

Abre la URL de la app: la `Hosting URL` del apartado 6, paso 9 (`https://ID_DEL_SITIO.web.app`). Tiene que salir la pantalla de inicio con:
- La cabecera del permiso.
- El texto «Ningún permiso activo».
- Los botones OPERARIO, VIGILANTE y PREVENCIÓN.
- Abajo, «Demo con datos inventados · almacenamiento FIREBASE».

Si no sale, busca tu caso en esta lista:
- **Antes de nada:** los avisos salen abajo durante unos 3 segundos y desaparecen. Si solo ves «Cargando…», recarga la página (F5) y fíjate en el aviso. También puedes abrir la consola del navegador (F12), donde el error se queda escrito. Si pone «Missing or insufficient permissions», el problema está en las reglas.
- **«No arranca» con «Firebase no está configurado (falta CONFIG en js/almacen-firebase.js).»:** `projectId` está vacío. Rellena `CONFIG` (apartado 5) y vuelve a publicar (apartado 6, paso 9).
- **«No arranca» con «No se pudo cargar https://www.gstatic.com/…»:** la red no deja llegar a `www.gstatic.com`.
- **Se queda en «Cargando…» con el aviso «La base de datos de la demo está cerrada (reglas caducadas).»:** puede pasar por tres motivos:
  - Las reglas no se han subido (apartado 6, paso 8).
  - Todavía se están aplicando. Espera un minuto y recarga la página.
  - Ya ha pasado la fecha de la línea 9 de `firestore.rules`.
- **Aviso «Sin conexión con la base de datos. Revisa internet.»:** revisa que la base de datos existe y se llama `(default)`, y que los valores del apartado 5 están bien copiados. También sale si se ha pasado el cupo gratuito (apartado 4, «Plan y límites»).
- **La app abre, pero lo que se pide en un dispositivo no aparece en el otro:** mira la consola del navegador (F12). Si sale «Could not reach Cloud Firestore backend» (no se puede conectar con Cloud Firestore), la red no deja llegar a `firestore.googleapis.com`.

### Prueba completa con dos dispositivos

Usa dos móviles, o el ordenador y un móvil. Con el «Modo demo» activado, que es como viene, vale cualquier turno a cualquier hora.
1. En uno, abre `https://ID_DEL_SITIO.web.app/#vigilante`, elige un nombre y toca la pantalla para que el pitido pueda sonar.
2. En el otro, abre `https://ID_DEL_SITIO.web.app/#operario`, elige un nombre y rellena el permiso:
   - Sección, obra, trabajos y turno.
   - Las condiciones 1, 2, 3, 5 y 6, en SÍ o N.P.
   - Oxígeno `20,9`, con una foto cualquiera del medidor. Si la cámara no se abre, usa GALERÍA.
   - Los dos EPIs obligatorios.
   - Un trabajador. Pulsa «+ AÑADIR TRABAJADOR» y elige uno que ponga «Curso y apto en regla». Firma con el dedo (o con el ratón) en su recuadro y pulsa ACEPTAR FIRMA.

   Pulsa PEDIR ENTRADA. Si no se puede pulsar, encima del botón pone qué falta.
3. En el móvil del vigilante tiene que sonar el pitido y salir el permiso en amarillo. Pulsa APROBAR, firma y pulsa FIRMAR Y APROBAR. En el del operario, la pantalla se pone en verde con «PUEDES ENTRAR».
4. En el del operario, pulsa ENTRA y, pasados un par de segundos, SALE. Un SALE justo después de ENTRA no cuenta, para evitar los toques dobles.

   En el del vigilante, pulsa FINALIZAR PERMISO y, en la ventana que sale, FINALIZAR. En REGISTRO tiene que aparecer el permiso con sus horas.
5. Para probar la alarma:
   - En el del operario, pulsa NUEVO PERMISO, rellénalo igual y pídelo.
   - Apruébalo en el del vigilante y pulsa ENTRA en el del operario.
   - Anúlalo desde cualquiera de los dos: pulsa ANULAR PERMISO, escribe el motivo y pulsa ANULAR.
   - Tiene que salir «PERMISO ANULADO · SALID YA», con sirena, hasta que se pulse SALE.

### En la consola de Firebase

- En «Firestore» > «Datos» (Data) tienen que salir esos permisos, en la colección `permisos`. Así compruebas que la app guarda los datos en tu proyecto.
- En «Firestore» > «Reglas» (Rules) tienen que verse las reglas de `firestore.rules`, con la fecha que hayas puesto.

### En los móviles

- **Instálala como app.** Se abre sin la barra del navegador, como una app, con el nombre «Permiso EC».
  - En Android, con Chrome: menú ⋮ > «Instalar aplicación» o «Añadir a pantalla de inicio».
  - En iPhone, con Safari: botón «Compartir» (en iOS 26 está dentro del botón «⋯») > «Añadir a pantalla de inicio».
- **Pruébala con la wifi del sitio donde se vaya a usar.** Si funciona con datos móviles pero no con la wifi, hay que dejar pasar la URL de la app, `www.gstatic.com` y `firestore.googleapis.com`.

Además:
- En la consola del navegador (F12) es normal que salga un error 404 de `iconos/logo.png` mientras no haya logotipo.
- Al terminar, borra los permisos de prueba con «Borrar datos de demo», en la pantalla de inicio. Decide también si dejas activado el «Modo demo».

## Anexo: cómo funciona y qué se puede cambiar

Nada de este anexo hace falta para publicar la app.

### Las tres pantallas

**OPERARIO: pide la entrada desde el móvil.** Rellena el permiso igual que en el papel:
- Datos: sección, nº de obra/depósito, trabajos a realizar y turno. La fecha y las horas se apuntan solas.
- Las seis condiciones del papel. La 1, la 2, la 3, la 5 y la 6 se contestan con SÍ, NO o N.P. (no procede). La 4 es la del oxígeno: se escribe el valor medido, y la foto del medidor es obligatoria.
- EPIs. La protección respiratoria FFP3 y el medidor de oxígeno son obligatorios. El equipo de filtración motorizado es opcional.
- Foto de la boca de entrada (opcional).
- Los trabajadores que entran, elegidos de la plantilla. Cada uno firma con el dedo.

El botón PEDIR ENTRADA se queda bloqueado en estos casos:
- Falta algo por rellenar.
- Alguna condición tiene un NO.
- El oxígeno está fuera del rango 19,5–23,5 %.
- Algún trabajador tiene caducado el curso o el apto médico.
- Con el «Modo demo» desactivado: el turno elegido no está en marcha a esa hora, o no hay ningún turno en marcha (de 00:00 a 06:00).

Mientras espera, la pantalla le dice que no entre hasta que se ponga en verde. Cuando el permiso está aprobado, el operario apunta ENTRA y SALE de cada trabajador (o SALEN TODOS). También puede añadir operarios con «+ AÑADIR OPERARIO», que firman igual.

**VIGILANTE: es el recurso preventivo, que aprueba o deniega.**
- La petición le llega con un pitido, que se repite mientras siga esperando. Ve los datos, el oxígeno, los trabajadores y las fotos.
- Aprueba firmando con el dedo, o deniega con un motivo, que es opcional.
- Ve en todo momento quién está dentro y cierra el permiso con FINALIZAR PERMISO.
- En la pestaña REGISTRO están todos los permisos, con las firmas y las horas de entrada y salida. Cada uno se puede ver «como en papel», con el registro de quién pulsó qué y a qué hora.
- La app no muestra vídeo: el vigilante ve las fotos que hace el operario.

**PREVENCIÓN: es el verificador, y es opcional.** No bloquea nada. Revisa los permisos activos y pulsa VERIFICADO, firmando con el dedo. Si quiere, añade observaciones y una foto.

### Anular, fin de turno, colores y sonido

- **Anular:**
  - El operario y prevención pueden anular un permiso que espera o que está aprobado.
  - El vigilante solo puede anular uno aprobado. Uno que espera, lo deniega.
  - Siempre hace falta un motivo.
  - Un permiso que ya está en alarma no lo puede anular nadie.
  - Si hay gente dentro, salta la alarma «PERMISO ANULADO · SALID YA». La sirena suena en el móvil del vigilante y en el móvil desde el que se pidió, hasta que salgan todos.
- **Fin de turno:** solo funciona con el «Modo demo» desactivado.
  - Al acabar el turno, si queda gente dentro, el permiso pasa a alarma. Si no queda nadie, se cierra. También se cierran los que siguen esperando sin aprobar.
  - En el turno partido pasa lo mismo a las 13:00, por el corte de mediodía. Por la tarde, el operario pide otro permiso con «RENOVAR PARA ESTE TURNO», que copia la sección, la obra, los trabajos y los EPIs.
  - Lo revisa cada 10 segundos cualquier pantalla de la app que esté abierta. Si no hay ninguna abierta, se hace en los 10 segundos siguientes a que alguien abra la app.
  - Al desactivar el «Modo demo», los permisos cuyo turno ya ha acabado se cierran (o pasan a alarma) en ese momento.
  - Los permisos pedidos en «Modo demo» fuera de horario no se cierran solos. Hay que cerrarlos a mano con FINALIZAR PERMISO, DENEGAR o ANULAR PERMISO.
- **Colores:**
  - Amarillo: esperando.
  - Verde: aprobado.
  - Rojo: denegado, anulado o alarma.
  - Gris: cerrado o finalizado.
- **Sonido:** solo suena con la app abierta en pantalla y el móvil desbloqueado. El navegador no deja sonar nada hasta que se toca la pantalla una vez.
- **Instalación:** se puede instalar en el móvil como una app más, porque es una PWA (apartado 8).

### Datos inventados, «Modo demo» y «Borrar datos de demo»

- **Las personas de la app son inventadas.** Están escritas directamente en `js/datos-demo.js` (no se leen de ninguna base de datos): 60 operarios, 2 vigilantes y 2 personas de prevención.
  - Las caducidades del curso y del apto médico se calculan a partir del día en que se abre la app.
  - Tres operarios están caducados a propósito, para comprobar que la app no les deja entrar. En la lista de «+ AÑADIR TRABAJADOR» (y en la ventana de «+ AÑADIR OPERARIO») salen marcados con «CURSO CADUCADO», «APTO MÉDICO CADUCADO» o «CURSO Y APTO MÉDICO CADUCADOS». Los demás salen con «Curso y apto en regla». En la pantalla «¿Quién eres?» salen los mismos nombres, sin marcas.
  - **No pongas personas reales en este archivo.** Todo lo que hay en `js/` se publica tal cual, y cualquiera que tenga la URL puede descargarlo. Se verían los nombres y las caducidades del curso y del apto médico, que es un dato de salud. Aunque se añadiera un inicio de sesión, las reglas protegerían la base de datos, pero no estos archivos.
  - Para usar la app con personas reales, antes habría que cambiarla para que lea la plantilla de un sitio protegido con inicio de sesión. Por ejemplo, de la base de datos, con reglas que solo dejen leerla a quien haya iniciado sesión (apartado 7). Lo mismo vale para los nombres de los vigilantes y de prevención.
- **«Modo demo»** es un interruptor de la pantalla de inicio, y viene activado.
  - Con él activado se puede pedir a cualquier hora, y nada se cierra por turno.
  - Vale para todos los móviles a la vez, porque se guarda en la base de datos.
  - Para que manden los turnos, hay que desactivarlo. Los turnos son:
    - Mañana: de 06:00 a 15:30.
    - Tarde: de 15:30 a 00:00.
    - Partido: de 08:00 a 13:00 y de 15:00 a 18:00.
- **«Borrar datos de demo»** es un botón de la pantalla de inicio. Borra todos los permisos y su registro, en todos los móviles. Lo puede pulsar cualquiera. Pide confirmación, pero no se puede deshacer.

### Qué se puede cambiar

- **Ajustes:** se cambian en `js/config.js`:
  - Rango de oxígeno: líneas 12 y 13.
  - Secciones: línea 15.
  - Turnos: líneas 21 a 25.
  - Valor inicial del «Modo demo»: línea 28.
  - Tamaño y calidad de las fotos: líneas 31 y 32.
- **Cabecera:** la cabecera de la pantalla de inicio y del permiso «como en papel» lleva lo que está escrito en `js/vistas.js`:
  - Línea 9: el texto «PARCITANK», en el hueco del logotipo.
  - Línea 18: los procedimientos que salen en pantalla, «PRL-PT-10 ESPACIOS CONFINADOS_V4» y «PRL-PT-14 PROCEDIMIENTO RESCATE ESPACIOS CONFINADOS REV.3_11-07-2024».
  - Si dejas una imagen en `iconos/logo.png`, se ve la imagen en lugar del texto de la línea 9.
  - Para cambiar el texto o los procedimientos, edita esas líneas.
- **Iconos:** este comando vuelve a crear `icono-180.png`, `icono-192.png` e `icono-512.png` en `iconos/` y sobrescribe los que hay:

  ```
  node herramientas\generar-iconos.js
  ```

  - El dibujo va escrito dentro del script, en la función `color` de `herramientas/generar-iconos.js` (líneas 18 a 25).
  - Es el mismo dibujo que el de `iconos/icono.svg`, pero el script no lee el SVG.
  - Si cambias el icono, cambia `icono.svg` y también ese dibujo del script. Otra opción es crear los tres PNG con otro programa, de 180, 192 y 512 píxeles.

### Qué guarda la app

Campos de cada documento de `permisos`:

| Campos | Qué guardan |
|---|---|
| `id`, `creado`, `fecha`, `movil` | El identificador, la hora de la petición, el día (`AAAA-MM-DD`) y un identificador al azar del navegador desde el que se pidió. |
| `turno`, `finTurno`, `finTurnoMotivo`, `creadoEnModoDemo` | El turno (`manana`, `tarde` o `partido`), la hora a la que acaba, si acaba por fin de turno (`fin`) o por el corte de mediodía (`corte`), y si se pidió en «Modo demo». |
| `seccion`, `obra`, `trabajos` | Los datos del trabajo. |
| `condiciones`, `oxigeno`, `epis`, `confirmado` | Las respuestas a las condiciones 1, 2, 3, 5 y 6 (`si`, `no` o `np`), el % de oxígeno y los EPIs marcados. `confirmado` siempre vale `true`: es la casilla «Se ha comprobado…» del papel. En la app no se marca a mano, porque la sustituye la firma de cada trabajador; la vista «como en papel» la enseña marcada. |
| `fotoMedidor`, `fotoBoca` | Fotos en JPEG, guardadas como texto (`data:image/jpeg;base64,…`) dentro del propio documento. La foto opcional de cada verificación va dentro de `verificaciones`. |
| `trabajadores` | Lista de trabajadores: el `id` y el nombre de cada uno, y su firma (`{img, hora}`, un PNG guardado como texto). Si alguien se sumó después de aprobar, lo dice `anadido` (hora y quién lo añadió). Guarda las horas de entrada y salida y quién las apuntó. `salidaPorVigilante` dice si la salida la confirmó el vigilante. |
| `pedidoPor`, `aprobado`, `denegado`, `verificaciones`, `anulado` | Quién pidió, aprobó (con firma), denegó, verificó (con firma y, si la hizo, foto) o anuló, a qué hora y con qué motivo u observaciones. |
| `estado`, `alerta`, `cierre` | El estado (`pendiente`, `aprobado`, `denegado`, `alerta`, `anulado` o `cerrado`), y los datos de la alarma y del cierre. |
| `renovadoDe` | El permiso del que este es renovación, si lo es. |
| `eventos` | El registro de quién pulsó qué, desde qué perfil y a qué hora. |

Cómo escribe la app:
- **Escritura:** los permisos se crean con `set`. Siempre se cambian con una transacción que lee el documento y lo vuelve a escribir entero.
- **Borrado:** «Borrar datos de demo» borra de una vez todos los documentos de `permisos`.
- **Horas:** se guardan en milisegundos (`Date.now()`) y salen del reloj del móvil que pulsa, no de la hora del servidor.

En el navegador, la app guarda:
- Un identificador al azar del móvil (`ec_movil`, en localStorage).
- Mientras dura la pestaña (en sessionStorage): quién eres en cada perfil, el formulario a medias, el permiso que tienes abierto y la pestaña que ha elegido el vigilante.
- La copia de la app del service worker (apartado 3, «Hosting»).
- Con `?almacen=local`, además, los permisos y los ajustes (`ec_permisos_v1` y `ec_ajustes_v1`, en localStorage).