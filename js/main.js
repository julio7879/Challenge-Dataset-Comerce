/* ==========================================================================
   js/main.js - Data Commerce Store Logic & Cart Management
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initStore();
});

// State
let inventario = [];
let ventas = [];
let carrito = [];

// Formateador de moneda en pesos colombianos (COP)
const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(valor);
};

// --- Data Loading & Synchronization ---
const initStore = async () => {
    try {
        await cargarDatos();
        cargarCarritoDesdeStorage();
        renderizarCatalogo(inventario);
        configurarEventos();
    } catch (error) {
        mostrarToast('Error al inicializar la tienda. ' + error.message, 'error');
    }
};

const cargarDatos = async () => {
    const localInventario = localStorage.getItem('inventario_db');
    const localVentas = localStorage.getItem('ventas_db');

    if (localInventario && localVentas) {
        try {
            inventario = JSON.parse(localInventario);
            ventas = JSON.parse(localVentas);
            return;
        } catch (e) {
            console.error("Error leyendo localStorage", e);
        }
    }

    // Fetch initial data if localStorage is empty
    const resInv = await fetch('inventario.json');
    const resVen = await fetch('ventas.json');
    
    if (!resInv.ok || !resVen.ok) throw new Error('Error cargando JSON iniciales');
    
    inventario = await resInv.json();
    ventas = await resVen.json();

    guardarDatosEnStorage();
};

const guardarDatosEnStorage = () => {
    localStorage.setItem('inventario_db', JSON.stringify(inventario));
    localStorage.setItem('ventas_db', JSON.stringify(ventas));
};

// --- UI Rendering ---
const renderizarCatalogo = (productos) => {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    if (productos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">No se encontraron productos.</p>';
        return;
    }

    productos.forEach(producto => {
        const enStock = producto.cantidad_existente > 0;
        const stockClase = producto.cantidad_existente === 0 ? 'stock-out' : (producto.cantidad_existente < 20 ? 'stock-low' : 'stock-high');
        const stockTexto = producto.cantidad_existente === 0 ? 'Agotado' : (producto.cantidad_existente < 20 ? `¡Solo ${producto.cantidad_existente}!` : 'En Stock');

        const emoji = obtenerEmojiPlaceholder(producto.producto);

        const card = document.createElement('article');
        card.className = 'product-card fade-in';
        card.innerHTML = `
            <div class="product-card__image">
                <span>${emoji}</span>
                <span class="product-card__stock-badge ${stockClase}">${stockTexto}</span>
            </div>
            <div class="product-card__content">
                <h3 class="product-card__title">${producto.producto}</h3>
                <span class="product-card__provider">${producto.proveedor}</span>
                <div class="product-card__price">${formatearMoneda(producto.valor_venta)}</div>
                
                <div class="product-card__actions">
                    <button class="btn btn--primary add-to-cart-btn" data-id="${producto.id_producto}" ${!enStock ? 'disabled' : ''}>
                        ${enStock ? 'Agregar al Carrito' : 'Agotado'}
                    </button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });

    // Reasignar eventos a los nuevos botones
    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            agregarAlCarrito(id);
        });
    });
};

const obtenerEmojiPlaceholder = (nombre) => {
    const map = {
        'Monstera': '🪴',
        'Sansevieria': '🐍',
        'Pothos': '🌿',
        'Helecho': '🌱',
        'Cactus': '🌵',
        'Suculenta': '🪷',
        'Orquídea': '🌸',
        'Ficus': '🌳',
        'Palma': '🌴',
        'Lavanda': '🪻',
        'Romero': '🌿',
        'Bonsái': '🌲'
    };
    for (const key in map) {
        if (nombre.includes(key)) return map[key];
    }
    return '🪴';
};

// --- Cart Logic ---
const cargarCarritoDesdeStorage = () => {
    const localCarrito = localStorage.getItem('carrito_local');
    if (localCarrito) {
        carrito = JSON.parse(localCarrito);
        actualizarUICarrito();
    }
};

const guardarCarritoEnStorage = () => {
    localStorage.setItem('carrito_local', JSON.stringify(carrito));
};

const agregarAlCarrito = (id) => {
    const productoDb = inventario.find(p => p.id_producto === id);
    if (!productoDb) return;

    const itemEnCarrito = carrito.find(item => item.id_producto === id);
    const cantidadActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;

    if (cantidadActual + 1 > productoDb.cantidad_existente) {
        mostrarToast('¡Stock insuficiente!', 'error');
        return;
    }

    if (itemEnCarrito) {
        itemEnCarrito.cantidad += 1;
    } else {
        carrito.push({
            id_producto: productoDb.id_producto,
            producto: productoDb.producto,
            valor_unitario: productoDb.valor_venta,
            cantidad: 1,
            emoji: obtenerEmojiPlaceholder(productoDb.producto)
        });
    }

    guardarCarritoEnStorage();
    actualizarUICarrito();
    abrirCarrito();
    mostrarToast(`${productoDb.producto} agregado.`, 'success');
};

const modificarCantidad = (id, delta) => {
    const itemEnCarrito = carrito.find(item => item.id_producto === id);
    if (!itemEnCarrito) return;

    const productoDb = inventario.find(p => p.id_producto === id);
    
    if (delta > 0 && itemEnCarrito.cantidad + delta > productoDb.cantidad_existente) {
        mostrarToast('¡Stock insuficiente!', 'error');
        return;
    }

    itemEnCarrito.cantidad += delta;

    if (itemEnCarrito.cantidad <= 0) {
        carrito = carrito.filter(item => item.id_producto !== id);
    }

    guardarCarritoEnStorage();
    actualizarUICarrito();
};

const eliminarDelCarrito = (id) => {
    carrito = carrito.filter(item => item.id_producto !== id);
    guardarCarritoEnStorage();
    actualizarUICarrito();
};

const vaciarCarrito = () => {
    carrito = [];
    guardarCarritoEnStorage();
    actualizarUICarrito();
};

const actualizarUICarrito = () => {
    const container = document.getElementById('cart-items');
    const totalCountEl = document.getElementById('cart-count');
    const totalPriceEl = document.getElementById('cart-total-price');

    if (carrito.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: var(--text-muted); margin-top: 2rem;">Tu carrito está vacío.</div>';
        totalCountEl.textContent = '0';
        totalPriceEl.textContent = formatearMoneda(0);
        return;
    }

    container.innerHTML = '';
    let totalPrecio = 0;
    let totalCantidad = 0;

    carrito.forEach(item => {
        totalPrecio += item.valor_unitario * item.cantidad;
        totalCantidad += item.cantidad;

        const div = document.createElement('div');
        div.className = 'cart-item fade-in';
        div.innerHTML = `
            <div class="cart-item__icon">${item.emoji}</div>
            <div class="cart-item__details">
                <div class="cart-item__title">${item.producto}</div>
                <div class="cart-item__price">${formatearMoneda(item.valor_unitario)}</div>
                <div class="cart-item__controls">
                    <button class="qty-btn dec-btn" data-id="${item.id_producto}">-</button>
                    <span>${item.cantidad}</span>
                    <button class="qty-btn inc-btn" data-id="${item.id_producto}">+</button>
                </div>
            </div>
            <button class="remove-btn remove-item-btn" data-id="${item.id_producto}">🗑️</button>
        `;
        container.appendChild(div);
    });

    totalCountEl.textContent = totalCantidad;
    totalPriceEl.textContent = formatearMoneda(totalPrecio);

    // Eventos de botones dentro del carrito
    document.querySelectorAll('.inc-btn').forEach(btn => btn.addEventListener('click', (e) => modificarCantidad(e.target.dataset.id, 1)));
    document.querySelectorAll('.dec-btn').forEach(btn => btn.addEventListener('click', (e) => modificarCantidad(e.target.dataset.id, -1)));
    document.querySelectorAll('.remove-item-btn').forEach(btn => btn.addEventListener('click', (e) => {
        eliminarDelCarrito(e.currentTarget.dataset.id);
    }));
};

// --- Checkout ---
const procesarCompra = () => {
    if (carrito.length === 0) {
        mostrarToast('El carrito está vacío.', 'error');
        return;
    }

    // 1. Validar stock actual
    let errorStock = false;
    carrito.forEach(item => {
        const dbItem = inventario.find(p => p.id_producto === item.id_producto);
        if (!dbItem || dbItem.cantidad_existente < item.cantidad) {
            errorStock = true;
        }
    });

    if (errorStock) {
        mostrarToast('Algunos productos ya no tienen stock suficiente. Recargando inventario...', 'error');
        cargarDatos().then(() => {
            actualizarUICarrito();
            renderizarCatalogo(inventario);
        });
        return;
    }

    // 2. Registrar la venta y descontar stock
    const fechaActual = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    carrito.forEach(item => {
        // Descontar inventario
        const dbItem = inventario.find(p => p.id_producto === item.id_producto);
        dbItem.cantidad_existente -= item.cantidad;

        // Registrar venta
        ventas.push({
            fecha: fechaActual,
            id_producto: item.id_producto,
            producto: item.producto,
            cantidad: item.cantidad,
            valor_unitario: item.valor_unitario,
            total: item.valor_unitario * item.cantidad
        });
    });

    // 3. Persistir en localStorage
    guardarDatosEnStorage();

    // 4. Limpiar y notificar
    vaciarCarrito();
    cerrarCarrito();
    mostrarToast('¡Compra realizada con éxito! El dashboard ha sido actualizado.', 'success');
    
    // 5. Re-renderizar catálogo
    filtrarCatalogo();
};

// --- Event Listeners ---
const configurarEventos = () => {
    // UI Carrito
    document.getElementById('cart-toggle').addEventListener('click', abrirCarrito);
    document.getElementById('close-cart').addEventListener('click', cerrarCarrito);
    document.getElementById('cart-overlay').addEventListener('click', cerrarCarrito);
    document.getElementById('empty-cart-btn').addEventListener('click', vaciarCarrito);
    document.getElementById('checkout-btn').addEventListener('click', procesarCompra);

    // Filtros
    document.getElementById('search-input').addEventListener('input', filtrarCatalogo);
    document.getElementById('filter-select').addEventListener('change', filtrarCatalogo);
};

const abrirCarrito = () => {
    document.getElementById('cart-sidebar').classList.add('open');
    document.getElementById('cart-overlay').classList.add('open');
};

const cerrarCarrito = () => {
    document.getElementById('cart-sidebar').classList.remove('open');
    document.getElementById('cart-overlay').classList.remove('open');
};

const filtrarCatalogo = () => {
    const search = document.getElementById('search-input').value.toLowerCase();
    const filter = document.getElementById('filter-select').value;

    const filtrados = inventario.filter(prod => {
        const matchSearch = prod.producto.toLowerCase().includes(search);
        const matchStock = filter === 'all' || (filter === 'in-stock' && prod.cantidad_existente > 0);
        return matchSearch && matchStock;
    });

    renderizarCatalogo(filtrados);
};

// --- Toast Notifications ---
const mostrarToast = (mensaje, tipo = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `
        <span>${tipo === 'success' ? '✅' : '❌'}</span>
        <span>${mensaje}</span>
    `;
    
    container.appendChild(toast);

    setTimeout(() => {
        if(container.contains(toast)) {
            container.removeChild(toast);
        }
    }, 3500);
};
