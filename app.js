// =========================
// FIREBASE
// =========================

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  query,
  where,
  setDoc,
  onSnapshot,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBAoY4Qt3_E0iWIS2z-CxAbW7xoKx9GgHM",
  authDomain: "mapamallas.firebaseapp.com",
  projectId: "mapamallas",
  storageBucket: "mapamallas.appspot.com",
  messagingSenderId: "771420817036",
  appId: "1:771420817036:web:38712f77f74d30f3d7dda9"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

// =========================
// ADMIN
// =========================

let esAdmin = false;
let esAdminPrincipal = false;

const ADMIN_PASSWORD = "123admin";

let currentUser = null;

// =========================
// USUARIOS
// =========================

let usuarioRegistrado = false;

let usuarioAprobado = false;

let esInvitado = false;

let nombreUsuario = "";

let menuAbierto = false;

let compartiendoUbicacion = false;
let watchId = null; // Para guardar el ID del seguimiento y poder detenerlo
let watchIdFirebase = null;

let usuariosOnline = {};

// =========================
// PUNTOS ADMIN
// =========================

let modoAgregarPunto = false;

let puntosAdmin = [];

let marcadoresPuntos = [];

// =========================
// VERIFICAR ADMIN
// =========================

async function verificarAdmin(email){

    const snapshot = await getDocs(
        collection(db,"usuarios")
    );

    let admin = false;

    snapshot.forEach(docSnap=>{

        const data = docSnap.data();

        console.log("Firestore:", data.email, data.rol);

        if(
            data.email?.toLowerCase() === email.toLowerCase()
            &&
            (
                data.rol === "admin"
                ||
                data.rol === "principal"
            )
        ){
            admin = true;
        }

    });

    return admin;

}


// =========================
// VERIFICAR ADMIN PRINCIPAL
// =========================

async function verificarAdminPrincipal(email){

    const snapshot = await getDocs(
        collection(db,"usuarios")
    );

    let principal = false;

    snapshot.forEach(docSnap=>{

        const data = docSnap.data();

        if(
            data.email?.toLowerCase() === email.toLowerCase()
            &&
            data.rol === "principal"
        ){
            principal = true;
        }

    });

    return principal;

}


// =========================
// VERIFICAR USUARIO
// =========================

async function verificarUsuario(email){

    const q = query(
        collection(db,"usuarios"),
        where("email","==",email)
    );

    const resultado = await getDocs(q);

    if(resultado.empty){
        return false;
    }

    const data = resultado.docs[0].data();

    return data.aprobado === true;

}



// =========================
// REGISTRAR USUARIO
// =========================

async function registrarUsuario(user){

    const q = query(
        collection(db,"usuarios"),
        where("email","==",user.email)
    );

    const resultado = await getDocs(q);

    // Ya existe

    if(!resultado.empty){

        const datos = resultado.docs[0].data();

        if(datos.aprobado){

            alert("✅ Tu cuenta ya fue aprobada.");

            return true;

        }

        alert(
`⏳ Tu solicitud ya fue enviada.

Esperá que un administrador la apruebe.`
        );

        return false;

    }



    const nombre = prompt("Nombre:");

    if(!nombre){

        alert("Solicitud cancelada.");

        return false;

    }



    const apellido = prompt("Apellido:");

    if(!apellido){

        alert("Solicitud cancelada.");

        return false;

    }



    await addDoc(

        collection(db,"usuarios"),

        {

            nombre: nombre.trim(),

            apellido: apellido.trim(),

            nombreCompleto:
                nombre.trim()+" "+apellido.trim(),

            email:user.email,

            aprobado:false,

            rol:"usuario",

            fecha:Date.now()

        }

    );



    alert(

`✅ Solicitud enviada correctamente.

Cuando un administrador apruebe tu acceso,
solo tendrás que volver a iniciar sesión.`

    );

    return false;

}

// =========================
// ESTADO CONEXION
// =========================

function actualizarEstadoConexion(){
  // Apuntamos al span específico, no al div completo
  const texto = document.getElementById("textoConexion");

  if(navigator.onLine){
    texto.innerHTML = "🌐 Online";
  }else{
    texto.innerHTML = "📡 Offline";
  }
}

window.addEventListener(
  "online",
  ()=>{
    actualizarEstadoConexion();
  }
);

window.addEventListener(
  "offline",
  actualizarEstadoConexion
);

actualizarEstadoConexion();

// =========================
// CLIMA
// =========================

const weatherApiKey =
"c3f0c0d3847e95f9992bf0ba7ae2f19c";

let climaMarkers = [];
let climaVisible = true;

// =========================
// BOTÓN CLIMA
// =========================

document.getElementById("toggleClima").onclick = ()=>{

    climaVisible = !climaVisible;

    climaMarkers.forEach(marker=>{

        if(climaVisible){

            map.addLayer(marker);

        }else{

            map.removeLayer(marker);

        }

    });

    document.getElementById("toggleClima").innerText =
        climaVisible
        ? "🌤 Ocultar clima"
        : "🌤 Mostrar clima";

};

// =========================
// CENTRO DE LA MALLA
// =========================

function getCentroide(coords){

    let lat = 0;
    let lng = 0;

    coords.forEach(c=>{

        lat += c.lat;
        lng += c.lng;

    });

    return[
        lat / coords.length,
        lng / coords.length
    ];

}

// =========================
// MOSTRAR CLIMA
// =========================

async function mostrarClimaEnMalla(malla){

    if(!navigator.onLine) return;

    try{

        const coords = malla.getLatLngs()[0];

        const centro = getCentroide(coords);

        const lat = centro[0];
        const lon = centro[1];

        const url =
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric&lang=es`;

        const resp = await fetch(url);

        const data = await resp.json();

        if(!data.weather) return;

        const iconUrl =
        `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

        const iconoClima = L.icon({

            iconUrl:iconUrl,

            iconSize:[50,50]

        });

        const marker = L.marker(

            [lat,lon],

            {
                icon:iconoClima
            }

        );

        marker.bindPopup(`

            🌡 ${data.main.temp}°C
            <br>
            ${data.weather[0].description}

        `);

        climaMarkers.push(marker);

        if(climaVisible){

            marker.addTo(map);

        }

    }catch(err){

        console.error("Error clima:",err);

    }

}
// =========================
// MAPA CON ROTACIÓN
// =========================
const map = L.map("map", {
    center: [-38.2, -57.67],
    zoom: 13,
    // Configuración de rotación requerida por el plugin
    rotate: true,
    touchRotate: true,
    shiftKeyRotate: true,
    rotateControl: true
});

// =========================
// CAPAS BASE
// =========================
const mapaNormal = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
});

const mapaSatelite = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    attribution: "© Google"
});

// Agregar la capa inicial al mapa
mapaNormal.addTo(map);

// Inicializar el control de rotación (brújula)
L.control.rotate({
    position: "bottomright",
    closeOnZeroBearing: true
}).addTo(map);

// Capa para elementos dibujados (mantiene compatibilidad)
const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// =========================
// LÓGICA DE CAMBIO DE MAPA
// =========================
let vistaSatelite = false;
const btnCambiarMapa = document.getElementById("cambiarMapa");

if (btnCambiarMapa) {
    btnCambiarMapa.onclick = () => {
        // Validación de conexión opcional
        if (!vistaSatelite && !navigator.onLine) {
            console.warn("⚠️ Sin conexión: las imágenes satelitales podrían no cargar.");
        }

        if (vistaSatelite) {
            // Cambiar a Normal
            map.removeLayer(mapaSatelite);
            mapaNormal.addTo(map);
            btnCambiarMapa.innerText = "🛰 Satélite";
        } else {
            // Cambiar a Satélite
            map.removeLayer(mapaNormal);
            mapaSatelite.addTo(map);
            btnCambiarMapa.innerText = "🗺️ Mapa";
        }
        
        vistaSatelite = !vistaSatelite;
    };
} else {
    console.warn("⚠️ No se encontró el botón con ID 'cambiarMapa'.");
}

// =========================
// LOGIN
// =========================

document.getElementById("login").onclick = async () => {
    try {
        const provider = new GoogleAuthProvider();
        const resultado = await signInWithPopup(auth, provider);
        const user = resultado.user;

        console.log("Usuario:", user.email);

        const admin = await verificarAdmin(user.email);
        const aprobado = await verificarUsuario(user.email);

        console.log("Admin:", admin);
        console.log("Aprobado:", aprobado);

        if (!admin && !aprobado) {
            // Cambiado a registrarUsuario para que coincida con tu app.js
            await registrarUsuario(user); 
            await auth.signOut();
            return;
        }

        alert("Acceso correcto");

    } catch(error) {
        console.error("LOGIN ERROR:", error);
        alert(error.message);
    }
};

// =========================
// CONTINUAR COMO INVITADO
// =========================

document
.getElementById("continuarInvitado")
.onclick = async()=>{

    esInvitado = true;

    document
    .getElementById("pantallaInicio")
    .style.display="none";

    // Mostrar funciones permitidas
    document.getElementById("toggleLocation").style.display="block";
    document.getElementById("toggleClima").style.display="block";

    actualizarPosicionBotones();

    console.log("👁️ Usuario invitado");

    await recargarMapa();

};

// =========================
// AUTH Y GESTIÓN DE ACCESO
// =========================

onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    esAdmin = false;
    esAdminPrincipal = false;
    usuarioAprobado = false;

    // 1. Ocultar todos los botones por defecto al iniciar el chequeo
    const botones = ["toggleLocation", "toggleClima", "verNotas", "editarMallas", "administrarAdmins", "administrarPuntos", "btnCompartirUbicacion"];
    botones.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = "none";
    });

    // 2. CASO: NO HAY SESIÓN
    if (!user) {
        console.log("Sin usuario logueado");
        document.getElementById("pantallaInicio").style.display = "flex";
        
        // Carga únicamente las mallas públicas para el fondo inicial
        await recargarMapa(); 
        return;
    }

    // 3. CASO: HAY USUARIO
    console.log("=================================");
    console.log("Google:", user.email);
    document.getElementById("pantallaInicio").style.display = "none";

    // 4. VERIFICAR PERMISOS
    esAdmin = await verificarAdmin(user.email);
    esAdminPrincipal = await verificarAdminPrincipal(user.email);
    usuarioAprobado = await verificarUsuario(user.email);

    console.log("ADMIN:", esAdmin, "PRINCIPAL:", esAdminPrincipal, "APROBADO:", usuarioAprobado);

    // 5. LÓGICA DE ACCESO Y MOSTRAR BOTONES
    if (esAdmin || usuarioAprobado) {
        // Usuario registrado y autorizado: activar escucha de usuarios online
        if (typeof escucharOtrosUsuarios === "function") {
            escucharOtrosUsuarios();
        }

        if (esAdmin) {
            ["toggleLocation", "toggleClima", "verNotas", "editarMallas", "administrarAdmins", "administrarPuntos", "btnCompartirUbicacion"].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.style.display = "block";
            });
        } else {
            // Usuario aprobado normal
            ["toggleLocation", "toggleClima", "btnCompartirUbicacion"].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.style.display = "block";
            });
        }
    } else {
        // Usuario NO aprobado: registrar, expulsar y limpiar memoria
        console.warn("Usuario no aprobado. Cerrando sesión...");
        await registrarUsuario(user);
        await auth.signOut();
        return;
    }

    // 6. FINALIZAR CARGA
    actualizarPosicionBotones();
    await recargarMapa();
});

// =========================
// ORDENAR BOTONES
// =========================

function actualizarPosicionBotones() {
    let top = 70;
    const botones = ["btnCompartirUbicacion", "toggleLocation", "verNotas", "editarMallas", "administrarAdmins", "administrarPuntos", "toggleClima"];
    let delay = 0;

    botones.forEach(id => {
        const btn = document.getElementById(id);
        // Solo posicionar botones que estén visibles
        if (!btn || btn.style.display === "none") return;


        btn.classList.add("botonMenu");
        if (menuAbierto) {
            btn.style.visibility = "visible";
            btn.style.top = top + "px";
            setTimeout(() => {
                btn.classList.add("visible");
            }, delay);
            delay += 60;
            top += 40;
        } else {
            btn.classList.remove("visible");
            setTimeout(() => {
                btn.style.visibility = "hidden";
            }, 250);
        }
    });
}

// =========================
// DIBUJO
// =========================

let drawControl = null;

function activarDibujo(){

  if(drawControl) return;

  drawControl =
  new L.Control.Draw({

    draw:{

      polygon:true,
      rectangle:true,

      circle:false,
      marker:false,
      polyline:false

    },

    edit:false

  });

  map.addControl(drawControl);

  map.off(L.Draw.Event.CREATED);

  map.on(

    L.Draw.Event.CREATED,

    async function(e){

      try{

        const layer = e.layer;

        const coords =
        layer.getLatLngs()[0]
        .map(p => ({
          lat:p.lat,
          lng:p.lng
        }));

        const nombre =
        prompt("Nombre territorio:");

        if(!nombre) return;

        const color =
        prompt("Color HEX:",
        "#3388ff");

        const nuevoTerritorio = {

          adminEmail: currentUser.email,

          nombre,

          color,

          coords

        };

        if(!navigator.onLine){

          guardarOperacionPendiente(
            "crear",
            nuevoTerritorio
          );

          alert("Sin conexión. Se sincronizará cuando haya internet.");

          return;

        }

        await addDoc(

          collection(
            db,
            "territorios"
          ),

          nuevoTerritorio

        );

        await recargarMapa();

        cargarMallas();

      }catch(err){

        console.error("Error creando territorio:", err);

        alert("Error: no se pudo crear el territorio");

      }

    }

  );

}

// =========================
// CREAR TERRITORIO VISUAL (SIMPLIFICADO)
// =========================

function crearTerritorioVisual(data, id) {

    const polygon = L.polygon(data.coords, { color: data.color, fillOpacity: 0.4 }).addTo(map);

    // NOMBRE DEL TERRITORIO
    polygon.bindTooltip(data.nombre, { permanent: true, direction: "center", className: "nombreTerritorio", opacity: 1 });
    polygon.openTooltip();

    // AGREGAR PUNTOS ADMIN
    polygon.on("click", async function (e) {
        if (!esAdmin || !modoAgregarPunto) return;
        L.DomEvent.stopPropagation(e);
        const nombre = prompt("Nombre del punto:");
        if (!nombre) { modoAgregarPunto = false; document.getElementById("administrarPuntos").innerText = "📍 Puntos"; return; }
        const icono = prompt("Elegí un icono (🏠 🌳 ⚠️ ⭐ 🚗 ⛔ 🏢):", "📍");
        await addDoc(collection(db, "puntosAdmin"), { nombre, lat: e.latlng.lat, lng: e.latlng.lng, color: "#3388ff", publico: false, icono: icono || "📍" });
        modoAgregarPunto = false;
        document.getElementById("administrarPuntos").innerText = "📍 Puntos";
        cargarPuntosAdmin();
    });

    // CLIMA
    if (navigator.onLine) {
        (async () => {
            try {
                const centro = getCentroide(polygon.getLatLngs()[0]);
                const resp = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${centro[0]}&lon=${centro[1]}&appid=${weatherApiKey}&units=metric&lang=es`);
                const dataClima = await resp.json();
                if (!dataClima.weather) return;
                const emoji = ["⛈️", "🌧️", "❄️", "☀️", "⛅"][(dataClima.weather[0].id >= 800) ? (dataClima.weather[0].id === 800 ? 3 : 4) : (dataClima.weather[0].id < 300 ? 0 : 1)];
                const marker = L.marker(centro, { icon: L.divIcon({ html: `<div style="font-size: 26px;">${emoji}</div>`, className: "emoji-clima", iconSize: [30, 30] }) }).addTo(map);
                marker.bindPopup(`🌡️ ${Math.round(dataClima.main.temp)}°C<br>${dataClima.weather[0].description}`);
                climaMarkers.push(marker);
                if (!climaVisible) map.removeLayer(marker);
            } catch (err) { console.error("Error clima:", err); }
        })();
    }

    // =========================
    // POPUPS SEGÚN ROL DE USUARIO
    // =========================
    if (esAdmin) {
        // 1. VISTA ADMINISTRADOR
        polygon.bindPopup(`
            <div style="width:200px">
                <h3>${data.nombre}</h3>
                <p>Modo administrador</p>
            </div>
        `);
    } else if (esInvitado) {
        // 2. VISTA INVITADO (Sin formulario para evitar error de permisos)
        polygon.bindPopup(`
            <div style="width:220px; text-align:center;">
                <h4>${data.nombre}</h4>
                <p style="font-size:13px; color:#555;">Iniciá sesión con tu cuenta para agregar y gestionar notas en esta malla.</p>
            </div>
        `);
    } else {
        // 3. VISTA USUARIO REGISTRADO
        polygon.bindPopup(`
            <div style="width:250px">
                <h4>${data.nombre}</h4>
                <textarea id="nota-${id}" placeholder="Escribí tu nota aquí..." style="width:100%;height:80px; margin-bottom:5px;"></textarea>
                <input type="date" id="fecha-${id}" style="width:100%; margin-bottom:10px;">
                <label style="display:block; margin-bottom:10px; font-size:14px;">
                    <input type="checkbox" id="check-${id}"> Completado
                </label>
                <button onclick="guardarNota('${id}')" style="width:100%; background:#3388ff; color:white; padding:10px; border:none; border-radius:4px; cursor:pointer;">
                    Guardar Nota
                </button>
            </div>
        `);
    }
}

// =========================
// OFFLINE
// =========================

function guardarTerritoriosLocal(territorios){

  try{

    localStorage.setItem(
      "territorios",
      JSON.stringify(territorios)
    );

    console.log(
      "✅ Territorios guardados en LocalStorage"
    );

  }catch(err){

    console.error(
      "Error guardando en LocalStorage:",
      err
    );

  }

}

function cargarTerritoriosLocal(){

  try{

    const guardados =
    JSON.parse(
      localStorage.getItem("territorios")
    ) || [];

    if(guardados.length === 0){

      console.log(
        "ℹ️ No hay territorios en LocalStorage"
      );

      return [];

    }

    console.log(
      "📡 Cargando territorios desde LocalStorage"
    );

    return guardados;

  }catch(err){

    console.error(
      "Error cargando LocalStorage:",
      err
    );

    return [];

  }

}

function cargarTerritoriosOffline(){

  const guardados =
  cargarTerritoriosLocal();

  guardados.forEach(t => {

    crearTerritorioVisual(t, t.id);

  });

}

// =========================
// SINCRONIZACION OFFLINE
// =========================

function guardarOperacionPendiente(tipo, datos, id = null){

  try{

    let pendientes =
    JSON.parse(
      localStorage.getItem("pendientesFirebase")
    ) || [];

    const operacion = {
      tipo,
      datos
    };

    if(id){
      operacion.id = id;
    }

    pendientes.push(operacion);

    localStorage.setItem(
      "pendientesFirebase",
      JSON.stringify(pendientes)
    );

    console.log(
      "📴 Operación guardada para sincronizar"
    );

  }catch(err){

    console.error(
      "Error guardando operación:",
      err
    );

  }

}

function cargarOperacionesPendientes(){

  try{

    return JSON.parse(
      localStorage.getItem("pendientesFirebase")
    ) || [];

  }catch(err){

    console.error(
      "Error cargando operaciones:",
      err
    );

    return [];

  }

}

async function sincronizarPendientes(){

  const pendientes =
  cargarOperacionesPendientes();

  if(pendientes.length === 0){

    console.log(
      "ℹ️ No hay operaciones pendientes"
    );

    return;

  }

  console.log(
    "🔄 Sincronizando cambios..."
  );

  const operacionesFallidas = [];

  for(const op of pendientes){

    try{

      if(op.tipo === "crear"){

        await addDoc(
          collection(db, "territorios"),
          op.datos
        );

      }else if(op.tipo === "editar"){

        await updateDoc(
          doc(db, "territorios", op.id),
          op.datos
        );

      }else if(op.tipo === "eliminar"){

        await deleteDoc(
          doc(db, "territorios", op.id)
        );

      }

    }catch(err){

      console.error(
        "⚠️ Error sincronizando operación:",
        op.tipo,
        err
      );

      operacionesFallidas.push(op);

    }

  }

  if(operacionesFallidas.length === 0){

    localStorage.removeItem(
      "pendientesFirebase"
    );

    console.log(
      "✅ Sincronización completada"
    );

    await recargarMapa();

  }else{

    localStorage.setItem(
      "pendientesFirebase",
      JSON.stringify(operacionesFallidas)
    );

    console.log(
      "⚠️ Error sincronizando, se intentará nuevamente"
    );

  }

}

// Escuchar cambios en conexión y sincronizar
window.addEventListener("online", async ()=>{

  console.log("🌐 Conexión restaurada");

  actualizarEstadoConexion();

  await sincronizarPendientes();

});

// =========================
// TERRITORIOS
// =========================

async function cargarTerritorios(){

  if(navigator.onLine){

    try{

      const snapshot =
      await getDocs(
        collection(
          db,
          "territorios"
        )
      );

      const territorios = [];

      snapshot.forEach(docSnap => {

        const data =
        docSnap.data();

        territorios.push({

          id:docSnap.id,
          ...data

        });

        crearTerritorioVisual(
          data,
          docSnap.id
        );

      });

      guardarTerritoriosLocal(territorios);

    }catch(err){

      console.error(
        "⚠️ Error en Firestore:",
        err
      );

      console.log(
        "📡 Cargando territorios desde LocalStorage"
      );

      cargarTerritoriosOffline();

    }

  }else{

    console.log(
      "🔌 Sin conexión a internet"
    );

    console.log(
      "📡 Cargando territorios desde LocalStorage"
    );

    cargarTerritoriosOffline();

  }

}

// =========================
// GUARDAR NOTA
// =========================

window.guardarNota = async function(id){

  try{

    const texto = document.getElementById(`nota-${id}`)?.value;
    const fecha = document.getElementById(`fecha-${id}`)?.value;
    const completado = document.getElementById(`check-${id}`)?.checked || false;

    if(!texto){
      alert("Escribí una nota");
      return;
    }

    await addDoc(
      collection(db,"notas"),
      {
        territorioId: id,
        nota: texto,
        fecha: fecha,
        completado: completado,
        timestamp: Date.now()
      }
    );

    alert("Nota guardada ✅");

  }catch(err){

    console.error("Error guardando nota:", err);
    alert("Error: no se pudo guardar la nota");

  }

};

// =========================
// VER NOTAS
// =========================

document
.getElementById("verNotas")
.onclick = async ()=>{

  const pass =
  prompt("Contraseña:");

  if(
    pass === ADMIN_PASSWORD &&
    esAdmin
  ){

    document
    .getElementById(
      "notas-section"
    )
    .style.display = "block";

    cargarNotas();

  }else{

    alert("Acceso denegado");

  }

};

async function cargarNotas(){

  try{

    const snapshot =
    await getDocs(
      collection(db,"notas")
    );

    const notas = [];

    snapshot.forEach(docSnap => {

      notas.push({

        id: docSnap.id,

        ...docSnap.data()

      });

    });

    notas.sort(
      (a,b)=>b.timestamp-a.timestamp
    );

    const lista =
    document.getElementById(
      "lista-notas"
    );

    lista.innerHTML = "";

    notas.forEach(d => {

      lista.innerHTML += `

        <div style="
          border-bottom:1px solid #ccc;
          margin-bottom:10px;
          padding-bottom:10px;
        ">

          <p>
            <strong>Nota:</strong>
            ${d.nota}
          </p>

          <p>
            <strong>Fecha:</strong>
            ${d.fecha || "Sin fecha"}
          </p>

          <p>
            ${
              d.completado
              ? "✅ Completado"
              : "❌ Pendiente"
            }
          </p>

          <button
            onclick="borrarNota('${d.id}')"
          >
            Borrar
          </button>

        </div>

      `;

    });

  }catch(err){

    console.error("Error cargando notas:", err);

    alert("Error: no se pudieron cargar las notas");

  }

}

window.borrarNota =
async function(id){

  if(!esAdmin){
    alert("Solo administradores pueden eliminar notas");
    return;
  }

  await deleteDoc(
    doc(db,"notas",id)
  );

  cargarNotas();

};

window.cerrarNotas = ()=>{

  document
  .getElementById(
    "notas-section"
  )
  .style.display = "none";

};

// =========================
// BORRAR ACTUALIZACIÓN
// =========================

window.borrarActualizacion = async function(idMalla, idActualizacion) {
    if (!esAdmin) return;
    try {
        await deleteDoc(doc(db, "mallas", idMalla, "actualizaciones", idActualizacion));
        alert("Actualización eliminada");
        cargarNotas(); 
    } catch (err) {
        console.error("Error borrando:", err);
        alert("Error al borrar");
    }
};

window.cerrarNotas = () => {
    document.getElementById("notas-section").style.display = "none";
};

// =========================
// MALLAS
// =========================

document
.getElementById("editarMallas")
.onclick = async ()=>{

  const pass =
  prompt("Contraseña:");

  if(
    pass === ADMIN_PASSWORD &&
    esAdmin
  ){

    const panel =
    document.getElementById(
      "mallas-section"
    );

    if(
      panel.style.display === "block"
    ){

      panel.style.display = "none";

      if(drawControl){

        map.removeControl(
          drawControl
        );

        drawControl = null;

      }

    }else{

      panel.style.display = "block";

      cargarMallas();

      activarDibujo();

    }

  }else{

    alert("Acceso denegado");

  }

};

async function cargarMallas(){

  try{

    const snapshot =
    await getDocs(
      collection(db,"territorios")
    );

    const lista =
    document.getElementById(
      "lista-mallas"
    );

    lista.innerHTML = "";

    snapshot.forEach(docSnap => {

      const data =
      docSnap.data();

      lista.innerHTML += `

        <div style="
          border-bottom:1px solid #ccc;
          margin-bottom:10px;
        ">

          <input
            id="nombre-${docSnap.id}"
            value="${data.nombre}"
            style="width:100%"
          >

          <br><br>

          <input
            type="color"
            id="color-${docSnap.id}"
            value="${data.color}"
          >

          <br><br>

          <button
            onclick="guardarCambios('${docSnap.id}')"
          >
            Guardar
          </button>

          <button
            onclick="eliminarMalla('${docSnap.id}')"
          >
            Eliminar
          </button>

        </div>

      `;

    });

  }catch(err){

    console.error("Error cargando mallas:", err);

    alert("Error: no se pudieron cargar las mallas");

  }

}

window.guardarCambios =
async function(id){

  if(!esAdmin){
    alert("Solo administradores pueden editar territorios");
    return;
  }

  try{

    const nombre =
    document.getElementById(
      `nombre-${id}`
    ).value;

    const color =
    document.getElementById(
      `color-${id}`
    ).value;

    const datosActualizados = {

      nombre,
      color

    };

    if(!navigator.onLine){

      guardarOperacionPendiente(
        "editar",
        datosActualizados,
        id
      );

      alert("Sin conexión. Se sincronizará cuando haya internet.");

      return;

    }

    await updateDoc(

      doc(
        db,
        "territorios",
        id
      ),

      datosActualizados

    );

    alert("Cambios guardados ✅");

    recargarMapa();

  }catch(err){

    console.error("Error guardando cambios:", err);

    alert("Error: no se pudieron guardar los cambios");

  }

};

window.eliminarMalla =
async function(id){

  if(!esAdmin){
    alert("Solo administradores pueden eliminar territorios");
    return;
  }

  if(confirm("¿Eliminar malla?")){

    try{

      if(!navigator.onLine){

        guardarOperacionPendiente(
          "eliminar",
          {},
          id
        );

        alert("Sin conexión. Se sincronizará cuando haya internet.");

        return;

      }

      await deleteDoc(
        doc(
          db,
          "territorios",
          id
        )
      );

      alert("Malla eliminada ✅");

      recargarMapa();

      cargarMallas();

    }catch(err){

      console.error("Error eliminando malla:", err);

      alert("Error: no se pudo eliminar la malla");

    }

  }

};

window.cerrarMallas = ()=>{

  document
  .getElementById(
    "mallas-section"
  )
  .style.display = "none";

  if(drawControl){

    map.removeControl(
      drawControl
    );

    drawControl = null;

  }

};

// =========================
// RECARGAR MAPA
// =========================

async function recargarMapa(){

    // Eliminar mallas
    map.eachLayer(layer=>{

        if(layer instanceof L.Polygon){

            map.removeLayer(layer);

        }

    });

    // Eliminar clima
    climaMarkers.forEach(marker=>{

        if(map.hasLayer(marker)){

            map.removeLayer(marker);

        }

    });

    climaMarkers = [];

    // Eliminar puntos
    marcadoresPuntos.forEach(marker=>{

        if(map.hasLayer(marker)){

            map.removeLayer(marker);

        }

    });

    marcadoresPuntos = [];

    // Cargar territorios (público)
    await cargarTerritorios();

    // Cargar puntos solo si NO es invitado Y ADEMÁS hay un usuario logueado en Firebase
    if (!esInvitado && auth.currentUser) {
        await cargarPuntosAdmin();
    }

}

// =========================
// UBICACION
// =========================


let userMarker = null; // ubicación en vivo

document
.getElementById(
  "toggleLocation"
)
.onclick = ()=>{

  if(watchId){

    navigator
    .geolocation
    .clearWatch(watchId);

    watchId = null;

    if(userMarker){

      map.removeLayer(
        userMarker
      );

    }

    document
    .getElementById(
      "toggleLocation"
    )
    .innerText =
    "Activar ubicación";

  }else{

    watchId =
    navigator
    .geolocation
    .watchPosition(pos => {

      const {
        latitude,
        longitude
      } = pos.coords;

      if(userMarker){

        userMarker.setLatLng([
          latitude,
          longitude
        ]);

      }else{

        userMarker =
        L.marker([
          latitude,
          longitude
        ]).addTo(map);

      }

      map.setView(
        [
          latitude,
          longitude
        ],
        15
      );

    });

    document
    .getElementById(
      "toggleLocation"
    )
    .innerText =
    "Desactivar ubicación";

  }

};

// =========================
// ADMINISTRADORES
// =========================

document.getElementById("administrarAdmins").onclick = async () => {

    document.getElementById("admins-section").style.display = "block";

    await cargarAdmins();

    await cargarSolicitudes();

};

window.cerrarAdmins = () => {

    document.getElementById("admins-section").style.display = "none";

};

// =========================
// CARGAR ADMINISTRADORES
// =========================

async function cargarAdmins(){

    const lista = document.getElementById("lista-admins");

    lista.innerHTML = "";

    const snapshot = await getDocs(
        collection(db,"usuarios")
    );



    // =========================
    // ADMINISTRADORES
    // =========================

    lista.innerHTML += "<h4>👑 Administradores</h4>";

    snapshot.forEach(docSnap=>{

        const data = docSnap.data();

        if(
            data.rol !== "admin" &&
            data.rol !== "principal"
        ) return;

        lista.innerHTML += `

        <div style="
            border:1px solid #ccc;
            border-radius:8px;
            padding:10px;
            margin-bottom:10px;
        ">

            <b>${data.nombreCompleto || data.nombre}</b>

            <br>

            ${data.email}

            <br><br>

            ${
                data.rol==="principal"
                ? "👑 Administrador principal"
                : "🛡️ Administrador"
            }

            <br><br>

            ${
                data.rol==="principal"
                ? ""
                : `
                <button onclick="quitarAdmin('${docSnap.id}')">
                    ⬇ Quitar administrador
                </button>

                <button onclick="eliminarUsuario('${docSnap.id}')">
                    🗑 Eliminar
                </button>
                `
            }

        </div>

        `;

    });



    // =========================
    // USUARIOS APROBADOS
    // =========================

    lista.innerHTML += "<hr><h4>✅ Usuarios aprobados</h4>";

    snapshot.forEach(docSnap=>{

        const data = docSnap.data();

        if(!data.aprobado) return;

        if(
            data.rol==="admin" ||
            data.rol==="principal"
        ) return;



        // =========================
        // ESTADO ONLINE
        // =========================

        let estado = "🔴 Sin compartir ubicación";
        let botonMapa = "";

        const online = usuariosOnline[docSnap.id];

        if(online){

            const segundos =
            Math.floor(
                (Date.now()-online.ultimaActualizacion)/1000
            );

            let tiempo = "";

            if(segundos<60){

                tiempo = `Hace ${segundos} segundos`;

            }else if(segundos<3600){

                tiempo =
                `Hace ${Math.floor(segundos/60)} minutes`;

            }else{

                tiempo =
                `Hace ${Math.floor(segundos/3600)} horas`;

            }

            estado = `
            🟢 Compartiendo ubicación
            <br>
            <small>${tiempo}</small>
            `;

            botonMapa = `
            <br><br>

            <button onclick="centrarUsuario('${docSnap.id}')">
                📍 Ver en mapa
            </button>
            `;

        }



        lista.innerHTML += `

        <div style="
            border:1px solid #ccc;
            border-radius:8px;
            padding:10px;
            margin-bottom:10px;
        ">

            <b>${data.nombreCompleto || data.nombre}</b>

            <br>

            ${data.email}

            <br><br>

            ${estado}

            ${botonMapa}

            <br><br>

            👤 Usuario

            <br><br>

            <button onclick="hacerAdmin('${docSnap.id}')">
                👑 Hacer administrador
            </button>

            <button onclick="eliminarUsuario('${docSnap.id}')">
                🗑 Eliminar
            </button>

        </div>

        `;

    });

}

window.centrarUsuario = function(id){

    const usuario = usuariosOnline[id];

    if(!usuario){

        alert("Ese usuario ya no está compartiendo ubicación.");

        return;

    }

    map.setView(
        [usuario.lat,usuario.lng],
        18
    );

};

// =========================
// HACER ADMIN POR EMAIL
// =========================

document.getElementById("agregarAdmin").onclick = async()=>{

    if(!esAdminPrincipal){

        alert("Solo el administrador principal puede agregar administradores.");

        return;

    }

    const email = document
        .getElementById("nuevoAdminEmail")
        .value
        .trim()
        .toLowerCase();

    if(email===""){

        alert("Escribí un correo.");

        return;

    }

    const q = query(
        collection(db,"usuarios"),
        where("email","==",email)
    );

    const resultado = await getDocs(q);

    if(resultado.empty){

        alert("No existe ningún usuario con ese correo.");

        return;

    }

    const documento = resultado.docs[0];

    await updateDoc(

        doc(db,"usuarios",documento.id),

        {

            aprobado:true,
            rol:"admin"

        }

    );

    document.getElementById("nuevoAdminEmail").value="";

    alert("✅ Ahora es administrador.");

    cargarAdmins();
    cargarSolicitudes();

};

// =========================
// HACER ADMIN
// =========================

window.hacerAdmin = async(id)=>{

    await updateDoc(
        doc(db,"usuarios",id),
        {
            rol:"admin"
        }
    );

    cargarAdmins();

};

// =========================
// QUITAR ADMIN
// =========================

window.quitarAdmin = async(id)=>{

    await updateDoc(
        doc(db,"usuarios",id),
        {
            rol:"usuario"
        }
    );

    cargarAdmins();

};

// =========================
// ELIMINAR USUARIO
// =========================

window.eliminarUsuario = async(id)=>{

    if(!confirm("¿Eliminar este usuario?")) return;

    await deleteDoc(
        doc(db,"usuarios",id)
    );

    cargarAdmins();
    cargarSolicitudes();

};

// =========================
// SOLICITUDES DE USUARIOS
// =========================

async function cargarSolicitudes(){

    let html="<hr><h4>📨 Solicitudes</h4>";

    const snapshot=await getDocs(collection(db,"usuarios"));

    snapshot.forEach(docSnap=>{

        const data=docSnap.data();

        if(data.aprobado===true) return;

        html+=`

        <div style="
            border:1px solid #ccc;
            border-radius:8px;
            padding:10px;
            margin-bottom:10px;
        ">

            <b>${data.nombre}</b>

            <br>

            ${data.email}

            <br><br>

            <button onclick="aprobarUsuario('${docSnap.id}')">
                ✅ Aprobar
            </button>

            <button onclick="rechazarUsuario('${docSnap.id}')">
                ❌ Rechazar
            </button>

        </div>

        `;

    });

    document.getElementById("lista-solicitudes").innerHTML = html;

}

// =========================
// APROBAR
// =========================

window.aprobarUsuario=async(id)=>{

    await updateDoc(

        doc(db,"usuarios",id),

        {

            aprobado:true

        }

    );

    cargarAdmins();

    cargarSolicitudes();

};

// =========================
// RECHAZAR
// =========================

window.rechazarUsuario=async(id)=>{

    if(!confirm("¿Eliminar solicitud?")) return;

    await deleteDoc(

        doc(db,"usuarios",id)

    );

    cargarAdmins();

    cargarSolicitudes();

};

// =========================
// USUARIOS PENDIENTES
// =========================

async function cargarUsuariosPendientes(){

    const lista = document.getElementById("lista-admins");

    lista.innerHTML = "<h4>Solicitudes de acceso</h4>";

    const snapshot = await getDocs(collection(db,"usuarios"));

    snapshot.forEach(docSnap=>{

        const data = docSnap.data();

        if(data.aprobado) return;

        lista.innerHTML += `

        <div style="
            border:1px solid #ccc;
            padding:10px;
            margin-bottom:10px;
            border-radius:8px;
        ">

            <b>${data.nombre}</b>

            <br>

            ${data.email}

            <br><br>

            <button onclick="aprobarUsuario('${docSnap.id}')">

                ✅ Aprobar

            </button>

        </div>

        `;

    });

}

// =========================
// PUNTOS ADMIN
// =========================

const ICONOS_PUNTO=[
"PIN",
"🏠",
"🌳",
"⚠️",
"⭐",
"🚗",
"⛔",
"🏢"
];


// =========================
// ACTIVAR MODO AGREGAR PUNTO
// =========================

document.getElementById("administrarPuntos").onclick=()=>{


    modoAgregarPunto=!modoAgregarPunto;


    if(modoAgregarPunto){

        alert("Hace clic en el mapa para colocar un punto.");

        document.getElementById("administrarPuntos").innerText="❌ Cancelar";

    }else{

        document.getElementById("administrarPuntos").innerText="📍 Puntos";

    }

};



// =========================
// CREAR PUNTO EN MAPA
// =========================

map.on("click",async(e)=>{


    if(!esAdmin) return;

    if(!modoAgregarPunto) return;



    const nombre = prompt(
        "Nombre del punto:"
    );


    if(!nombre){

        modoAgregarPunto=false;

        document.getElementById("administrarPuntos").innerText="📍 Puntos";

        return;

    }



    const icono = prompt(
`Elegí un icono:

🏠 🌳 ⚠️ ⭐ 🚗 ⛔ 🏢

Escribí uno`,
"📍"
);



    await addDoc(
        collection(db,"puntosAdmin"),
        {

            nombre,

            lat:e.latlng.lat,

            lng:e.latlng.lng,

            color:"#3388ff",

            publico:false,

            icono:icono || "📍",

            creadoPor:currentUser.email,

            fecha:Date.now()

        }
    );



    modoAgregarPunto=false;


    document.getElementById("administrarPuntos").innerText="📍 Puntos";


    cargarPuntosAdmin();


});




// =========================
// CARGAR PUNTOS
// =========================

async function cargarPuntosAdmin(){



    // borrar puntos viejos

    marcadoresPuntos.forEach(m=>{

        if(map.hasLayer(m)){

            map.removeLayer(m);

        }

    });


    marcadoresPuntos=[];



    const snapshot =
    await getDocs(
        collection(db,"puntosAdmin")
    );



    snapshot.forEach(docSnap=>{


        const data=docSnap.data();



        // =========================
        // PERMISOS
        // =========================


        // INVITADO
        if(esInvitado){

            return;

        }



        // USUARIO APROBADO
        // Solo públicos

        if(
            !esAdmin &&
            data.publico !== true
        ){

            return;

        }



        let htmlIcono="";



        if(
            (data.icono || "PIN")==="PIN"
        ){


            htmlIcono=`

            <svg width="24" height="32" viewBox="0 0 24 24">

            <path

            fill="${data.color || "#3388ff"}"

            stroke="white"

            stroke-width="1.5"

            d="
            M12 2
            C8 2 5 5 5 9
            C5 14 12 22 12 22
            C12 22 19 14 19 9
            C19 5 16 2 12 2Z"

            />

            <circle
            cx="12"
            cy="9"
            r="3"
            fill="white"/>

            </svg>

            `;


        }else{


            htmlIcono=`

            <div class="iconoPuntoMapa">

            ${data.icono}

            </div>

            `;

        }




        const icono=L.divIcon({

            html:htmlIcono,

            className:"",

            iconSize:[24,24],

            iconAnchor:[12,12]

        });



        const marcador=L.marker(

            [
            data.lat,
            data.lng
            ],

            {
                icon:icono
            }

        ).addTo(map);




        marcador.bindTooltip(

            data.nombre,

            {

            permanent:
            map.getZoom()>=15,

            direction:"top",

            offset:[0,-20],

            className:"nombrePuntoAdmin"

            }

        );





        // =========================
        // OPCIONES ADMIN
        // =========================

        if(esAdmin){


            let opciones="";


            ICONOS_PUNTO.forEach(i=>{


                opciones+=`

                <option value="${i}"

                ${
                (data.icono||"PIN")===i
                ?"selected"
                :""
                }

                >

                ${i==="PIN"?"📌 Pin":i}

                </option>

                `;


            });



            marcador.bindPopup(`


            <b>${data.nombre}</b>


            <br><br>


            🎨 Color

            <br>


            <input

            type="color"

            value="${data.color || "#3388ff"}"

            onchange="
            cambiarColorPunto('${docSnap.id}',this.value)
            "

            >


            <br><br>


            😀 Icono

            <br>


            <select

            onchange="
            cambiarIconoPunto('${docSnap.id}',this.value)
            "

            >

            ${opciones}

            </select>


            <br><br>


            <button

            onclick="
            cambiarVisibilidadPunto(
            '${docSnap.id}',
            ${!data.publico}
            )
            "

            >

            ${
            data.publico
            ?
            "🔒 Hacer privado"
            :
            "🌍 Hacer público"
            }

            </button>


            <br><br>


            <button

            onclick="
            eliminarPuntoAdmin('${docSnap.id}')
            "

            >

            🗑 Eliminar

            </button>


            `);


        }else{


            marcador.bindPopup(`

            <b>${data.nombre}</b>

            `);

        }



        marcadoresPuntos.push(marcador);



    });


}





// =========================
// CAMBIAR COLOR
// =========================

window.cambiarColorPunto=async(id,color)=>{


    await updateDoc(

        doc(db,"puntosAdmin",id),

        {
            color
        }

    );


    cargarPuntosAdmin();


};




// =========================
// CAMBIAR ICONO
// =========================

window.cambiarIconoPunto=async(id,icono)=>{


    await updateDoc(

        doc(db,"puntosAdmin",id),

        {
            icono
        }

    );


    cargarPuntosAdmin();


};




// =========================
// PUBLICO / PRIVADO
// =========================

window.cambiarVisibilidadPunto=async(id,publico)=>{


    await updateDoc(

        doc(db,"puntosAdmin",id),

        {
            publico
        }

    );


    cargarPuntosAdmin();


};




// =========================
// ELIMINAR
// =========================

window.eliminarPuntoAdmin=async(id)=>{


    if(!confirm("¿Eliminar este punto?"))
    return;



    await deleteDoc(

        doc(db,"puntosAdmin",id)

    );


    cargarPuntosAdmin();


};

// =========================
// MOSTRAR / OCULTAR CLIMA
// =========================

document.getElementById("toggleClima").onclick=()=>{

    climaVisible=!climaVisible;

    climaMarkers.forEach(marker=>{

        if(climaVisible){

            if(!map.hasLayer(marker)){

                marker.addTo(map);

            }

        }else{

            if(map.hasLayer(marker)){

                map.removeLayer(marker);

            }

        }

    });

    document.getElementById("toggleClima").innerText=

        climaVisible

        ? "🌤 Ocultar clima"

        : "🌤 Mostrar clima";

};

// =========================
// MOSTRAR / OCULTAR NOMBRES SEGÚN ZOOM
// =========================

map.on("zoomend",()=>{

    const mostrar = map.getZoom() >= 15;

    map.eachLayer(layer=>{

        if(layer.getTooltip){

            const tooltip = layer.getTooltip();

            if(!tooltip) return;

            if(mostrar){

                layer.openTooltip();

            }else{

                layer.closeTooltip();

            }

        }

    });

});

// =========================
// MENÚ
// =========================

document.getElementById("menuBoton").onclick = () => {
    menuAbierto = !menuAbierto;
    document.getElementById("menuBoton").innerText = menuAbierto ? "✖" : "☰";
    actualizarPosicionBotones();
};

// =========================
// SEGUIMIENTO EN TIEMPO REAL
// =========================

const marcadoresUsuarios = {};

function activarSeguimiento(userId){

    if(!navigator.geolocation){

        alert("Tu navegador no soporta geolocalización.");
        return;

    }

    watchIdFirebase = navigator.geolocation.watchPosition(

        async(position)=>{

            const { latitude, longitude } = position.coords;

            await setDoc(

                doc(db,"usuariosOnline",userId),

                {

                    uid:userId,

                    nombre:currentUser.displayName || "Usuario",

                    email:currentUser.email,

                    color:"#2ecc71",

                    compartiendo:true,

                    lat:latitude,

                    lng:longitude,

                    ultimaActualizacion:Date.now()

                }

            );

        },

        (error)=>{

            console.error("Error GPS:",error);

        },

        {

            enableHighAccuracy:true,
            timeout:5000,
            maximumAge:0

        }

    );

}



// =========================
// ESCUCHAR USUARIOS
// =========================

function escucharOtrosUsuarios(){

    onSnapshot(

        collection(db,"usuariosOnline"),

        (snapshot)=>{

            snapshot.docChanges().forEach((change)=>{

                const data = change.doc.data();

                const id = change.doc.id;

                usuariosOnline[id] = data;



                // =========================
                // AGREGAR / ACTUALIZAR
                // =========================

                if(
                    change.type==="added" ||
                    change.type==="modified"
                ){

                    if(marcadoresUsuarios[id]){

                        marcadoresUsuarios[id]
                        .setLatLng([data.lat,data.lng]);

                    }else{

                        const color =
                        data.color || "#2ecc71";


                        const iconoUsuario =
                        L.divIcon({

                            className:"",

                            html:`

                            <div style="
                                display:flex;
                                flex-direction:column;
                                align-items:center;
                            ">

                                <div style="
                                    font-size:12px;
                                    font-weight:bold;
                                    color:white;
                                    text-shadow:0 0 4px black;
                                    margin-bottom:3px;
                                    white-space:nowrap;
                                ">

                                    ${data.nombre || "Usuario"}

                                </div>

                                <div style="
                                    width:16px;
                                    height:16px;
                                    border-radius:50%;
                                    background:${color};
                                    border:2px solid white;
                                    box-shadow:0 0 6px rgba(0,0,0,.45);
                                "></div>

                            </div>

                            `,

                            iconSize:[40,40],

                            iconAnchor:[20,32]

                        });


                        marcadoresUsuarios[id] =

                        L.marker(

                            [data.lat,data.lng],

                            {

                                icon:iconoUsuario

                            }

                        )

                        .addTo(map)

                        .bindPopup(`

                            <b>${data.nombre || "Usuario"}</b>

                            <br>

                            ${data.email || ""}

                        `);

                    }

                }



                // =========================
                // ELIMINAR
                // =========================

                if(change.type==="removed"){

                  delete usuariosOnline[id]

                  if(marcadoresUsuarios[id]){

                      map.removeLayer(
                          marcadoresUsuarios[id]
                      );

                      delete marcadoresUsuarios[id];

                  }

                }

            });

        }

    );

}



// =========================
// BOTÓN COMPARTIR UBICACIÓN
// =========================

const btnCompartir =
document.getElementById("btnCompartirUbicacion");

if(btnCompartir){

    btnCompartir.onclick = async()=>{

        compartiendoUbicacion =
        !compartiendoUbicacion;



        if(compartiendoUbicacion){

            btnCompartir.innerText =
            "📍 Compartir: ON";

            btnCompartir.style.background =
            "#28a745";

            activarSeguimiento(currentUser.uid);

        }else{

            btnCompartir.innerText =
            "📍 Compartir: OFF";

            btnCompartir.style.background =
            "#dc3545";


            if(watchIdFirebase!==null){

                navigator.geolocation.clearWatch(
                    watchIdFirebase
                );

                watchIdFirebase=null;

            }

            await deleteDoc(

                doc(
                    db,
                    "usuariosOnline",
                    currentUser.uid
                )
            );
        }
    };
}