console.log("🔥 APP.JS NUEVO - MAPA MALLAS");

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

    const snapshot =
    await getDocs(
        collection(db,"usuarios")
    );

    let admin = false;

    snapshot.forEach(docSnap=>{

        const data = docSnap.data();

        console.log(
            "Firestore:",
            data.email,
            data.rol
        );

        if(

            data.email?.toLowerCase()
            ===
            email.toLowerCase()

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

    const snapshot =
    await getDocs(
        collection(db,"usuarios")
    );

    let principal = false;

    snapshot.forEach(docSnap=>{

        const data = docSnap.data();

        if(

            data.email?.toLowerCase()
            ===
            email.toLowerCase()

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

    const resultado =
    await getDocs(q);

    if(resultado.empty){

        return false;

    }

    const data =
    resultado.docs[0].data();

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

    const resultado =
    await getDocs(q);


    if(!resultado.empty){

        const datos =
        resultado.docs[0].data();

        if(datos.aprobado){

            alert(
                "✅ Tu cuenta ya fue aprobada."
            );

            return true;

        }

        alert(
`⏳ Tu solicitud ya fue enviada.

Esperá que un administrador la apruebe.`
        );

        return false;

    }


    const nombre =
    prompt("Nombre:");

    if(!nombre){

        alert(
            "Solicitud cancelada."
        );

        return false;

    }


    const apellido =
    prompt("Apellido:");

    if(!apellido){

        alert(
            "Solicitud cancelada."
        );

        return false;

    }


    await addDoc(

        collection(
            db,
            "usuarios"
        ),

        {

            nombre:
                nombre.trim(),

            apellido:
                apellido.trim(),

            nombreCompleto:
                nombre.trim()
                +
                " "
                +
                apellido.trim(),

            email:
                user.email,

            aprobado:
                false,

            rol:
                "usuario",

            fecha:
                Date.now()

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
// ESTADO CONEXIÓN
// =========================

function actualizarEstadoConexion(){

    const texto =
    document.getElementById(
        "textoConexion"
    );

    if(!texto){

        return;

    }

    if(navigator.onLine){

        texto.innerText =
            "🌐 Online";

    }else{

        texto.innerText =
            "📡 Offline";

    }

}

window.addEventListener(
    "online",
    actualizarEstadoConexion
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
// CENTRO DE LA MALLA
// =========================

function getCentroide(coords){

    let lat = 0;

    let lng = 0;

    coords.forEach(c=>{

        lat += c.lat;

        lng += c.lng;

    });

    return [

        lat / coords.length,

        lng / coords.length

    ];

}


// =========================
// MOSTRAR CLIMA
// =========================

async function mostrarClimaEnMalla(malla){

    if(!navigator.onLine){

        return;

    }

    try{

        const coords =
        malla.getLatLngs()[0];

        const centro =
        getCentroide(coords);

        const lat =
        centro[0];

        const lon =
        centro[1];

        const url =
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${weatherApiKey}&units=metric&lang=es`;

        const resp =
        await fetch(url);

        if(!resp.ok){

            console.error(
                "❌ Error OpenWeather:",
                resp.status
            );

            return;

        }

        const data =
        await resp.json();

        if(!data.weather){

            console.log(
                "⚠️ OpenWeather no devolvió weather:",
                data
            );

            return;

        }


        // DEBUG DEL ICONO

        console.log(
            "🌤️ Clima:",
            data.weather[0].icon,
            data.weather[0].description
        );


        const iconUrl =
        `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;


        const iconoClima =
        L.icon({

            iconUrl:
                iconUrl,

            iconSize:
                [50,50],

            iconAnchor:
                [25,25],

            popupAnchor:
                [0,-25]

        });


        const marker =
        L.marker(

            [
                lat,
                lon
            ],

            {

                icon:
                    iconoClima

            }

        );


        marker.bindPopup(`

            <b>🌤️ Clima</b>

            <br><br>

            🌡 ${data.main.temp}°C

            <br>

            ${data.weather[0].description}

        `);


        climaMarkers.push(
            marker
        );


        if(climaVisible){

            marker.addTo(map);

        }

    }catch(err){

        console.error(
            "Error clima:",
            err
        );

    }

}


// =========================
// MAPA
// =========================

const map =
L.map("map")
.setView(
    [-38.2,-57.67],
    13
);


const mapaCalles =
L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
);


const mapaSatelite =
L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
);


mapaCalles.addTo(map);


// =========================
// CAMBIAR MAPA
// =========================

let usandoSatelite = false;

const botonCambiarMapa =
document.getElementById(
    "cambiarMapa"
);

if(botonCambiarMapa){

    botonCambiarMapa.onclick = ()=>{

        if(usandoSatelite){

            map.removeLayer(
                mapaSatelite
            );

            mapaCalles.addTo(
                map
            );

            usandoSatelite = false;

            botonCambiarMapa.innerText =
                "🛰 Satélite";

        }else{

            map.removeLayer(
                mapaCalles
            );

            mapaSatelite.addTo(
                map
            );

            usandoSatelite = true;

            botonCambiarMapa.innerText =
                "🗺️ Mapa";

        }

    };

}


// =========================
// ELEMENTOS DIBUJADOS
// =========================

const drawnItems =
new L.FeatureGroup();

map.addLayer(
    drawnItems
);


// =========================
// MENÚ
// =========================

const menuBoton =
document.getElementById(
    "menuBoton"
);


const botonesMenu = [

    "toggleLocation",

    "toggleClima",

    "editarMallas",

    "administrarAdmins",

    "administrarPuntos",

    "administrarLetras"

];


let menuVisible = false;


function actualizarMenu(){

    botonesMenu.forEach(id=>{

        const boton =
        document.getElementById(id);

        if(!boton){

            return;

        }


        if(

            boton.style.display !==
            "none"

        ){

            if(menuVisible){

                boton.classList.add(
                    "visible"
                );

            }else{

                boton.classList.remove(
                    "visible"
                );

            }

        }else{

            boton.classList.remove(
                "visible"
            );

        }

    });

}


if(menuBoton){

    menuBoton.onclick = ()=>{

        menuVisible =
            !menuVisible;

        actualizarMenu();

        console.log(
            "☰ Menú:",
            menuVisible
            ? "ABIERTO"
            : "CERRADO"
        );

    };

}


// =========================
// LOGIN
// =========================

document
.getElementById("login")
.onclick = async ()=>{

    try{

        const provider =
        new GoogleAuthProvider();


        const resultado =
        await signInWithPopup(
            auth,
            provider
        );


        const user =
        resultado.user;


        console.log(
            "Usuario:",
            user.email
        );


        const admin =
        await verificarAdmin(
            user.email
        );


        const aprobado =
        await verificarUsuario(
            user.email
        );


        console.log(
            "Admin:",
            admin
        );

        console.log(
            "Aprobado:",
            aprobado
        );


        if(
            !admin &&
            !aprobado
        ){

            await registrarUsuario(
                user
            );

            await auth.signOut();

            return;

        }


        alert(
            "Acceso correcto"
        );


    }catch(error){

        console.error(
            "LOGIN ERROR:",
            error
        );

        alert(
            error.message
        );

    }

};


// =========================
// CONTINUAR COMO INVITADO
// =========================

document
.getElementById(
    "continuarInvitado"
)
.onclick = async ()=>{

    esInvitado = true;


    document
    .getElementById(
        "pantallaInicio"
    )
    .style.display =
        "none";


    document
    .getElementById(
        "toggleLocation"
    )
    .style.display =
        "block";


    document
    .getElementById(
        "toggleClima"
    )
    .style.display =
        "block";


    actualizarPosicionBotones();


    console.log(
        "👁️ Usuario invitado"
    );


    await recargarMapa();

};


// =========================
// AUTH
// =========================

onAuthStateChanged(
    auth,
    async(user)=>{

        currentUser =
            user || null;


        esAdmin =
            false;

        esAdminPrincipal =
            false;

        usuarioAprobado =
            false;

        esInvitado =
            false;


        // =========================
        // OCULTAR BOTONES
        // =========================

        botonesMenu.forEach(id=>{

            const btn =
            document.getElementById(id);

            if(btn){

                btn.style.display =
                    "none";

                btn.classList.remove(
                    "visible"
                );

            }

        });


        menuVisible = false;


        // =========================
        // SIN SESIÓN
        // =========================

        if(!user){

            console.log(
                "Sin usuario logueado"
            );


            esInvitado =
                false;


            document
            .getElementById(
                "pantallaInicio"
            )
            .style.display =
                "flex";


            await recargarMapa();


            return;

        }


        // =========================
        // USUARIO
        // =========================

        console.log(
            "================================="
        );

        console.log(
            "Google:",
            user.email
        );


        document
        .getElementById(
            "pantallaInicio"
        )
        .style.display =
            "none";


        // =========================
        // PERMISOS
        // =========================

        esAdmin =
        await verificarAdmin(
            user.email
        );


        esAdminPrincipal =
        await verificarAdminPrincipal(
            user.email
        );


        usuarioAprobado =
        await verificarUsuario(
            user.email
        );


        console.log(
            "ADMIN:",
            esAdmin
        );

        console.log(
            "PRINCIPAL:",
            esAdminPrincipal
        );

        console.log(
            "APROBADO:",
            usuarioAprobado
        );


        // =========================
        // ADMIN
        // =========================
        if(esAdmin){

            document.getElementById("toggleLocation").style.display = "block";
            document.getElementById("toggleClima").style.display = "block";
            document.getElementById("editarMallas").style.display = "block";
            document.getElementById("administrarAdmins").style.display = "block";
            document.getElementById("administrarPuntos").style.display = "block";
            document.getElementById("administrarLetras").style.display = "block";

            actualizarPosicionBotones();
            await recargarMapa();
            return;
        }


        // =========================
        // USUARIO APROBADO
        // =========================

        if(usuarioAprobado){

            document
            .getElementById(
                "toggleLocation"
            )
            .style.display =
                "block";


            document
            .getElementById(
                "toggleClima"
            )
            .style.display =
                "block";


            actualizarPosicionBotones();


            await recargarMapa();


            return;

        }


        // =========================
        // USUARIO NUEVO
        // =========================

        await registrarUsuario(
            user
        );


        await auth.signOut();

    }
);


// =========================
// ORDENAR BOTONES
// =========================

function actualizarPosicionBotones(){

    let top = 60;


    const botones = [

        "toggleLocation",

        "editarMallas",

        "administrarAdmins",

        "administrarPuntos",

        "administrarLetras",

        "toggleClima"

    ];


    botones.forEach(id=>{

        const btn =
        document.getElementById(id);


        if(

            btn &&
            btn.style.display !==
            "none"

        ){

            btn.style.top =
                top + "px";

            top += 40;

        }

    });


    actualizarMenu();

}


// =========================
// DIBUJO
// =========================

let drawControl = null;


function activarDibujo(){

    if(drawControl){

        return;

    }


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


    map.addControl(
        drawControl
    );


    map.off(
        L.Draw.Event.CREATED
    );


    map.on(

        L.Draw.Event.CREATED,

        async function(e){

            try{

                const layer =
                e.layer;


                const coords =
                layer
                .getLatLngs()[0]
                .map(p=>({

                    lat:p.lat,

                    lng:p.lng

                }));


                const nombre =
                prompt(
                    "Nombre territorio:"
                );


                if(!nombre){

                    return;

                }


                const color =
                prompt(
                    "Color HEX:",
                    "#3388ff"
                );


                const nuevoTerritorio = {

                    adminEmail:
                        currentUser.email,

                    nombre:
                        nombre.trim(),

                    color:
                        color ||
                        "#3388ff",

                    coords

                };


                if(!navigator.onLine){

                    guardarOperacionPendiente(

                        "crear",

                        nuevoTerritorio

                    );


                    alert(
                        "Sin conexión. Se sincronizará cuando haya internet."
                    );


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

                console.error(
                    "Error creando territorio:",
                    err
                );


                alert(
                    "Error: no se pudo crear el territorio"
                );

            }

        }

    );

}


// =========================
// CREAR TERRITORIO VISUAL
// =========================

function crearTerritorioVisual(
    data,
    id
){

    const polygon =
    L.polygon(

        data.coords,

        {

            color:
                data.color,

            fillOpacity:
                0.4

        }

    ).addTo(map);


    // =========================
    // NOMBRE
    // =========================

    polygon.bindTooltip(

        data.nombre,

        {

            permanent:true,

            direction:"center",

            className:
                "nombreTerritorio",

            opacity:1

        }

    );


    polygon.openTooltip();


    // =========================
    // PUNTO ADMIN
    // =========================

    polygon.on(
        "click",
        async function(e){

            if(!esAdmin){

                return;

            }

            if(!modoAgregarPunto){

                return;

            }


            L.DomEvent.stopPropagation(e);


            const nombre =
            prompt(
                "Nombre del punto:"
            );


            if(!nombre){

                modoAgregarPunto =
                    false;


                document
                .getElementById(
                    "administrarPuntos"
                )
                .innerText =
                    "📍 Puntos";


                return;

            }


            const icono =
            prompt(
`Elegí un icono:

🏠 🌳 ⚠️ ⭐ 🚗 ⛔ 🏢

Escribí uno de ellos.`,
                "📍"
            );


            await addDoc(

                collection(
                    db,
                    "puntosAdmin"
                ),

                {

                    nombre:
                        nombre.trim(),

                    lat:
                        e.latlng.lat,

                    lng:
                        e.latlng.lng,

                    color:
                        "#3388ff",

                    publico:
                        false,

                    icono:
                        icono || "📍",

                    creadoPor:
                        currentUser?.email || "",

                    fecha:
                        Date.now()

                }

            );


            modoAgregarPunto =
                false;


            document
            .getElementById(
                "administrarPuntos"
            )
            .innerText =
                "📍 Puntos";


            cargarPuntosAdmin();

        }
    );


    // =========================
    // CLIMA
    // =========================

    if(navigator.onLine){

        mostrarClimaEnMalla(
            polygon
        );

    }


    // =========================
    // POPUP
    // =========================

    if(esAdmin){

        polygon.bindPopup(`

            <div style="width:200px">

                <h3>
                    ${data.nombre}
                </h3>

                <p>
                    Modo administrador
                </p>

            </div>

        `);

    }else{

        polygon.bindPopup(`

            <div style="width:200px">

                <h4>
                    ${data.nombre}
                </h4>

                <textarea
                    id="nota-${id}"
                    placeholder="Escribí una nota..."
                    style="
                        width:100%;
                        height:60px;
                    "
                ></textarea>

                <br><br>

                <label>
                    Fecha:
                </label>

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

function guardarTerritoriosLocal(
    territorios
){

    try{

        localStorage.setItem(

            "territorios",

            JSON.stringify(
                territorios
            )

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

            localStorage.getItem(
                "territorios"
            )

        ) || [];


        if(
            guardados.length === 0
        ){

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


    guardados.forEach(t=>{

        crearTerritorioVisual(
            t,
            t.id
        );

    });

}


// =========================
// SINCRONIZACIÓN OFFLINE
// =========================

function guardarOperacionPendiente(
    tipo,
    datos,
    id = null
){

    try{

        let pendientes =
        JSON.parse(

            localStorage.getItem(
                "pendientesFirebase"
            )

        ) || [];


        const operacion = {

            tipo,

            datos

        };


        if(id){

            operacion.id =
                id;

        }


        pendientes.push(
            operacion
        );


        localStorage.setItem(

            "pendientesFirebase",

            JSON.stringify(
                pendientes
            )

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

            localStorage.getItem(
                "pendientesFirebase"
            )

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

    if(!navigator.onLine){

        return;

    }


    const pendientes =
    cargarOperacionesPendientes();


    if(
        pendientes.length === 0
    ){

        console.log(
            "ℹ️ No hay operaciones pendientes"
        );

        return;

    }


    console.log(
        "🔄 Sincronizando cambios..."
    );


    const operacionesFallidas = [];


    for(
        const op of pendientes
    ){

        try{

            if(
                op.tipo === "crear"
            ){

                await addDoc(

                    collection(
                        db,
                        "territorios"
                    ),

                    op.datos

                );

            }else if(
                op.tipo === "editar"
            ){

                await updateDoc(

                    doc(
                        db,
                        "territorios",
                        op.id
                    ),

                    op.datos

                );

            }else if(
                op.tipo === "eliminar"
            ){

                await deleteDoc(

                    doc(
                        db,
                        "territorios",
                        op.id
                    )

                );

            }

        }catch(err){

            console.error(
                "⚠️ Error sincronizando operación:",
                op.tipo,
                err
            );


            operacionesFallidas.push(
                op
            );

        }

    }


    if(
        operacionesFallidas.length === 0
    ){

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

            JSON.stringify(
                operacionesFallidas
            )

        );


        console.log(
            "⚠️ Error sincronizando, se intentará nuevamente"
        );

    }

}


window.addEventListener(
    "online",
    async()=>{

        console.log(
            "🌐 Conexión restaurada"
        );


        actualizarEstadoConexion();


        await sincronizarPendientes();

    }
);


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


            snapshot.forEach(
                docSnap=>{

                    const data =
                    docSnap.data();


                    territorios.push({

                        id:
                            docSnap.id,

                        ...data

                    });


                    crearTerritorioVisual(

                        data,

                        docSnap.id

                    );

                }
            );


            guardarTerritoriosLocal(
                territorios
            );


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
        )?.value;


        const fecha =
        document.getElementById(
            `fecha-${id}`
        )?.value;


        const completado =
        document.getElementById(
            `check-${id}`
        )?.checked;


        if(!texto){

            alert(
                "Escribí una nota"
            );

            return;

        }


        await addDoc(

            collection(
                db,
                "notas"
            ),

            {

                territorioId:
                    id,

                nota:
                    texto,

                fecha:
                    fecha,

                completado:
                    completado,

                timestamp:
                    Date.now()

            }

        );


        alert(
            "Nota guardada ✅"
        );

    }catch(err){

        console.error(
            "Error guardando nota:",
            err
        );


        alert(
            "Error: no se pudo guardar la nota"
        );

    }

};


// =========================
// MALLAS
// =========================

document
.getElementById(
    "editarMallas"
)
.onclick = async()=>{

    const pass =
    prompt(
        "Contraseña:"
    );


    if(

        pass ===
        ADMIN_PASSWORD

        &&

        esAdmin

    ){

        const panel =
        document.getElementById(
            "mallas-section"
        );


        if(
            panel.style.display ===
            "block"
        ){

            panel.style.display =
                "none";


            if(drawControl){

                map.removeControl(
                    drawControl
                );

                drawControl =
                    null;

            }

        }else{

            panel.style.display =
                "block";


            cargarMallas();


            activarDibujo();

        }

    }else{

        alert(
            "Acceso denegado"
        );

    }

};


async function cargarMallas(){

    try{

        const snapshot =
        await getDocs(

            collection(
                db,
                "territorios"
            )

        );


        const lista =
        document.getElementById(
            "lista-mallas"
        );


        lista.innerHTML = "";


        snapshot.forEach(
            docSnap=>{

                const data =
                docSnap.data();


                lista.innerHTML += `

                    <div style="
                        border-bottom:1px solid #ccc;
                        margin-bottom:10px;
                        padding-bottom:10px;
                    ">

                        <input
                            id="nombre-${docSnap.id}"
                            value="${data.nombre || ""}"
                            style="width:100%"
                        >

                        <br><br>

                        <input
                            type="color"
                            id="color-${docSnap.id}"
                            value="${data.color || "#3388ff"}"
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

            }
        );

    }catch(err){

        console.error(
            "Error cargando mallas:",
            err
        );


        alert(
            "Error: no se pudieron cargar las mallas"
        );

    }

}


window.guardarCambios =
async function(id){

    if(!esAdmin){

        alert(
            "Solo administradores pueden editar territorios"
        );

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

            nombre:
                nombre.trim(),

            color

        };


        if(!navigator.onLine){

            guardarOperacionPendiente(

                "editar",

                datosActualizados,

                id

            );


            alert(
                "Sin conexión. Se sincronizará cuando haya internet."
            );


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


        alert(
            "Cambios guardados ✅"
        );


        await recargarMapa();

    }catch(err){

        console.error(
            "Error guardando cambios:",
            err
        );


        alert(
            "Error: no se pudieron guardar los cambios"
        );

    }

};


window.eliminarMalla =
async function(id){

    if(!esAdmin){

        alert(
            "Solo administradores pueden eliminar territorios"
        );

        return;

    }


    if(
        !confirm(
            "¿Eliminar malla?"
        )
    ){

        return;

    }


    try{

        if(!navigator.onLine){

            guardarOperacionPendiente(

                "eliminar",

                {},

                id

            );


            alert(
                "Sin conexión. Se sincronizará cuando haya internet."
            );


            return;

        }


        await deleteDoc(

            doc(
                db,
                "territorios",
                id
            )

        );


        alert(
            "Malla eliminada ✅"
        );


        await recargarMapa();


        cargarMallas();

    }catch(err){

        console.error(
            "Error eliminando malla:",
            err
        );


        alert(
            "Error: no se pudo eliminar la malla"
        );

    }

};


window.cerrarMallas = ()=>{

    const panel =
    document.getElementById(
        "mallas-section"
    );


    if(panel){

        panel.style.display =
            "none";

    }


    if(drawControl){

        map.removeControl(
            drawControl
        );

        drawControl =
            null;

    }

};


// =========================
// RECARGAR MAPA
// =========================

async function recargarMapa(){

    // =========================
    // ELIMINAR POLÍGONOS
    // =========================

    map.eachLayer(layer=>{

        if(
            layer instanceof L.Polygon
            &&
            !(layer instanceof L.Rectangle)
        ){

            map.removeLayer(
                layer
            );

        }

    });


    // =========================
    // ELIMINAR CLIMA
    // =========================

    climaMarkers.forEach(
        marker=>{

            if(
                map.hasLayer(marker)
            ){

                map.removeLayer(
                    marker
                );

            }

        }
    );


    climaMarkers = [];


    // =========================
    // ELIMINAR PUNTOS
    // =========================

    marcadoresPuntos.forEach(
        marker=>{

            if(
                map.hasLayer(marker)
            ){

                map.removeLayer(
                    marker
                );

            }

        }
    );


    marcadoresPuntos = [];


    // =========================
    // CARGAR TERRITORIOS
    // =========================

    await cargarTerritorios();


    // =========================
    // CARGAR PUNTOS
    // =========================

    await cargarPuntosAdmin();


    // =========================
    // CARGAR LETRAS
    // =========================

    await cargarLetrasAdmin();

}


// =========================
// UBICACIÓN
// =========================

let watchId = null;

let userMarker = null;


document
.getElementById(
    "toggleLocation"
)
.onclick = ()=>{

    if(watchId){

        navigator.geolocation.clearWatch(
            watchId
        );


        watchId =
            null;


        if(userMarker){

            map.removeLayer(
                userMarker
            );

            userMarker =
                null;

        }


        document
        .getElementById(
            "toggleLocation"
        )
        .innerText =
            "📍 Mi ubicación";


        return;

    }


    if(!navigator.geolocation){

        alert(
            "Tu navegador no permite obtener la ubicación."
        );

        return;

    }


    watchId =
    navigator
    .geolocation
    .watchPosition(

        pos=>{

            const latitude =
                pos.coords.latitude;

            const longitude =
                pos.coords.longitude;


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

        },

        error=>{

            console.error(
                "Error ubicación:",
                error
            );


            alert(
                "No se pudo obtener tu ubicación."
            );

        },

        {

            enableHighAccuracy:true,

            maximumAge:5000,

            timeout:10000

        }

    );


    document
    .getElementById(
        "toggleLocation"
    )
    .innerText =
        "📍 Desactivar ubicación";

};


// =========================
// ADMINISTRADORES
// =========================

document
.getElementById(
    "administrarAdmins"
)
.onclick = ()=>{

    const panel =
    document.getElementById(
        "admins-section"
    );


    panel.style.display =
        "block";


    cargarAdmins();

    cargarSolicitudes();

};


window.cerrarAdmins = ()=>{

    document
    .getElementById(
        "admins-section"
    )
    .style.display =
        "none";

};


// =========================
// ADMINS
// =========================

async function cargarAdmins(){

    const lista =
    document.getElementById(
        "lista-admins"
    );


    lista.innerHTML =
        "";


    const snapshot =
    await getDocs(
        collection(
            db,
            "usuarios"
        )
    );


    lista.innerHTML +=
        "<h4>👑 Administradores</h4>";


    snapshot.forEach(
        docSnap=>{

            const data =
            docSnap.data();


            if(

                data.rol !== "admin"

                &&

                data.rol !== "principal"

            ){

                return;

            }


            lista.innerHTML += `

                <div style="
                    border:1px solid #ccc;
                    border-radius:8px;
                    padding:10px;
                    margin-bottom:10px;
                ">

                    <b>
                        ${data.nombreCompleto || data.nombre || ""}
                    </b>

                    <br>

                    ${data.email || ""}

                    <br><br>

                    ${
                        data.rol === "principal"
                        ?
                        "🛡️ Administrador principal"
                        :
                        "🛡️ Administrador"
                    }

                    <br><br>

                    ${
                        data.rol === "principal"
                        ?
                        ""
                        :
                        `

                            <button
                                onclick="quitarAdmin('${docSnap.id}')"
                            >
                                ⬇ Quitar administrador
                            </button>

                            <button
                                onclick="eliminarUsuario('${docSnap.id}')"
                            >
                                🗑 Eliminar
                            </button>

                        `
                    }

                </div>

            `;

        }
    );


    lista.innerHTML +=
        "<hr><h4>✅ Usuarios aprobados</h4>";


    snapshot.forEach(
        docSnap=>{

            const data =
            docSnap.data();


            if(!data.aprobado){

                return;

            }


            if(

                data.rol === "admin"

                ||

                data.rol === "principal"

            ){

                return;

            }


            lista.innerHTML += `

                <div style="
                    border:1px solid #ccc;
                    border-radius:8px;
                    padding:10px;
                    margin-bottom:10px;
                ">

                    <b>
                        ${data.nombreCompleto || data.nombre || ""}
                    </b>

                    <br>

                    ${data.email || ""}

                    <br><br>

                    👤 Usuario

                    <br><br>

                    <button
                        onclick="hacerAdmin('${docSnap.id}')"
                    >
                        👑 Hacer administrador
                    </button>

                    <button
                        onclick="eliminarUsuario('${docSnap.id}')"
                    >
                        🗑 Eliminar
                    </button>

                </div>

            `;

        }
    );

}


// =========================
// AGREGAR ADMIN
// =========================

document
.getElementById(
    "agregarAdmin"
)
.onclick = async()=>{

    if(!esAdminPrincipal){

        alert(
            "Solo el administrador principal puede agregar administradores."
        );

        return;

    }


    const email =
    document
    .getElementById(
        "nuevoAdminEmail"
    )
    .value
    .trim()
    .toLowerCase();


    if(email === ""){

        alert(
            "Escribí un correo."
        );

        return;

    }


    const q =
    query(

        collection(
            db,
            "usuarios"
        ),

        where(
            "email",
            "==",
            email
        )

    );


    const resultado =
    await getDocs(q);


    if(resultado.empty){

        alert(
            "No existe ningún usuario con ese correo."
        );

        return;

    }


    const documento =
        resultado.docs[0];


    await updateDoc(

        doc(
            db,
            "usuarios",
            documento.id
        ),

        {

            aprobado:true,

            rol:"admin"

        }

    );


    document
    .getElementById(
        "nuevoAdminEmail"
    )
    .value =
        "";


    alert(
        "✅ Ahora es administrador."
    );


    cargarAdmins();

    cargarSolicitudes();

};


// =========================
// HACER ADMIN
// =========================

window.hacerAdmin =
async function(id){

    await updateDoc(

        doc(
            db,
            "usuarios",
            id
        ),

        {

            aprobado:true,

            rol:"admin"

        }

    );


    cargarAdmins();

};


// =========================
// QUITAR ADMIN
// =========================

window.quitarAdmin =
async function(id){

    await updateDoc(

        doc(
            db,
            "usuarios",
            id
        ),

        {

            rol:"usuario"

        }

    );


    cargarAdmins();

};


// =========================
// ELIMINAR USUARIO
// =========================

window.eliminarUsuario =
async function(id){

    if(
        !confirm(
            "¿Eliminar este usuario?"
        )
    ){

        return;

    }


    await deleteDoc(

        doc(
            db,
            "usuarios",
            id
        )

    );


    cargarAdmins();

    cargarSolicitudes();

};


// =========================
// SOLICITUDES
// =========================

async function cargarSolicitudes(){

    let html =
        "<hr><h4>📨 Solicitudes</h4>";


    const snapshot =
    await getDocs(
        collection(
            db,
            "usuarios"
        )
    );


    snapshot.forEach(
        docSnap=>{

            const data =
            docSnap.data();


            if(
                data.aprobado === true
            ){

                return;

            }


            html += `

                <div style="
                    border:1px solid #ccc;
                    border-radius:8px;
                    padding:10px;
                    margin-bottom:10px;
                ">

                    <b>
                        ${data.nombreCompleto || data.nombre || ""}
                    </b>

                    <br>

                    ${data.email || ""}

                    <br><br>

                    <button
                        onclick="aprobarUsuario('${docSnap.id}')"
                    >
                        ✅ Aprobar
                    </button>

                    <button
                        onclick="rechazarUsuario('${docSnap.id}')"
                    >
                        ❌ Rechazar
                    </button>

                </div>

            `;

        }
    );


    document
    .getElementById(
        "lista-solicitudes"
    )
    .innerHTML =
        html;

}


// =========================
// APROBAR
// =========================

window.aprobarUsuario =
async function(id){

    await updateDoc(

        doc(
            db,
            "usuarios",
            id
        ),

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

window.rechazarUsuario =
async function(id){

    if(
        !confirm(
            "¿Eliminar solicitud?"
        )
    ){

        return;

    }


    await deleteDoc(

        doc(
            db,
            "usuarios",
            id
        )

    );


    cargarAdmins();

    cargarSolicitudes();

};


// =========================
// PUNTOS ADMIN
// =========================

const ICONOS_PUNTO = [

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
// ADMINISTRAR PUNTOS
// =========================

document
.getElementById(
    "administrarPuntos"
)
.onclick = ()=>{

    modoAgregarPunto =
        !modoAgregarPunto;


    if(modoAgregarPunto){

        alert(
            "Hacé clic en el mapa para colocar un punto."
        );


        document
        .getElementById(
            "administrarPuntos"
        )
        .innerText =
            "❌ Cancelar";

    }else{

        document
        .getElementById(
            "administrarPuntos"
        )
        .innerText =
            "📍 Puntos";

    }

};


// =========================
// CREAR PUNTO
// =========================

map.on(
    "click",
    async(e)=>{

        if(!esAdmin){

            return;

        }


        if(!modoAgregarPunto){

            return;

        }


        const nombre =
        prompt(
            "Nombre del punto:"
        );


        if(!nombre){

            modoAgregarPunto =
                false;


            document
            .getElementById(
                "administrarPuntos"
            )
            .innerText =
                "📍 Puntos";


            return;

        }


        const icono =
        prompt(
`Elegí un icono:

🏠 🌳 ⚠️ ⭐ 🚗 ⛔ 🏢

Escribí uno`,
            "📍"
        );


        try{

            await addDoc(

                collection(
                    db,
                    "puntosAdmin"
                ),

                {

                    nombre:
                        nombre.trim(),

                    lat:
                        e.latlng.lat,

                    lng:
                        e.latlng.lng,

                    color:
                        "#3388ff",

                    publico:
                        false,

                    icono:
                        icono || "📍",

                    creadoPor:
                        currentUser?.email || "",

                    fecha:
                        Date.now()

                }

            );


            modoAgregarPunto =
                false;


            document
            .getElementById(
                "administrarPuntos"
            )
            .innerText =
                "📍 Puntos";


            cargarPuntosAdmin();

        }catch(error){

            console.error(
                "Error creando punto:",
                error
            );


            alert(
                "No se pudo crear el punto."
            );

        }

    }
);


// =========================
// CARGAR PUNTOS
// =========================

async function cargarPuntosAdmin(){

    marcadoresPuntos.forEach(
        marker=>{

            if(
                map.hasLayer(marker)
            ){

                map.removeLayer(
                    marker
                );

            }

        }
    );


    marcadoresPuntos = [];


    if(!navigator.onLine){

        return;

    }


    try{

        const snapshot =
        await getDocs(

            collection(
                db,
                "puntosAdmin"
            )

        );


        snapshot.forEach(
            docSnap=>{

                const data =
                docSnap.data();


                // INVITADO

                if(esInvitado){

                    return;

                }


                // USUARIO NORMAL

                if(

                    !esAdmin

                    &&

                    data.publico !== true

                ){

                    return;

                }


                let htmlIcono =
                    "";


                if(
                    (data.icono || "PIN")
                    ===
                    "PIN"
                ){

                    htmlIcono = `

                        <svg
                            width="24"
                            height="32"
                            viewBox="0 0 24 24"
                        >

                            <path

                                fill="${data.color || "#3388ff"}"

                                stroke="white"

                                stroke-width="1.5"

                                d="
                                    M12 2
                                    C8 2 5 5 5 9
                                    C5 14 12 22 12 22
                                    C12 22 19 14 19 9
                                    C19 5 16 2 12 2Z
                                "

                            />

                            <circle
                                cx="12"
                                cy="9"
                                r="3"
                                fill="white"
                            />

                        </svg>

                    `;

                }else{

                    htmlIcono = `

                        <div class="iconoPuntoMapa">

                            ${data.icono}

                        </div>

                    `;

                }


                const icono =
                L.divIcon({

                    html:
                        htmlIcono,

                    className:
                        "",

                    iconSize:
                        [24,24],

                    iconAnchor:
                        [12,12]

                });


                const marcador =
                L.marker(

                    [

                        data.lat,

                        data.lng

                    ],

                    {

                        icon

                    }

                ).addTo(map);


                marcador.bindTooltip(

                    data.nombre,

                    {

                        permanent:
                            map.getZoom() >= 15,

                        direction:
                            "top",

                        offset:
                            [0,-20],

                        className:
                            "nombrePuntoAdmin"

                    }

                );


                // =========================
                // ADMIN
                // =========================

                if(esAdmin){

                    let opciones =
                        "";


                    ICONOS_PUNTO.forEach(
                        i=>{

                            opciones += `

                                <option
                                    value="${i}"
                                    ${
                                        (data.icono || "PIN")
                                        ===
                                        i
                                        ?
                                        "selected"
                                        :
                                        ""
                                    }
                                >

                                    ${
                                        i === "PIN"
                                        ?
                                        "📌 Pin"
                                        :
                                        i
                                    }

                                </option>

                            `;

                        }
                    );


                    marcador.bindPopup(`

                        <b>
                            ${data.nombre}
                        </b>

                        <br><br>

                        🎨 Color

                        <br>

                        <input

                            type="color"

                            value="${
                                data.color ||
                                "#3388ff"
                            }"

                            onchange="
                                cambiarColorPunto(
                                    '${docSnap.id}',
                                    this.value
                                )
                            "

                        >

                        <br><br>

                        😀 Icono

                        <br>

                        <select

                            onchange="
                                cambiarIconoPunto(
                                    '${docSnap.id}',
                                    this.value
                                )
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
                                eliminarPuntoAdmin(
                                    '${docSnap.id}'
                                )
                            "

                        >

                            🗑 Eliminar

                        </button>

                    `);

                }else{

                    marcador.bindPopup(`

                        <b>
                            ${data.nombre}
                        </b>

                    `);

                }


                marcadoresPuntos.push(
                    marcador
                );

            }
        );

    }catch(error){

        console.error(
            "Error cargando puntos:",
            error
        );

    }

}


// =========================
// CAMBIAR COLOR
// =========================

window.cambiarColorPunto =
async function(
    id,
    color
){

    await updateDoc(

        doc(
            db,
            "puntosAdmin",
            id
        ),

        {

            color

        }

    );


    cargarPuntosAdmin();

};


// =========================
// CAMBIAR ICONO
// =========================

window.cambiarIconoPunto =
async function(
    id,
    icono
){

    await updateDoc(

        doc(
            db,
            "puntosAdmin",
            id
        ),

        {

            icono

        }

    );


    cargarPuntosAdmin();

};


// =========================
// VISIBILIDAD
// =========================

window.cambiarVisibilidadPunto =
async function(
    id,
    publico
){

    await updateDoc(

        doc(
            db,
            "puntosAdmin",
            id
        ),

        {

            publico

        }

    );


    cargarPuntosAdmin();

};


// =========================
// ELIMINAR PUNTO
// =========================

window.eliminarPuntoAdmin =
async function(id){

    if(
        !confirm(
            "¿Eliminar este punto?"
        )
    ){

        return;

    }


    await deleteDoc(

        doc(
            db,
            "puntosAdmin",
            id
        )

    );


    cargarPuntosAdmin();

};


// =========================
// MOSTRAR / OCULTAR CLIMA
// =========================

document
.getElementById(
    "toggleClima"
)
.onclick = ()=>{

    climaVisible =
        !climaVisible;


    climaMarkers.forEach(
        marker=>{

            if(climaVisible){

                if(
                    !map.hasLayer(marker)
                ){

                    marker.addTo(map);

                }

            }else{

                if(
                    map.hasLayer(marker)
                ){

                    map.removeLayer(
                        marker
                    );

                }

            }

        }
    );


    document
    .getElementById(
        "toggleClima"
    )
    .innerText =

        climaVisible

        ?

        "🌤 Ocultar clima"

        :

        "🌤 Mostrar clima";

};


// =========================
// ZOOM
// =========================

map.on(
    "zoomend",
    ()=>{

        const mostrar =
            map.getZoom() >= 15;


        map.eachLayer(
            layer=>{

                if(
                    !layer.getTooltip
                ){

                    return;

                }


                const tooltip =
                    layer.getTooltip();


                if(!tooltip){

                    return;

                }


                if(mostrar){

                    layer.openTooltip();

                }else{

                    layer.closeTooltip();

                }

            }
        );


        // Controlar visibilidad de las letras personalizadas según el zoom
        marcadoresLetras.forEach(item => {
            if(mostrar){
                item.marker.setOpacity(1);
            } else {
                item.marker.setOpacity(0);
            }
        });

    }
);


// =========================
// LETRAS ADMIN
// =========================

let modoAgregarLetra = false;
let marcadoresLetras = [];

const btnLetras = document.getElementById("administrarLetras");

if(btnLetras){

    btnLetras.onclick = ()=>{

        if(!esAdmin){
            alert("Solo administradores pueden gestionar letras.");
            return;
        }

        modoAgregarLetra = !modoAgregarLetra;

        if(modoAgregarLetra){

            alert("Hacé clic en el mapa para colocar una letra o texto.");
            btnLetras.innerText = "❌ Cancelar letra";

            const seccionLetras = document.getElementById("letras-section");
            if(seccionLetras){
                seccionLetras.style.display = "block";
                cargarListaLetrasAdmin();
            }

        }else{

            btnLetras.innerText = "🔤 Letras";
            const seccionLetras = document.getElementById("letras-section");
            if(seccionLetras){
                seccionLetras.style.display = "none";
            }

        }

    };

}

window.cerrarLetras = ()=>{

    modoAgregarLetra = false;
    if(btnLetras) btnLetras.innerText = "🔤 Letras";

    const seccionLetras = document.getElementById("letras-section");
    if(seccionLetras){
        seccionLetras.style.display = "none";
    }

};


// =========================
// CREAR LETRA EN MAPA (Click)
// =========================

map.on("click", async(e)=>{

    if(!esAdmin || !modoAgregarLetra) return;

    const textoLetra = prompt("Escribí el texto o letra a mostrar:");

    if(!textoLetra){
        modoAgregarLetra = false;
        if(btnLetras) btnLetras.innerText = "🔤 Letras";
        return;
    }

    try{

        await addDoc(collection(db, "letrasAdmin"), {
            texto: textoLetra.trim(),
            lat: e.latlng.lat,
            lng: e.latlng.lng,
            creadoPor: currentUser?.email || "",
            fecha: Date.now()
        });

        modoAgregarLetra = false;
        if(btnLetras) btnLetras.innerText = "🔤 Letras";

        alert("Letra agregada correctamente ✅");
        cargarLetrasAdmin();
        cargarListaLetrasAdmin();

    }catch(error){
        console.error("Error creando letra:", error);
        alert("No se pudo crear la letra.");
    }

});


// =========================
// CARGAR LETRAS EN EL MAPA (Visible para admins y usuarios)
// =========================

async function cargarLetrasAdmin(){

    marcadoresLetras.forEach(marker=>{
        if(map.hasLayer(marker)){
            map.removeLayer(marker);
        }
    });

    marcadoresLetras = [];

    // Si es invitado y decidiste que no vea letras, puedes retornar aquí. 
    // Como pediste que sean visibles para usuarios y admins, dejamos pasar a ambos.
    if(esInvitado) return;

    if(!navigator.onLine) return;

    try{

        const snapshot = await getDocs(collection(db, "letrasAdmin"));

        snapshot.forEach(docSnap=>{

            const data = docSnap.data();

            // Creamos un divIcon transparente con estilo de texto flotante
            const iconoLetra = L.divIcon({
                html: `<div style="
                    background: rgba(0, 0, 0, 0.75);
                    color: white;
                    padding: 3px 6px;
                    border-radius: 4px;
                    font-weight: bold;
                    font-size: 14px;
                    white-space: nowrap;
                    border: 1px solid white;
                    text-shadow: 1px 1px 2px black;
                ">${data.texto}</div>`,
                className: "",
                iconSize: [40, 20],
                iconAnchor: [20, 10]
            });

            const marcador = L.marker([data.lat, data.lng], {
                icon: iconoLetra
            }).addTo(map);

            // Se mostrará solo si el zoom es >= 15 (igual que los nombres de puntos)
            const mostrarAlHacerZoom = map.getZoom() >= 15;
            
            if(mostrarAlHacerZoom){
                marcador.setOpacity(1);
            } else {
                marcador.setOpacity(0);
            }

            // Popup: Si es admin puede ver y eliminar, el usuario común solo ve el texto
            if(esAdmin){
                marcador.bindPopup(`
                    <b>Texto:</b> ${data.texto}<br><br>
                    <button onclick="eliminarLetraAdmin('${docSnap.id}')">🗑 Eliminar letra</button>
                `);
            } else {
                marcador.bindPopup(`
                    <b>Texto:</b> ${data.texto}
                `);
            }

            marcadoresLetras.push({ marker: marcador, data });

        });

    }catch(error){
        console.error("Error cargando letras:", error);
    }

}


// =========================
// ELIMINAR LETRA
// =========================

window.eliminarLetraAdmin = async function(id){
    if(!confirm("¿Eliminar esta letra del mapa?")) return;

    try{
        await deleteDoc(doc(db, "letrasAdmin", id));
        alert("Letra eliminada ✅");
        cargarLetrasAdmin();
        cargarListaLetrasAdmin();
    }catch(err){
        console.error("Error al eliminar letra:", err);
        alert("No se pudo eliminar.");
    }
};


// =========================
// PANEL LISTA DE LETRAS
// =========================

async function cargarListaLetrasAdmin(){
    const contenedor = document.getElementById("lista-letras");
    if(!contenedor) return;

    contenedor.innerHTML = "<p>Cargando letras...</p>";

    try{
        const snapshot = await getDocs(collection(db, "letrasAdmin"));
        let html = "<h4>🔤 Letras ubicadas</h4>";

        if(snapshot.empty){
            contenedor.innerHTML = "<p>No hay letras creadas todavía.</p>";
            return;
        }

        snapshot.forEach(docSnap=>{
            const data = docSnap.data();
            html += `
                <div style="border-bottom:1px solid #ccc; margin-bottom:8px; padding-bottom:8px;">
                    <b>${data.texto}</b><br>
                    <small>Lat: ${data.lat.toFixed(4)}, Lng: ${data.lng.toFixed(4)}</small><br>
                    <button onclick="eliminarLetraAdmin('${docSnap.id}')" style="margin-top:5px;">🗑 Eliminar</button>
                </div>
            `;
        });

        contenedor.innerHTML = html;

    }catch(err){
        console.error("Error al listar letras:", err);
        contenedor.innerHTML = "<p>Error al cargar las letras.</p>";
    }
}

// =========================
// FIN APP
// =========================

console.log(
    "✅ APP.JS cargado correctamente"
);
