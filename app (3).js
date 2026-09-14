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
  onSnapshot
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
let watchId = null; 
let watchIdFirebase = null;
let usuariosOnline = {};

// =========================
// PUNTOS ADMIN
// =========================

let modoAgregarPunto = false;
let puntosAdmin = [];
let marcadoresPuntos = [];

// =========================
// GENERADOR DE LETRAS PARA MANZANAS
// =========================

function obtenerLetraManzana(index) {
    if (index < 26) {
        return String.fromCharCode(65 + index); // A - Z
    }
    const indiceZ = index - 26;
    const numeroZ = Math.floor(indiceZ / 26) + 1;
    const letraRestante = String.fromCharCode(65 + (indiceZ % 26));
    return `Z${numeroZ}${letraRestante}`;
}

// =========================
// VERIFICAR ADMIN
// =========================

async function verificarAdmin(email){
    const snapshot = await getDocs(collection(db,"usuarios"));
    let admin = false;
    snapshot.forEach(docSnap=>{
        const data = docSnap.data();
        if(
            data.email?.toLowerCase() === email.toLowerCase()
            &&
            (data.rol === "admin" || data.rol === "principal")
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
    const snapshot = await getDocs(collection(db,"usuarios"));
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

    if(!resultado.empty){
        const datos = resultado.docs[0].data();
        if(datos.aprobado){
            alert("✅ Tu cuenta ya fue aprobada.");
            return true;
        }
        alert(`⏳ Tu solicitud ya fue enviada.\n\nEsperá que un administrador la apruebe.`);
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
            nombreCompleto: nombre.trim()+" "+apellido.trim(),
            email: user.email,
            aprobado: false,
            rol: "usuario",
            fecha: Date.now()
        }
    );

    alert(`✅ Solicitud enviada correctamente.\n\nCuando un administrador apruebe tu acceso,\nsolo tendrás que volver a iniciar sesión.`);
    return false;
}

// =========================
// ESTADO CONEXION
// =========================

function actualizarEstadoConexion(){
  const texto = document.getElementById("textoConexion");
  if(!texto) return;
  if(navigator.onLine){
    texto.innerHTML = "🌐 Online";
  }else{
    texto.innerHTML = "📡 Offline";
  }
}

window.addEventListener("online", ()=>{
    actualizarEstadoConexion();
});

window.addEventListener("offline", actualizarEstadoConexion);
actualizarEstadoConexion();

// =========================
// CLIMA
// =========================

const weatherApiKey = "c3f0c0d3847e95f9992bf0ba7ae2f19c";
let climaMarkers = [];
let climaVisible = true;

const btnToggleClima = document.getElementById("toggleClima");
if(btnToggleClima){
    btnToggleClima.onclick = ()=>{
        climaVisible = !climaVisible;
        climaMarkers.forEach(marker=>{
            if(climaVisible){
                map.addLayer(marker);
            }else{
                map.removeLayer(marker);
            }
        });
        btnToggleClima.innerText = climaVisible ? "🌤 Ocultar clima" : "🌤 Mostrar clima";
    };
}

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
    return [lat / coords.length, lng / coords.length];
}

// =========================
// MAPA
// =========================

const map = L.map("map", {
    center: [-38.2, -57.67],
    zoom: 13,
    zoomControl: true
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

mapaNormal.addTo(map);

const drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

let vistaSatelite = false;
const btnCambiarMapa = document.getElementById("cambiarMapa");

if (btnCambiarMapa) {
    btnCambiarMapa.onclick = () => {
        if (!vistaSatelite && !navigator.onLine) {
            console.warn("⚠️ Sin conexión: las imágenes satelitales podrían no cargar.");
        }
        if (vistaSatelite) {
            map.removeLayer(mapaSatelite);
            mapaNormal.addTo(map);
            btnCambiarMapa.innerText = "🛰 Satélite";
        } else {
            map.removeLayer(mapaNormal);
            mapaSatelite.addTo(map);
            btnCambiarMapa.innerText = "🗺️ Mapa";
        }
        vistaSatelite = !vistaSatelite;
    };
}

// =========================
// LOGIN
// =========================

const btnLogin = document.getElementById("login");
if(btnLogin){
    btnLogin.onclick = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const resultado = await signInWithPopup(auth, provider);
            const user = resultado.user;

            const admin = await verificarAdmin(user.email);
            const aprobado = await verificarUsuario(user.email);

            if (!admin && !aprobado) {
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
}

// =========================
// CONTINUAR COMO INVITADO
// =========================

const btnInvitado = document.getElementById("continuarInvitado");
if(btnInvitado){
    btnInvitado.onclick = async()=>{
        esInvitado = true;
        const pantallaInicio = document.getElementById("pantallaInicio");
        if(pantallaInicio) pantallaInicio.style.display="none";

        const tLoc = document.getElementById("toggleLocation");
        const tCli = document.getElementById("toggleClima");
        if(tLoc) tLoc.style.display="block";
        if(tCli) tCli.style.display="block";

        actualizarPosicionBotones();
        await recargarMapa();
    };
}

// =========================
// AUTH Y GESTIÓN DE ACCESO
// =========================

onAuthStateChanged(auth, async (user) => {
    currentUser = user || null;
    esAdmin = false;
    esAdminPrincipal = false;
    usuarioAprobado = false;

    const botones = ["toggleLocation", "toggleClima", "editarMallas", "administrarAdmins", "administrarPuntos", "btnCompartirUbicacion"];
    botones.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = "none";
    });

    const pantallaInicio = document.getElementById("pantallaInicio");

    if (!user) {
        if(pantallaInicio) pantallaInicio.style.display = "flex";
        await recargarMapa(); 
        return;
    }

    if(pantallaInicio) pantallaInicio.style.display = "none";

    esAdmin = await verificarAdmin(user.email);
    esAdminPrincipal = await verificarAdminPrincipal(user.email);
    usuarioAprobado = await verificarUsuario(user.email);

    if (esAdmin || usuarioAprobado) {
        if (typeof escucharOtrosUsuarios === "function") {
            escucharOtrosUsuarios();
        }

        if (esAdmin) {
            botones.forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.style.display = "block";
            });
        } else {
            ["toggleLocation", "toggleClima", "btnCompartirUbicacion"].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) btn.style.display = "block";
            });
        }
    } else {
        await registrarUsuario(user);
        await auth.signOut();
        return;
    }

    actualizarPosicionBotones();
    await recargarMapa();
});

// =========================
// ORDENAR BOTONES
// =========================

function actualizarPosicionBotones() {
    let top = 70;
    const botones = ["btnCompartirUbicacion", "toggleLocation", "editarMallas", "administrarAdmins", "administrarPuntos", "toggleClima"];
    let delay = 0;

    botones.forEach(id => {
        const btn = document.getElementById(id);
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

  drawControl = new L.Control.Draw({
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
        const coords = layer.getLatLngs()[0].map(p => ({
          lat: p.lat,
          lng: p.lng
        }));

        const nombre = prompt("Nombre territorio:");
        if(!nombre) return;

        const color = prompt("Color HEX:", "#3388ff");

        const nuevoTerritorio = {
          adminEmail: currentUser.email,
          nombre,
          color,
          coords
        };

        if(!navigator.onLine){
          guardarOperacionPendiente("crear", nuevoTerritorio);
          alert("Sin conexión. Se sincronizará cuando haya internet.");
          return;
        }

        await addDoc(collection(db, "territorios"), nuevoTerritorio);
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
// CREAR TERRITORIO VISUAL + MANZANAS (A, B, C...)
// =========================

let manzanasMarkers = [];

function crearTerritorioVisual(data, id) {
    const polygon = L.polygon(data.coords, { color: data.color || "#3388ff", fillOpacity: 0.4 }).addTo(map);

    polygon.bindTooltip(data.nombre, { permanent: true, direction: "center", className: "nombreTerritorio", opacity: 1 });
    polygon.openTooltip();

    // Enumera las manzanas (cuadras) usando coordenadas del polígono
    if (data.coords && data.coords.length >= 3) {
        const centro = getCentroide(data.coords);
        data.coords.forEach((coord, index) => {
            const letraManzana = obtenerLetraManzana(index);
            
            const latManzana = centro[0] + (coord.lat - centro[0]) * 0.55;
            const lngManzana = centro[1] + (coord.lng - centro[1]) * 0.55;

            const manzanaMarker = L.marker([latManzana, lngManzana], {
                icon: L.divIcon({
                    html: `<div style="background: white; border: 1.5px solid #222; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold; color: #111; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">${letraManzana}</div>`,
                    className: "manzana-etiqueta",
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                })
            }).addTo(map);

            manzanaMarker.bindPopup(`<b>Malla:</b> ${data.nombre}<br><b>Manzana / Cuadra:</b> ${letraManzana}`);
            manzanasMarkers.push(manzanaMarker);
        });
    }

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

    if (esAdmin) {
        polygon.bindPopup(`<div style="width:200px"><h3>${data.nombre}</h3><p>Modo administrador</p></div>`);
    } else if (esInvitado) {
        polygon.bindPopup(`<div style="width:220px; text-align:center;"><h4>${data.nombre}</h4><p style="font-size:13px; color:#555;">Territorio asignado</p></div>`);
    } else {
        polygon.bindPopup(`<div style="width:200px"><h4>${data.nombre}</h4><p>Territorio</p></div>`);
    }
}

// =========================
// OFFLINE & SINCRONIZACIÓN
// =========================

function guardarTerritoriosLocal(territorios){
  try{
    localStorage.setItem("territorios", JSON.stringify(territorios));
  }catch(err){
    console.error("Error guardando en LocalStorage:", err);
  }
}

function cargarTerritoriosLocal(){
  try{
    return JSON.parse(localStorage.getItem("territorios")) || [];
  }catch(err){
    return [];
  }
}

function cargarTerritoriosOffline(){
  cargarTerritoriosLocal().forEach(t => crearTerritorioVisual(t, t.id));
}

function guardarOperacionPendiente(tipo, datos, id = null){
  try{
    let pendientes = JSON.parse(localStorage.getItem("pendientesFirebase")) || [];
    const operacion = { tipo, datos };
    if(id) operacion.id = id;
    pendientes.push(operacion);
    localStorage.setItem("pendientesFirebase", JSON.stringify(pendientes));
  }catch(err){
    console.error("Error guardando operación:", err);
  }
}

async function sincronizarPendientes(){
  const pendientes = JSON.parse(localStorage.getItem("pendientesFirebase")) || [];
  if(pendientes.length === 0) return;

  const operacionesFallidas = [];
  for(const op of pendientes){
    try{
      if(op.tipo === "crear") await addDoc(collection(db, "territorios"), op.datos);
      else if(op.tipo === "editar") await updateDoc(doc(db, "territorios", op.id), op.datos);
      else if(op.tipo === "eliminar") await deleteDoc(doc(db, "territorios", op.id));
    }catch(err){
      operacionesFallidas.push(op);
    }
  }

  if(operacionesFallidas.length === 0){
    localStorage.removeItem("pendientesFirebase");
    await recargarMapa();
  }else{
    localStorage.setItem("pendientesFirebase", JSON.stringify(operacionesFallidas));
  }
}

window.addEventListener("online", async ()=>{
  actualizarEstadoConexion();
  await sincronizarPendientes();
});

// =========================
// TERRITORIOS
// =========================

async function cargarTerritorios(){
  if(navigator.onLine){
    try{
      const snapshot = await getDocs(collection(db, "territorios"));
      const territorios = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        territorios.push({ id: docSnap.id, ...data });
        crearTerritorioVisual(data, docSnap.id);
      });
      guardarTerritoriosLocal(territorios);
    }catch(err){
      cargarTerritoriosOffline();
    }
  }else{
    cargarTerritoriosOffline();
  }
}

// =========================
// MALLAS
// =========================

const btnEditarMallas = document.getElementById("editarMallas");
if(btnEditarMallas){
    btnEditarMallas.onclick = async ()=>{
      const pass = prompt("Contraseña:");
      if(pass === ADMIN_PASSWORD && esAdmin){
        const panel = document.getElementById("mallas-section");
        if(panel.style.display === "block"){
          panel.style.display = "none";
          if(drawControl){
            map.removeControl(drawControl);
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
}

async function cargarMallas(){
  try{
    const snapshot = await getDocs(collection(db,"territorios"));
    const lista = document.getElementById("lista-mallas");
    if(!lista) return;
    lista.innerHTML = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      lista.innerHTML += `
        <div style="border-bottom:1px solid #ccc; margin-bottom:10px;">
          <input id="nombre-${docSnap.id}" value="${data.nombre}" style="width:100%"><br><br>
          <input type="color" id="color-${docSnap.id}" value="${data.color || "#3388ff"}"><br><br>
          <button onclick="guardarCambios('${docSnap.id}')">Guardar</button>
          <button onclick="eliminarMalla('${docSnap.id}')">Eliminar</button>
        </div>
      `;
    });
  }catch(err){
    alert("Error: no se pudieron cargar las mallas");
  }
}

window.guardarCambios = async function(id){
  if(!esAdmin){
    alert("Solo administradores pueden editar territorios");
    return;
  }
  try{
    const nombre = document.getElementById(`nombre-${id}`).value;
    const color = document.getElementById(`color-${id}`).value;
    const datosActualizados = { nombre, color };

    if(!navigator.onLine){
      guardarOperacionPendiente("editar", datosActualizados, id);
      alert("Sin conexión. Se sincronizará cuando haya internet.");
      return;
    }

    await updateDoc(doc(db, "territorios", id), datosActualizados);
    alert("Cambios guardados ✅");
    recargarMapa();
  }catch(err){
    alert("Error: no se pudieron guardar los cambios");
  }
};

window.eliminarMalla = async function(id){
  if(!esAdmin){
    alert("Solo administradores pueden eliminar territorios");
    return;
  }
  if(confirm("¿Eliminar malla?")){
    try{
      if(!navigator.onLine){
        guardarOperacionPendiente("eliminar", {}, id);
        alert("Sin conexión. Se sincronizará cuando haya internet.");
        return;
      }
      await deleteDoc(doc(db, "territorios", id));
      alert("Malla eliminada ✅");
      recargarMapa();
      cargarMallas();
    }catch(err){
      alert("Error: no se pudo eliminar la malla");
    }
  }
};

window.cerrarMallas = ()=>{
  document.getElementById("mallas-section").style.display = "none";
  if(drawControl){
    map.removeControl(drawControl);
    drawControl = null;
  }
};

// =========================
// RECARGAR MAPA
// =========================

async function recargarMapa(){
    map.eachLayer(layer=>{
        if(layer instanceof L.Polygon){
            map.removeLayer(layer);
        }
    });

    manzanasMarkers.forEach(m => {
        if(map.hasLayer(m)) map.removeLayer(m);
    });
    manzanasMarkers = [];

    climaMarkers.forEach(marker=>{
        if(map.hasLayer(marker)){
            map.removeLayer(marker);
        }
    });
    climaMarkers = [];

    marcadoresPuntos.forEach(marker=>{
        if(map.hasLayer(marker)){
            map.removeLayer(marker);
        }
    });
    marcadoresPuntos = [];

    await cargarTerritorios();

    if (!esInvitado && auth.currentUser) {
        await cargarPuntosAdmin();
    }
}

// =========================
// UBICACION
// =========================

let userMarker = null;
const btnToggleLoc = document.getElementById("toggleLocation");
if(btnToggleLoc){
    btnToggleLoc.onclick = ()=>{
      if(watchId){
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
        if(userMarker){
          map.removeLayer(userMarker);
        }
        btnToggleLoc.innerText = "Activar ubicación";
      }else{
        watchId = navigator.geolocation.watchPosition(pos => {
          const { latitude, longitude } = pos.coords;
          if(userMarker){
            userMarker.setLatLng([latitude, longitude]);
          }else{
            userMarker = L.marker([latitude, longitude]).addTo(map);
          }
          map.setView([latitude, longitude], 15);
        });
        btnToggleLoc.innerText = "Desactivar ubicación";
      }
    };
}

// =========================
// ADMINISTRADORES
// =========================

const btnAdminAdmins = document.getElementById("administrarAdmins");
if(btnAdminAdmins){
    btnAdminAdmins.onclick = async () => {
        document.getElementById("admins-section").style.display = "block";
        await cargarAdmins();
        await cargarSolicitudes();
    };
}

window.cerrarAdmins = () => {
    document.getElementById("admins-section").style.display = "none";
};

async function cargarAdmins(){
    const lista = document.getElementById("lista-admins");
    if(!lista) return;
    lista.innerHTML = "";
    const snapshot = await getDocs(collection(db,"usuarios"));

    lista.innerHTML += "<h4>👑 Administradores</h4>";
    snapshot.forEach(docSnap=>{
        const data = docSnap.data();
        if(data.rol !== "admin" && data.rol !== "principal") return;

        lista.innerHTML += `
        <div style="border:1px solid #ccc; border-radius:8px; padding:10px; margin-bottom:10px;">
            <b>${data.nombreCompleto || data.nombre}</b><br>
            ${data.email}<br><br>
            ${data.rol==="principal" ? "🛡️ Administrador principal" : "🛡️ Administrador"}<br><br>
            ${data.rol==="principal" ? "" : `
                <button onclick="quitarAdmin('${docSnap.id}')">⬇ Quitar administrador</button>
                <button onclick="eliminarUsuario('${docSnap.id}')">🗑 Eliminar</button>
            `}
        </div>
        `;
    });

    lista.innerHTML += "<hr><h4>✅ Usuarios aprobados</h4>";
    snapshot.forEach(docSnap=>{
        const data = docSnap.data();
        if(!data.aprobado) return;
        if(data.rol==="admin" || data.rol==="principal") return;

        let estado = "🔴 Sin compartir ubicación";
        let botonMapa = "";
        const online = usuariosOnline[docSnap.id];

        if(online){
            const segundos = Math.floor((Date.now()-online.ultimaActualizacion)/1000);
            let tiempo = segundos < 60 ? `Hace ${segundos} segundos` : `Hace ${Math.floor(segundos/60)} minutos`;
            estado = `🟢 Compartiendo ubicación<br><small>${tiempo}</small>`;
            botonMapa = `<br><br><button onclick="centrarUsuario('${docSnap.id}')">📍 Ver en mapa</button>`;
        }

        lista.innerHTML += `
        <div style="border:1px solid #ccc; border-radius:8px; padding:10px; margin-bottom:10px;">
            <b>${data.nombreCompleto || data.nombre}</b><br>
            ${data.email}<br><br>
            ${estado}${botonMapa}<br><br>
            👤 Usuario<br><br>
            <button onclick="hacerAdmin('${docSnap.id}')">👑 Hacer administrador</button>
            <button onclick="eliminarUsuario('${docSnap.id}')">🗑 Eliminar</button>
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
    map.setView([usuario.lat, usuario.lng], 18);
};

const btnAgregarAdmin = document.getElementById("agregarAdmin");
if(btnAgregarAdmin){
    btnAgregarAdmin.onclick = async()=>{
        if(!esAdminPrincipal){
            alert("Solo el administrador principal puede agregar administradores.");
            return;
        }

        const inputMail = document.getElementById("nuevoAdminEmail");
        if(!inputMail) return;
        const email = inputMail.value.trim().toLowerCase();
        if(email===""){
            alert("Escribí un correo.");
            return;
        }

        const q = query(collection(db,"usuarios"), where("email","==",email));
        const resultado = await getDocs(q);

        if(resultado.empty){
            alert("No existe ningún usuario con ese correo.");
            return;
        }

        const documento = resultado.docs[0];
        await updateDoc(doc(db,"usuarios",documento.id), { aprobado: true, rol: "admin" });

        inputMail.value="";
        alert("✅ Ahora es administrador.");
        cargarAdmins();
        cargarSolicitudes();
    };
}

window.hacerAdmin = async(id)=>{
    await updateDoc(doc(db,"usuarios",id), { rol: "admin" });
    cargarAdmins();
};

window.quitarAdmin = async(id)=>{
    await updateDoc(doc(db,"usuarios",id), { rol: "usuario" });
    cargarAdmins();
};

window.eliminarUsuario = async(id)=>{
    if(!confirm("¿Eliminar este usuario?")) return;
    await deleteDoc(doc(db,"usuarios",id));
    cargarAdmins();
    cargarSolicitudes();
};

async function cargarSolicitudes(){
    const contenedorSolicitudes = document.getElementById("lista-solicitudes");
    if(!contenedorSolicitudes) return;

    let html="<hr><h4>📨 Solicitudes</h4>";
    const snapshot=await getDocs(collection(db,"usuarios"));

    snapshot.forEach(docSnap=>{
        const data=docSnap.data();
        if(data.aprobado===true) return;

        html+=`
        <div style="border:1px solid #ccc; border-radius:8px; padding:10px; margin-bottom:10px;">
            <b>${data.nombre}</b><br>
            ${data.email}<br><br>
            <button onclick="aprobarUsuario('${docSnap.id}')">✅ Aprobar</button>
            <button onclick="rechazarUsuario('${docSnap.id}')">❌ Rechazar</button>
        </div>
        `;
    });

    contenedorSolicitudes.innerHTML = html;
}

window.aprobarUsuario = async(id)=>{
    await updateDoc(doc(db,"usuarios",id), { aprobado: true });
    cargarAdmins();
    cargarSolicitudes();
};

window.rechazarUsuario = async(id)=>{
    if(!confirm("¿Eliminar solicitud?")) return;
    await deleteDoc(doc(db,"usuarios",id));
    cargarAdmins();
    cargarSolicitudes();
};

// =========================
// PUNTOS ADMIN
// =========================

const ICONOS_PUNTO = ["PIN", "🏠", "🌳", "⚠️", "⭐", "🚗", "⛔", "🏢"];

const btnAdminPuntos = document.getElementById("administrarPuntos");
if(btnAdminPuntos){
    btnAdminPuntos.onclick = ()=>{
        modoAgregarPunto = !modoAgregarPunto;
        if(modoAgregarPunto){
            alert("Hace clic en el mapa para colocar un punto.");
            btnAdminPuntos.innerText = "❌ Cancelar";
        }else{
            btnAdminPuntos.innerText = "📍 Puntos";
        }
    };
}

map.on("click", async(e)=>{
    if(!esAdmin || !modoAgregarPunto) return;

    const nombre = prompt("Nombre del punto:");
    if(!nombre){
        modoAgregarPunto = false;
        const btnP = document.getElementById("administrarPuntos");
        if(btnP) btnP.innerText = "📍 Puntos";
        return;
    }

    const icono = prompt(`Elegí un icono:\n\n🏠 🌳 ⚠️ ⭐ 🚗 ⛔ 🏢\n\nEscribí uno`, "📍");

    await addDoc(collection(db,"puntosAdmin"), {
        nombre,
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        color: "#3388ff",
        publico: false,
        icono: icono || "📍",
        creadoPor: currentUser.email,
        fecha: Date.now()
    });

    modoAgregarPunto = false;
    const btnP = document.getElementById("administrarPuntos");
    if(btnP) btnP.innerText = "📍 Puntos";
    cargarPuntosAdmin();
});

async function cargarPuntosAdmin(){
    marcadoresPuntos.forEach(m=>{
        if(map.hasLayer(m)){
            map.removeLayer(m);
        }
    });
    marcadoresPuntos = [];

    const snapshot = await getDocs(collection(db,"puntosAdmin"));

    snapshot.forEach(docSnap=>{
        const data=docSnap.data();

        if(esInvitado) return;
        if(!esAdmin && data.publico !== true) return;

        let htmlIcono="";
        if((data.icono || "PIN")==="PIN"){
            htmlIcono=`
            <svg width="24" height="32" viewBox="0 0 24 24">
            <path fill="${data.color || "#3388ff"}" stroke="white" stroke-width="1.5" d="M12 2 C8 2 5 5 5 9 C5 14 12 22 12 22 C12 22 19 14 19 9 C19 5 16 2 12 2Z"/>
            <circle cx="12" cy="9" r="3" fill="white"/>
            </svg>
            `;
        }else{
            htmlIcono=`<div class="iconoPuntoMapa">${data.icono}</div>`;
        }

        const icono = L.divIcon({
            html: htmlIcono,
            className: "",
            iconSize: [24,24],
            iconAnchor: [12,12]
        });

        const marcador = L.marker([data.lat, data.lng], { icon: icono }).addTo(map);

        marcador.bindTooltip(data.nombre, {
            permanent: map.getZoom()>=15,
            direction: "top",
            offset: [0,-20],
            className: "nombrePuntoAdmin"
        });

        if(esAdmin){
            let opciones="";
            ICONOS_PUNTO.forEach(i=>{
                opciones+=`<option value="${i}" ${(data.icono||"PIN")===i?"selected":""}>${i==="PIN"?"📌 Pin":i}</option>`;
            });

            marcador.bindPopup(`
            <b>${data.nombre}</b><br><br>
            🎨 Color<br>
            <input type="color" value="${data.color || "#3388ff"}" onchange="cambiarColorPunto('${docSnap.id}',this.value)"><br><br>
            😀 Icono<br>
            <select onchange="cambiarIconoPunto('${docSnap.id}',this.value)">${opciones}</select><br><br>
            <button onclick="cambiarVisibilidadPunto('${docSnap.id}',${!data.publico})">${data.publico ? "🔒 Hacer privado" : "🌍 Hacer público"}</button><br><br>
            <button onclick="eliminarPuntoAdmin('${docSnap.id}')">🗑 Eliminar</button>
            `);
        }else{
            marcador.bindPopup(`<b>${data.nombre}</b>`);
        }

        marcadoresPuntos.push(marcador);
    });
}

window.cambiarColorPunto = async(id, color)=>{
    await updateDoc(doc(db,"puntosAdmin",id), { color });
    cargarPuntosAdmin();
};

window.cambiarIconoPunto = async(id, icono)=>{
    await updateDoc(doc(db,"puntosAdmin",id), { icono });
    cargarPuntosAdmin();
};

window.cambiarVisibilidadPunto = async(id, publico)=>{
    await updateDoc(doc(db,"puntosAdmin",id), { publico });
    cargarPuntosAdmin();
};

window.eliminarPuntoAdmin = async(id)=>{
    if(!confirm("¿Eliminar este punto?")) return;
    await deleteDoc(doc(db,"puntosAdmin",id));
    cargarPuntosAdmin();
};

// =========================
// ZOOM NOMBRES
// =========================

map.on("zoomend",()=>{
    const mostrar = map.getZoom() >= 15;
    map.eachLayer(layer=>{
        if(layer.getTooltip){
            const tooltip = layer.getTooltip();
            if(!tooltip) return;
            if(mostrar) layer.openTooltip();
            else layer.closeTooltip();
        }
    });
});

// =========================
// MENÚ
// =========================

const btnMenuBoton = document.getElementById("menuBoton");
if(btnMenuBoton){
    btnMenuBoton.onclick = () => {
        menuAbierto = !menuAbierto;
        btnMenuBoton.innerText = menuAbierto ? "✖" : "☰";
        actualizarPosicionBotones();
    };
}

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
            await setDoc(doc(db,"usuariosOnline",userId), {
                uid: userId,
                nombre: currentUser.displayName || "Usuario",
                email: currentUser.email,
                color: "#2ecc71",
                compartiendo: true,
                lat: latitude,
                lng: longitude,
                ultimaActualizacion: Date.now()
            });
        },
        (error)=>{
            console.error("Error GPS:",error);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

function escucharOtrosUsuarios(){
    onSnapshot(
        collection(db,"usuariosOnline"),
        (snapshot)=>{
            snapshot.docChanges().forEach((change)=>{
                const data = change.doc.data();
                const id = change.doc.id;
                usuariosOnline[id] = data;

                if(change.type==="added" || change.type==="modified"){
                    if(marcadoresUsuarios[id]){
                        marcadoresUsuarios[id].setLatLng([data.lat,data.lng]);
                    }else{
                        const color = data.color || "#2ecc71";
                        const iconoUsuario = L.divIcon({
                            className:"",
                            html:`
                            <div style="display:flex; flex-direction:column; align-items:center;">
                                <div style="font-size:12px; font-weight:bold; color:white; text-shadow:0 0 4px black; margin-bottom:3px; white-space:nowrap;">
                                    ${data.nombre || "Usuario"}
                                </div>
                                <div style="width:16px; height:16px; border-radius:50%; background:${color}; border:2px solid white; box-shadow:0 0 6px rgba(0,0,0,.45);"></div>
                            </div>
                            `,
                            iconSize:[40,40],
                            iconAnchor:[20,32]
                        });

                        marcadoresUsuarios[id] = L.marker([data.lat,data.lng], { icon: iconoUsuario })
                        .addTo(map)
                        .bindPopup(`<b>${data.nombre || "Usuario"}</b><br>${data.email || ""}`);
                    }
                }

                if(change.type==="removed"){
                  delete usuariosOnline[id];
                  if(marcadoresUsuarios[id]){
                      map.removeLayer(marcadoresUsuarios[id]);
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

const btnCompartir = document.getElementById("btnCompartirUbicacion");

if(btnCompartir){
    btnCompartir.onclick = async()=>{
        compartiendoUbicacion = !compartiendoUbicacion;

        if(compartiendoUbicacion){
            btnCompartir.innerText = "📍 Compartir: ON";
            btnCompartir.style.background = "#28a745";
            activarSeguimiento(currentUser.uid);
        }else{
            btnCompartir.innerText = "📍 Compartir: OFF";
            btnCompartir.style.background = "#dc3545";

            if(watchIdFirebase!==null){
                navigator.geolocation.clearWatch(watchIdFirebase);
                watchIdFirebase=null;
            }

            await deleteDoc(doc(db, "usuariosOnline", currentUser.uid));
        }
    };
}