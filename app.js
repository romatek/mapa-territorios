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
  setDoc,
  getDoc,
  onSnapshot,
  query,
  where
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

const ADMIN_PASSWORD = "123admin";

let currentUser = null;

// =========================
// PUNTOS ADMIN
// =========================

let modoAgregarPunto = false;

let puntosAdmin = [];

let marcadoresPuntos = [];

// =========================
// MIS PUNTOS
// =========================

let modoAgregarMiPunto = false;

let marcadoresMisPuntos = [];

const ICONOS_MIS_PUNTOS = [
    "📍",
    "🏠",
    "⭐",
    "🚗",
    "🌳",
    "⚠️",
    "🏢",
    "❤️"
];

// =========================
// VERIFICAR ADMIN
// =========================

async function verificarAdmin(email){

  try{

    const snapshot = await getDocs(collection(db,"admins"));

    let autorizado = false;

    snapshot.forEach(docSnap=>{

      const data = docSnap.data();

      if(
        data.email &&
        data.email.toLowerCase() === email.toLowerCase()
      ){
        autorizado = true;
      }

    });

    return autorizado;

  }catch(err){

    console.error(err);

    return false;

  }

}

// =========================
// ESTADO CONEXION
// =========================

function actualizarEstadoConexion(){

  const estado =
  document.getElementById(
    "estadoConexion"
  );

  if(navigator.onLine){

    estado.innerHTML =
    "🌐 Online";

  }else{

    estado.innerHTML =
    "📡 Offline";

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
// MAPA
// =========================

const map = L.map("map")
.setView([-38.2, -57.67], 13);

L.tileLayer(
'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
).addTo(map);

const drawnItems = new L.FeatureGroup();

map.addLayer(drawnItems);

// =========================
// LOGIN
// =========================

document
.getElementById("login")
.onclick = async ()=>{

    const provider = new GoogleAuthProvider();

    await signInWithPopup(
        auth,
        provider
    );

};

// =========================
// AUTH
// =========================

onAuthStateChanged(auth, async(user)=>{

    currentUser = user || null;
    esAdmin = false;

    // Ocultar todo mientras verifica
    document.getElementById("login").style.display = "none";
    document.getElementById("toggleClima").style.display = "none";

    document.getElementById("verNotas").style.display = "none";
    document.getElementById("editarMallas").style.display = "none";
    document.getElementById("verRanking").style.display = "none";
    document.getElementById("administrarAdmins").style.display = "none";
    document.getElementById("administrarPuntos").style.display = "none";

    const btnMisPuntos = document.getElementById("misPuntos");

    if(btnMisPuntos){

        btnMisPuntos.style.display = "none";

    }

    if(user){

        console.log("=================================");
        console.log("Usuario logueado:",user.email);

        esAdmin = await verificarAdmin(user.email);

        console.log("Resultado verificarAdmin():",esAdmin);

        // ⭐ Todos los usuarios logueados pueden usar Mis Puntos
        if(btnMisPuntos){

            btnMisPuntos.style.display = "block";

        }

        if(esAdmin){

            console.log("✅ Usuario reconocido como ADMIN");

            document.getElementById("verNotas").style.display="block";
            document.getElementById("editarMallas").style.display="block";
            document.getElementById("verRanking").style.display="block";
            document.getElementById("administrarAdmins").style.display="block";
            document.getElementById("administrarPuntos").style.display="block";

            cargarPuntosAdmin();

        }else{

            console.log("👤 Usuario normal");

        }

    }else{

        console.log("No hay usuario logueado");

        document.getElementById("login").style.display="block";

    }

    // Siempre visible
    document.getElementById("toggleClima").style.display="block";

    await recargarMapa();

    await cargarMisPuntos();

});

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
// CREAR TERRITORIO VISUAL
// =========================

function crearTerritorioVisual(data,id){

    const polygon = L.polygon(

        data.coords,

        {
            color:data.color,
            fillOpacity:0.4
        }

    ).addTo(map);

// =========================
// NOMBRE DEL TERRITORIO
// =========================

polygon.bindTooltip(data.nombre,{

    permanent:true,
    direction:"center",
    className:"nombreTerritorio",
    opacity:1

});

polygon.openTooltip();

    // =========================
    // AGREGAR PUNTOS SOBRE MALLAS
    // =========================

    polygon.on("click", async function(e){

    // =========================
    // MIS PUNTOS
    // =========================

    if(modoAgregarMiPunto){

    L.DomEvent.stopPropagation(e);

    await guardarMiPunto(
        e.latlng.lat,
        e.latlng.lng
    );

    modoAgregarMiPunto = false;

    document.getElementById("misPuntos").innerText = "📍 Mis puntos";

    return;

}

    // =========================
    // PUNTOS ADMIN
    // =========================

      if(!esAdmin) return;

      if(!modoAgregarPunto) return;

      L.DomEvent.stopPropagation(e);

      const nombre = prompt("Nombre del punto:");

      if(!nombre){

          modoAgregarPunto = false;

          document.getElementById("administrarPuntos").innerText = "📍 Puntos";

          return;

      }

      const icono = prompt(
  `Elegí un icono:

  🏠 🌳 ⚠️ ⭐ 🚗 ⛔ 🏢

  Escribí uno de ellos.`,
  "📍");

      await addDoc(collection(db,"puntosAdmin"),{

          nombre:nombre,

          lat:e.latlng.lat,

          lng:e.latlng.lng,

          color:"#3388ff",

          publico:false,

          icono:icono || "📍"

      });

      modoAgregarPunto = false;

      document.getElementById("administrarPuntos").innerText = "📍 Puntos";

      cargarPuntosAdmin();

  });

    if(navigator.onLine){

        mostrarClimaEnMalla(polygon);

    }

    if(esAdmin){

        polygon.bindPopup(`

            <div style="width:200px">

                <h3>${data.nombre}</h3>

                <p>Modo administrador</p>

            </div>

        `);

    }else{

        polygon.bindPopup(`

            <div style="width:200px">

                <h4>${data.nombre}</h4>

                <textarea
                    id="nota-${id}"
                    placeholder="Escribí una nota..."
                    style="width:100%;height:60px;"
                ></textarea>

                <br><br>

                <label>Fecha:</label>

                <input
                    type="date"
                    id="fecha-${id}"
                    style="width:100%"
                >

                <br><br>

                <label>
                    <input
                        type="checkbox"
                        id="check-${id}"
                    >
                    Completado
                </label>

                <br><br>

                <button
                    onclick="guardarNota('${id}')"
                >
                    Guardar
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

window.guardarNota =
async function(id){

  try{

    const texto =
    document.getElementById(
      `nota-${id}`
    ).value;

    const fecha =
    document.getElementById(
      `fecha-${id}`
    ).value;

    const completado =
    document.getElementById(
      `check-${id}`
    ).checked;

    if(!texto){

      alert("Escribí una nota");

      return;

    }

    await addDoc(

      collection(db,"notas"),

      {

        territorioId:id,

        nota:texto,

        fecha,

        completado,

        timestamp:Date.now()

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

    // Eliminar únicamente las mallas
    map.eachLayer(layer=>{

        if(layer instanceof L.Polygon){

            map.removeLayer(layer);

        }

    });

    // Eliminar los iconos del clima
    climaMarkers.forEach(marker=>{

        if(map.hasLayer(marker)){

            map.removeLayer(marker);

        }

    });

    climaMarkers=[];

    // Eliminar los puntos
    marcadoresPuntos.forEach(marker=>{

        if(map.hasLayer(marker)){

            map.removeLayer(marker);

        }

    });

    marcadoresPuntos=[];

    // Volver a cargar todo
    await cargarTerritorios();

    // Los puntos deben cargarse para todos
    await cargarPuntosAdmin();

}
// =========================
// UBICACION
// =========================

let watchId = null;

let userMarker = null; // ubicación en vivo

let miPuntoMarker = null; // punto guardado null;

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
// MIS PUNTOS
// =========================

document.getElementById("misPuntos").onclick = ()=>{

    if(!currentUser){

        alert("Debes iniciar sesión.");
        return;

    }

    modoAgregarMiPunto = !modoAgregarMiPunto;

    document.getElementById("misPuntos").innerText =
        modoAgregarMiPunto
        ? "❌ Cancelar"
        : "⭐ Mis puntos";

    if(modoAgregarMiPunto){

        alert("Haz clic en cualquier parte del mapa o sobre una malla.");

    }

};

async function guardarMiPunto(lat,lng){

    if(!modoAgregarMiPunto) return;

    modoAgregarMiPunto = false;

    document.getElementById("misPuntos").innerText = "⭐ Mis puntos";

    const nombre = prompt("Nombre del punto:");

    if(!nombre) return;

    const icono = prompt(
`Elegí un icono:

🏠 🌳 ⚠️ ⭐ 🚗 ⛔ 🏢

o escribí cualquier emoji.`,
    "📍"
    );

    await addDoc(collection(db,"misPuntos"),{

        uid:currentUser.uid,

        nombre:nombre,

        lat:lat,

        lng:lng,

        icono:icono || "📍",

        color:"#3388ff"

    });

    cargarMisPuntos();

}

async function cargarMisPuntos(){

    if(!currentUser) return;

    marcadoresMisPuntos.forEach(marker=>{

        if(map.hasLayer(marker)){

            map.removeLayer(marker);

        }

    });

    marcadoresMisPuntos=[];

    const q = query(

        collection(db,"misPuntos"),

        where("uid","==",currentUser.uid)

    );

    const snapshot = await getDocs(q);

    snapshot.forEach(docSnap=>{

        const data = docSnap.data();

        let htmlIcono="";

        if((data.icono||"PIN")==="PIN"){

            htmlIcono=`
            <svg width="28" height="40" viewBox="0 0 24 24">

                <path
                    fill="${data.color||"#3388ff"}"
                    stroke="white"
                    stroke-width="1.5"
                    d="M12 2
                       C8 2 5 5 5 9
                       C5 14 12 22 12 22
                       C12 22 19 14 19 9
                       C19 5 16 2 12 2Z"/>

                <circle
                    cx="12"
                    cy="9"
                    r="3"
                    fill="white"/>

            </svg>
            `;

        }else{

            htmlIcono=`
            <div style="
                font-size:28px;
                text-shadow:0 0 3px white,0 0 6px black;
            ">
                ${data.icono}
            </div>
            `;

        }

        const icono=L.divIcon({

            html:htmlIcono,

            className:"",

            iconSize:[30,40],

            iconAnchor:[15,40]

        });

        const marker=L.marker(

            [data.lat,data.lng],

            {icon:icono}

        ).addTo(map);

        marker.bindTooltip(

            data.nombre,

            {

                permanent:true,

                direction:"top",

                offset:[0,-25],

                className:"nombrePuntoAdmin"

            }

        );

        marker.bindPopup(`

            <b>${data.nombre}</b>

            <br><br>

            <button onclick="eliminarMiPunto('${docSnap.id}')">

            🗑 Eliminar

            </button>

        `);

        marcadoresMisPuntos.push(marker);

    });

}

window.eliminarMiPunto=async(id)=>{

    if(!confirm("¿Eliminar este punto?")) return;

    await deleteDoc(

        doc(db,"misPuntos",id)

    );

    cargarMisPuntos();

};
// =========================
// RANKING
// =========================

document
.getElementById("verRanking")
.onclick = async ()=>{

  const pass =
  prompt("Contraseña:");

  if(
    pass === ADMIN_PASSWORD &&
    esAdmin
  ){

    document
    .getElementById(
      "ranking-section"
    )
    .style.display = "block";

    cargarRanking();

  }else{

    alert("Acceso denegado");

  }

};

window.cerrarRanking = ()=>{

  document
  .getElementById(
    "ranking-section"
  )
  .style.display = "none";

};

async function cargarRanking(){

  const notasSnap =
  await getDocs(
    collection(db,"notas")
  );

  const territoriosSnap =
  await getDocs(
    collection(db,"territorios")
  );

  let nombres = {};

  territoriosSnap.forEach(doc => {

    nombres[doc.id] =
    doc.data().nombre;

  });

  let completadas = {};

  let recientes = [];

  notasSnap.forEach(docSnap => {

    const d =
    docSnap.data();

    if(d.completado){

      completadas[d.territorioId] =
      (
        completadas[d.territorioId] || 0
      ) + 1;

    }

    recientes.push(d);

  });

  const top =
  Object.entries(completadas)
  .sort((a,b)=>b[1]-a[1]);

  recientes.sort(
    (a,b)=>b.timestamp-a.timestamp
  );

  document
  .getElementById(
    "ranking-completadas"
  )
  .innerHTML =

    top.length

    ?

    top.map(x => `
      <p>
        <b>
          ${nombres[x[0]] || "Malla"}
        </b>

        → ${x[1]} veces
      </p>
    `).join("")

    :

    "<p>No hay datos</p>";

  document
  .getElementById(
    "ranking-recientes"
  )
  .innerHTML =

    recientes.length

    ?

    recientes.slice(0,5)
    .map(x => `
      <p>

        <b>
          ${
            nombres[x.territorioId]
            || "Malla"
          }
        </b>

        <br>

        ${x.nota}

        (${x.fecha || "sin fecha"})

      </p>
    `).join("")

    :

    "<p>No hay notas</p>";

}

// =========================
// ADMINISTRADORES
// =========================

document.getElementById("administrarAdmins").onclick = ()=>{

    document.getElementById("admins-section").style.display="block";

    cargarAdmins();

};

window.cerrarAdmins=()=>{

    document.getElementById("admins-section").style.display="none";

};

async function cargarAdmins(){

    const lista=document.getElementById("lista-admins");

    lista.innerHTML="";

    const snapshot=await getDocs(collection(db,"admins"));

    snapshot.forEach(docSnap=>{

        const data=docSnap.data();

        lista.innerHTML+=`
        <div style="margin-bottom:10px;border-bottom:1px solid #ccc;padding-bottom:10px;">
            ${data.email}
        </div>
        `;

    });

}

document.getElementById("agregarAdmin").onclick=async()=>{

    const email=document.getElementById("nuevoAdminEmail").value.trim();

    if(email==""){
        alert("Escribí un correo.");
        return;
    }

    await addDoc(collection(db,"admins"),{
        email
    });

    document.getElementById("nuevoAdminEmail").value="";

    cargarAdmins();

    alert("Administrador agregado.");

};

// =========================
// PUNTOS ADMIN
// =========================

const ICONOS_PUNTO=[
"PIN","🏠","🌳","⚠️","⭐","🚗","⛔","🏢"
];

document.getElementById("administrarPuntos").onclick=()=>{

    modoAgregarPunto=!modoAgregarPunto;

    if(modoAgregarPunto){

        alert("Hace clic en el mapa para colocar un punto.");

        document.getElementById("administrarPuntos").innerText="❌ Cancelar";

    }else{

        document.getElementById("administrarPuntos").innerText="📍 Puntos";

    }

};

map.on("click",async(e)=>{

    // =========================
    // MIS PUNTOS
    // =========================

    if(modoAgregarMiPunto){

        await guardarMiPunto(
            e.latlng.lat,
            e.latlng.lng
        );

        return;

    }

    // =========================
    // PUNTOS ADMIN
    // =========================

    if(!esAdmin) return;

    if(!modoAgregarPunto) return;

    const nombre = prompt("Nombre del punto:");

    if(!nombre){

        modoAgregarPunto=false;

        document.getElementById("administrarPuntos").innerText="📍 Puntos";

        return;

    }

    const icono = prompt(
`Elegí un icono:

🏠 🌳 ⚠️ ⭐ 🚗 ⛔ 🏢

Escribí uno de ellos.`,
"📍");

    await addDoc(collection(db,"puntosAdmin"),{

        nombre,

        lat:e.latlng.lat,

        lng:e.latlng.lng,

        color:"#3388ff",

        publico:false,

        icono:icono || "📍"

    });

    modoAgregarPunto=false;

    document.getElementById("administrarPuntos").innerText="📍 Puntos";

    cargarPuntosAdmin();

});

async function cargarPuntosAdmin(){

    marcadoresPuntos.forEach(m=>{

        if(map.hasLayer(m)){

            map.removeLayer(m);

        }

    });

    marcadoresPuntos=[];

    const snapshot=await getDocs(collection(db,"puntosAdmin"));

    snapshot.forEach(docSnap=>{

        const data=docSnap.data();

        if(data.publico!==true && !esAdmin){

            return;

        }

        let htmlIcono="";

        if((data.icono || "PIN")==="PIN"){

            htmlIcono=`
            <svg width="28" height="40" viewBox="0 0 24 24">
                <path
                    fill="${data.color || "#3388ff"}"
                    stroke="white"
                    stroke-width="1.5"
                    d="M12 2
                       C8 2 5 5 5 9
                       C5 14 12 22 12 22
                       C12 22 19 14 19 9
                       C19 5 16 2 12 2Z"/>
                <circle
                    cx="12"
                    cy="9"
                    r="3"
                    fill="white"/>
            </svg>`;

        }else{

            htmlIcono=`
            <div style="
                font-size:28px;
                text-shadow:0 0 3px white,0 0 6px black;
            ">
                ${data.icono}
            </div>`;

        }

        const icono=L.divIcon({

            html:htmlIcono,

            className:"",

            iconSize:[30,40],

            iconAnchor:[15,40]

        });

        const marcador=L.marker(
            [data.lat,data.lng],
            {icon:icono}
        ).addTo(map);

        marcador.bindTooltip(data.nombre,{

            permanent:true,

            direction:"top",

            offset:[0,-25],

            className:"nombrePuntoAdmin"

        });

        if(esAdmin){

            let opcionesIconos="";

            ICONOS_PUNTO.forEach(i=>{

                opcionesIconos+=`
                <option
                    value="${i}"
                    ${(data.icono || "PIN")===i ? "selected":""}
                >
                    ${i==="PIN" ? "📌 Pin (color)" : i}
                </option>`;

            });

            marcador.bindPopup(`

                <b>${data.nombre}</b>

                <br><br>

                <b>🎨 Color</b>

                <br>

                <input
                    type="color"
                    value="${data.color || "#3388ff"}"
                    onchange="cambiarColorPunto('${docSnap.id}',this.value)"
                >

                <br><br>

                <b>😀 Icono</b>

                <br>

                <select onchange="cambiarIconoPunto('${docSnap.id}',this.value)">

                    ${opcionesIconos}

                </select>

                <br><br>

                <button onclick="cambiarVisibilidadPunto('${docSnap.id}',${data.publico?"false":"true"})">

                    ${data.publico ? "🔒 Hacer privado":"🌍 Hacer público"}

                </button>

                <br><br>

                <button onclick="eliminarPuntoAdmin('${docSnap.id}')">

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

window.cambiarColorPunto=async(id,color)=>{

    await updateDoc(doc(db,"puntosAdmin",id),{
        color
    });

    cargarPuntosAdmin();

};

window.cambiarIconoPunto=async(id,icono)=>{

    await updateDoc(doc(db,"puntosAdmin",id),{
        icono
    });

    cargarPuntosAdmin();

};

window.cambiarVisibilidadPunto=async(id,publico)=>{

    await updateDoc(doc(db,"puntosAdmin",id),{
        publico
    });

    cargarPuntosAdmin();

};

window.eliminarPuntoAdmin=async(id)=>{

    if(!confirm("¿Eliminar este punto?")) return;

    await deleteDoc(doc(db,"puntosAdmin",id));

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