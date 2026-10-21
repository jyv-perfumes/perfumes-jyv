import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ==========================================
// 🔑 CONFIGURACIÓN IMGBB Y WHATSAPP
// ==========================================
const IMGBB_API_KEY = "8a2b9037b8733cba6a00b87a07dad307"; 
const WHATSAPP_NUMBER = "5492634670332"; 

// ==========================================
// 🔥 CREDENCIALES DE TU PROYECTO (catalogo-perfumes-39a76)
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDp8LyPEl9x7zDhhhHL1tOCMOLbHhc9yI8",
    authDomain: "catalogo-perfumes-39a76.firebaseapp.com",
    projectId: "catalogo-perfumes-39a76",
    storageBucket: "catalogo-perfumes-39a76.firebasestorage.app",
    messagingSenderId: "28761695319",
    appId: "1:28761695319:web:a1b890dc9006ee00096f12"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const productsRef = collection(db, "perfumes");

let isAdmin = false;
let currentCategory = 'todos';

// ==========================================
// 💧 FORMATEADOR AUTOMÁTICO DE MILILITROS (Ej: "50" -> "50 ml")
// ==========================================
function formatMl(valor) {
    if (!valor) return '';
    const limpio = String(valor).replace(/ml/gi, '').trim();
    return `${limpio} ml`;
}

// ==========================================
// 🎨 GENERADOR AUTOMÁTICO DE DECORACIONES ALEATORIAS
// ==========================================
function loadRandomDecorations() {
    const container = document.getElementById('bg-decorations-container');
    if (!container) return;
    const maxDecorFiles = 8;

    const zones = [
        { top: '8%', left: '4%' },
        { top: '14%', left: '82%' },
        { top: '38%', left: '6%' },
        { top: '45%', left: '85%' },
        { top: '68%', left: '5%' },
        { top: '75%', left: '80%' },
        { top: '25%', left: '45%' },
        { top: '85%', left: '40%' }
    ];

    for (let i = 1; i <= maxDecorFiles; i++) {
        const img = document.createElement('img');
        img.src = `assets/img/decor${i}.png`;
        img.className = 'bg-decoration';

        img.onerror = function() {
            if (this.src.endsWith('.png')) {
                this.src = `assets/img/decor${i}.jpeg`;
            } else {
                this.remove();
            }
        };

        const zone = zones[(i - 1) % zones.length];
        const randomOffsetTop = Math.floor(Math.random() * 8) - 4;
        const randomOffsetLeft = Math.floor(Math.random() * 8) - 4;
        const randomSize = Math.floor(Math.random() * 60) + 110;
        const randomDuration = (Math.random() * 4 + 5).toFixed(1);
        const randomDelay = (Math.random() * 3).toFixed(1);

        img.style.top = `calc(${zone.top} + ${randomOffsetTop}%)`;
        img.style.left = `calc(${zone.left} + ${randomOffsetLeft}%)`;
        img.style.width = `${randomSize}px`;
        img.style.animationDuration = `${randomDuration}s`;
        img.style.animationDelay = `${randomDelay}s`;

        container.appendChild(img);
    }
}

// Subir foto a ImgBB
async function uploadToImgBB(file) {
    const formData = new FormData();
    formData.append("image", file);
    formData.append("key", IMGBB_API_KEY);
    
    const response = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: formData });
    const data = await response.json();
    if (!data.success) throw new Error("Error al subir la imagen a ImgBB");
    return data.data.url;
}

// Mostrar perfumes en tiempo real
const renderProducts = (category = 'todos') => {
    const container = document.getElementById('products-container');
    container.innerHTML = '<div class="text-center w-100 fs-5 py-5 text-light opacity-75">Cargando catálogo JyV... ✨</div>';
    
    let q = productsRef;
    if (category !== 'todos') {
        q = query(productsRef, where("categoria", "==", category));
    }

    onSnapshot(q, (snapshot) => {
        container.innerHTML = '';
        if (snapshot.empty) {
            container.innerHTML = '<div class="text-center w-100 my-5"><h5 class="text-light opacity-50 fw-light">Todavía no hay fragancias cargadas en esta sección.</h5></div>';
            return;
        }

        let delay = 0;
        snapshot.forEach((docSnap) => {
            const prod = docSnap.data();
            const id = docSnap.id;
            const precioFormateado = Number(prod.precio).toLocaleString('es-AR');
            const mlFormateado = formatMl(prod.mililitros);
            const mensajeWsp = encodeURIComponent(`¡Hola JyV! ✨ Quiero consultar por el perfume: ${prod.nombre} (${mlFormateado}) - $${precioFormateado}`);

            const col = document.createElement('div');
            col.className = 'col product-card-wrapper';
            col.style.animationDelay = `${delay}s`;
            delay += 0.08;

            col.innerHTML = `
                <div class="card h-100 shadow position-relative">
                    ${isAdmin ? `<button onclick="window.deleteProduct('${id}')" class="delete-btn" title="Eliminar perfume">✕</button>` : ''}
                    <div class="img-container">
                        <img src="${prod.imagen}" class="card-img-top" alt="${prod.nombre}" 
                             onclick="window.showFullImage('${prod.imagen}')" 
                             onerror="this.src='https://via.placeholder.com/300x275?text=Sin+Imagen'">
                        ${mlFormateado ? `<span class="badge-ml">${mlFormateado}</span>` : ''}
                    </div>
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title mb-1">${prod.nombre}</h5>
                        <p class="card-desc mb-3">${prod.descripcion}</p>
                        <div class="mt-auto d-flex justify-content-between align-items-center pt-3 border-top border-secondary border-opacity-25">
                            <div class="d-flex align-items-center gap-2">
                                <span class="price-tag">$${precioFormateado}</span>
                                ${isAdmin ? `<button onclick="window.editPrice('${id}',${prod.precio})" class="edit-price-btn" title="Modificar precio">✏️</button>` : ''}
                            </div>
                            <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${mensajeWsp}" 
                               class="btn whatsapp-btn btn-sm" target="_blank">Consultar ✨</a>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(col);
        });
    });
};

// Subir un perfume nuevo
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById('submit-btn');
    const loadingMsg = document.getElementById('loading-msg');
    submitBtn.disabled = true;
    loadingMsg.style.display = 'block';

    const nombre = document.getElementById('nombre').value.trim();
    const mililitros = formatMl(document.getElementById('mililitros').value);
    const precio = Number(document.getElementById('precio').value);
    const categoria = document.getElementById('categoria').value;
    const descripcion = document.getElementById('descripcion').value.trim();
    const file = document.getElementById('foto-file').files[0];

    try {
        if (!file) throw new Error("Por favor selecciona una foto.");
        const imagenUrl = await uploadToImgBB(file);

        await addDoc(productsRef, {
            nombre,
            mililitros,
            precio,
            categoria,
            imagen: imagenUrl,
            descripcion,
            fecha: new Date()
        });

        alert('¡Perfume publicado con éxito! ✨');
        e.target.reset();
    } catch (error) {
        console.error(error);
        alert("Error al subir: " + error.message);
    } finally {
        submitBtn.disabled = false;
        loadingMsg.style.display = 'none';
    }
});

// ==========================================
// ✏️ MODIFICAR PRECIO (Solo Admin)
// ==========================================
window.editPrice = async (id, precioActual) => {
    if (!isAdmin) return;
    const nuevoPrecioStr = prompt("Ingresa el nuevo precio ($):", precioActual);
    
    // Si el usuario cancela el cuadro de diálogo, no hacemos nada
    if (nuevoPrecioStr === null) return;

    // Limpiamos puntos o signos por si escribe "55.000" en vez de "55000"
    const precioLimpio = Number(nuevoPrecioStr.replace(/[^0-9]/g, ''));

    if (!precioLimpio || precioLimpio <= 0) {
        alert("Por favor ingresa un precio válido (solo números).");
        return;
    }

    try {
        await updateDoc(doc(db, "perfumes", id), {
            precio: precioLimpio
        });
    } catch (error) {
        console.error(error);
        alert("Error al actualizar el precio: " + error.message);
    }
};

// ==========================================
// 🔐 LOGIN ADMIN PRIVADO
// ==========================================
const loginModalEl = document.getElementById('loginModal');
const loginModal = new bootstrap.Modal(loginModalEl);

window.openAdminLogin = (event) => {
    if (event) event.preventDefault();
    if (isAdmin) {
        document.getElementById('admin-section').scrollIntoView({ behavior: 'smooth' });
        return;
    }
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-form').reset();
    loginModal.show();
};

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('admin-user').value.trim().toLowerCase();
    const pass = document.getElementById('admin-pass').value.trim();

    if (user === "valentina" && pass === "2634") {
        isAdmin = true;
        loginModal.hide();
        document.getElementById('admin-section').style.display = 'block';
        document.getElementById('admin-btn-nav').innerHTML = '👑 Modo Admin';
        renderProducts(currentCategory);
    } else {
        document.getElementById('login-error').style.display = 'block';
    }
});

window.logoutAdmin = () => {
    isAdmin = false;
    document.getElementById('admin-section').style.display = 'none';
    document.getElementById('admin-btn-nav').innerHTML = '🔒 Admin';
    renderProducts(currentCategory);
};

// ==========================================
// 🗑️ BORRAR, FILTRAR Y VER IMAGEN
// ==========================================
window.deleteProduct = async (id) => {
    if (confirm('¿Seguro que quieres eliminar este perfume del catálogo?')) {
        await deleteDoc(doc(db, "perfumes", id));
    }
};

window.filterProducts = (cat, event) => {
    if (event) event.preventDefault();
    currentCategory = cat;
    renderProducts(cat);
    document.querySelectorAll('#category-filters .nav-link').forEach(l => l.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
};

window.showFullImage = (imageUrl) => {
    document.getElementById('modalImage').src = imageUrl;
    bootstrap.Modal.getOrCreateInstance(document.getElementById('imageModal')).show();
};

// Iniciar decoraciones y catálogo
loadRandomDecorations();
renderProducts();