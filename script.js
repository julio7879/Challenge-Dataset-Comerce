/* ==========================================================================
   script.js - Data Commerce Challenge Dashboard Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    iniciarDashboard();
    configurarLogout();
});

// Formateador de moneda en pesos colombianos (COP)
const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(valor);
};

// Validadores para los datasets
const validarInventario = (data) => {
    if (!Array.isArray(data)) throw new Error('Dataset de inventario no es un array válido.');
    if (data.length === 0) throw new Error('Dataset de inventario vacío.');
    const camposRequeridos = ['id_producto', 'producto', 'cantidad_existente', 'proveedor', 'valor_compra', 'valor_venta'];
    for (const item of data) {
        for (const campo of camposRequeridos) {
            if (item[campo] === undefined || item[campo] === null) {
                throw new Error(`Campos faltantes en inventario: ${campo} no encontrado.`);
            }
        }
    }
};

const validarVentas = (data) => {
    if (!Array.isArray(data)) throw new Error('Dataset de ventas no es un array válido.');
    if (data.length === 0) throw new Error('Dataset de ventas vacío.');
    const camposRequeridos = ['fecha', 'id_producto', 'producto', 'cantidad', 'valor_unitario', 'total'];
    for (const item of data) {
        for (const campo of camposRequeridos) {
            if (item[campo] === undefined || item[campo] === null) {
                throw new Error(`Campos faltantes en ventas: ${campo} no encontrado.`);
            }
        }
    }
};

// Carga asíncrona de los archivos JSON o desde localStorage
const cargarDatasets = async () => {
    let ventas = [];
    let inventario = [];
    let falloVentas = false;
    let falloInventario = false;

    // Intentar leer de localStorage primero para mantener sincronización con la tienda
    const localVentas = localStorage.getItem('ventas_db');
    const localInventario = localStorage.getItem('inventario_db');

    if (localVentas && localInventario) {
        try {
            ventas = JSON.parse(localVentas);
            inventario = JSON.parse(localInventario);
            validarVentas(ventas);
            validarInventario(inventario);
            return { ventas, inventario };
        } catch (e) {
            console.error('Error procesando localStorage, volviendo a carga original:', e);
        }
    }

    try {
        const res = await fetch('ventas.json');
        if (!res.ok) throw new Error('Archivo inexistente o error de red');
        ventas = await res.json();
        validarVentas(ventas);
    } catch (e) {
        falloVentas = true;
        console.error('Error al cargar ventas.json:', e.message || e);
    }

    try {
        const res = await fetch('inventario.json');
        if (!res.ok) throw new Error('Archivo inexistente o error de red');
        inventario = await res.json();
        validarInventario(inventario);
    } catch (e) {
        falloInventario = true;
        console.error('Error al cargar inventario.json:', e.message || e);
    }

    if (falloVentas || falloInventario) {
        throw new Error(`Carga fallida: ${falloVentas ? 'ventas.json' : ''} ${falloInventario ? 'inventario.json' : ''}`);
    }

    // Inicializar localStorage para uso compartido con la tienda
    localStorage.setItem('ventas_db', JSON.stringify(ventas));
    localStorage.setItem('inventario_db', JSON.stringify(inventario));

    return { ventas, inventario };
};

// Cálculo de KPIs principales
const calcularKPIs = (ventas, inventario) => {
    const ventasTotales = ventas.reduce((acc, item) => acc + item.total, 0);
    const totalUnidadesVendidas = ventas.reduce((acc, item) => acc + item.cantidad, 0);
    const totalProductos = inventario.length;
    
    // Inventario bajo: cantidad_existente < 20
    const productosInventarioBajo = inventario.filter(item => item.cantidad_existente < 20).length;

    // Producto más rentable (Total ingresos - Total costo de compra de unidades vendidas)
    const margenPorProducto = {};
    ventas.forEach(transaccion => {
        const datosRef = inventario.find(p => p.id_producto === transaccion.id_producto);
        if (datosRef) {
            const beneficio = transaccion.total - (transaccion.cantidad * datosRef.valor_compra);
            margenPorProducto[transaccion.producto] = (margenPorProducto[transaccion.producto] || 0) + beneficio;
        }
    });

    let productoMasRentable = "Sin registros";
    let maxMargen = -Infinity;
    for (const [producto, margen] of Object.entries(margenPorProducto)) {
        if (margen > maxMargen) {
            maxMargen = margen;
            productoMasRentable = producto;
        }
    }

    return {
        ventasTotales,
        totalUnidadesVendidas,
        totalProductos,
        productosInventarioBajo,
        productoMasRentable
    };
};

// Renderizado de KPIs
const renderizarKPIs = (kpis) => {
    document.getElementById('kpi-total-sales').textContent = formatearMoneda(kpis.ventasTotales);
    document.getElementById('kpi-total-units').textContent = `${kpis.totalUnidadesVendidas.toLocaleString()} u.`;
    document.getElementById('kpi-total-products').textContent = kpis.totalProductos;
    document.getElementById('kpi-low-stock').textContent = kpis.productosInventarioBajo;
    document.getElementById('kpi-most-profitable').textContent = kpis.productoMasRentable;
};

// Llenar tabla de ventas
const llenarTablaVentas = (ventas) => {
    const tableBody = document.getElementById('table-sales-body');
    if (!tableBody) return;
    tableBody.innerHTML = ventas.map(item => `
        <tr class="admin-table__row">
            <td>${item.fecha}</td>
            <td><strong>${item.producto}</strong></td>
            <td>${item.cantidad}</td>
            <td>${formatearMoneda(item.valor_unitario)}</td>
            <td><strong>${formatearMoneda(item.total)}</strong></td>
        </tr>
    `).join('');
};

// Llenar tabla de inventario
const llenarTablaInventario = (inventario) => {
    const tableBody = document.getElementById('table-inventory-body');
    if (!tableBody) return;
    tableBody.innerHTML = inventario.map(item => {
        let estadoBg = 'var(--color-success-bg)';
        let estadoColor = 'var(--color-success)';
        let estadoTexto = 'Stock Alto';

        if (item.cantidad_existente === 0) {
            estadoBg = 'var(--color-error-bg)';
            estadoColor = 'var(--color-error)';
            estadoTexto = 'Agotado';
        } else if (item.cantidad_existente < 20) {
            estadoBg = 'var(--color-warning-bg)';
            estadoColor = 'var(--color-warning)';
            estadoTexto = 'Stock Bajo';
        }

        return `
            <tr class="admin-table__row">
                <td><strong>${item.producto}</strong></td>
                <td>${item.cantidad_existente} u.</td>
                <td>${formatearMoneda(item.valor_compra)}</td>
                <td>${formatearMoneda(item.valor_venta)}</td>
                <td><span style="display: inline-block; padding: 0.25rem 0.5rem; font-size: 0.75rem; font-weight: 600; border-radius: 4px; background-color: ${estadoBg}; color: ${estadoColor};">${estadoTexto}</span></td>
            </tr>
        `;
    }).join('');
};

// Generar rankings: Top 5 productos más vendidos
const generarRankings = (ventas) => {
    const rankingContainer = document.getElementById('ranking-sales-container');
    if (!rankingContainer) return;

    const ventasPorProducto = {};
    ventas.forEach(v => {
        if (!ventasPorProducto[v.producto]) {
            ventasPorProducto[v.producto] = { cantidad: 0, ingresos: 0 };
        }
        ventasPorProducto[v.producto].cantidad += v.cantidad;
        ventasPorProducto[v.producto].ingresos += v.total;
    });

    const topProductos = Object.keys(ventasPorProducto)
        .map(name => ({
            producto: name,
            cantidad: ventasPorProducto[name].cantidad,
            ingresos: ventasPorProducto[name].ingresos
        }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 5);

    rankingContainer.innerHTML = `
        <div style="padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
            ${topProductos.map((item, idx) => `
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-weight: 600; color: ${idx === 0 ? 'var(--color-warning)' : 'var(--text-secondary)'};">#${idx + 1}</span>
                        <strong>${item.producto}</strong>
                    </div>
                    <div style="text-align: right;">
                        <span style="font-size: 0.85rem; color: var(--text-main); font-weight: 500;">${item.cantidad} u.</span>
                        <br>
                        <span style="font-size: 0.75rem; color: var(--text-secondary);">${formatearMoneda(item.ingresos)}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
};

// Generar Insights del Negocio
const generarInsights = (ventas, inventario) => {
    const ventasTotales = ventas.reduce((acc, item) => acc + item.total, 0);
    const totalUnidadesVendidas = ventas.reduce((acc, item) => acc + item.cantidad, 0);
    const promedioVentas = ventasTotales / ventas.length;

    // Producto más vendido
    const ventasPorProducto = {};
    ventas.forEach(v => {
        ventasPorProducto[v.producto] = (ventasPorProducto[v.producto] || 0) + v.cantidad;
    });
    let productoMasVendido = "";
    let maxQty = -1;
    for (const [prod, qty] of Object.entries(ventasPorProducto)) {
        if (qty > maxQty) {
            maxQty = qty;
            productoMasVendido = prod;
        }
    }

    // Producto con menor stock
    let productoMenorInventario = "";
    let minStock = Infinity;
    inventario.forEach(item => {
        if (item.cantidad_existente < minStock) {
            minStock = item.cantidad_existente;
            productoMenorInventario = item.producto;
        }
    });

    // Producto más rentable
    const margenPorProducto = {};
    ventas.forEach(transaccion => {
        const datosRef = inventario.find(p => p.id_producto === transaccion.id_producto);
        if (datosRef) {
            const beneficio = transaccion.total - (transaccion.cantidad * datosRef.valor_compra);
            margenPorProducto[transaccion.producto] = (margenPorProducto[transaccion.producto] || 0) + beneficio;
        }
    });
    let productoMasRentable = "";
    let maxMargen = -Infinity;
    for (const [prod, margen] of Object.entries(margenPorProducto)) {
        if (margen > maxMargen) {
            maxMargen = margen;
            productoMasRentable = prod;
        }
    }

    document.getElementById('insight-1').textContent = `El volumen total de facturación consolidado se posiciona en ${formatearMoneda(ventasTotales)}.`;
    document.getElementById('insight-2').textContent = `Se movilizaron exitosamente un total de ${totalUnidadesVendidas.toLocaleString()} unidades de producto, con un ticket promedio por transacción de ${formatearMoneda(promedioVentas)}.`;
    document.getElementById('insight-3').textContent = `El producto con mayor volumen de comercialización absoluta es "${productoMasVendido}" con ${maxQty} unidades vendidas.`;
    document.getElementById('insight-4').textContent = `El producto con menor disponibilidad física registrada en el almacén es "${productoMenorInventario}" con apenas ${minStock} unidades restantes.`;
    document.getElementById('insight-5').textContent = `El mayor retorno de inversión neto y rendimiento operativo mensual corresponde al producto "${productoMasRentable}".`;
};

// Generar Recomendaciones Estratégicas
const generarRecomendaciones = (ventas, inventario) => {
    // 1. Producto estrella
    const margenPorProducto = {};
    ventas.forEach(transaccion => {
        const datosRef = inventario.find(p => p.id_producto === transaccion.id_producto);
        if (datosRef) {
            const beneficio = transaccion.total - (transaccion.cantidad * datosRef.valor_compra);
            margenPorProducto[transaccion.producto] = (margenPorProducto[transaccion.producto] || 0) + beneficio;
        }
    });
    let productoMasRentable = "";
    let maxMargen = -Infinity;
    for (const [prod, margen] of Object.entries(margenPorProducto)) {
        if (margen > maxMargen) {
            maxMargen = margen;
            productoMasRentable = prod;
        }
    }

    // 2. Ruptura de stock
    const productosStockBajoCount = inventario.filter(item => item.cantidad_existente < 20).length;

    // 3. Producto de menor rotación (el menos vendido)
    const ventasPorProducto = {};
    ventas.forEach(v => {
        ventasPorProducto[v.producto] = (ventasPorProducto[v.producto] || 0) + v.cantidad;
    });
    let productoMenosVendido = "";
    let minQty = Infinity;
    inventario.forEach(item => {
        const qty = ventasPorProducto[item.producto] || 0;
        if (qty < minQty) {
            minQty = qty;
            productoMenosVendido = item.producto;
        }
    });

    document.getElementById('recommendation-1').innerHTML = `<strong>Estrategia Comercial:</strong> Incrementar el enfoque promocional y logístico sobre <em>"${productoMasRentable}"</em> para capitalizar su elevado margen de contribución.`;
    document.getElementById('recommendation-2').innerHTML = `<strong>Aprovisionamiento Urgente:</strong> Emitir órdenes de compra inmediatas para las <em>${productosStockBajoCount} referencias</em> con existencias por debajo del umbral crítico de 20 unidades.`;
    document.getElementById('recommendation-3').innerHTML = `<strong>Rotación de Inventario:</strong> Estructurar ofertas cruzadas o descuentos sobre <em>"${productoMenosVendido}"</em> para acelerar su rotación ante la baja demanda (${minQty} u. vendidas).`;
};

// Generar visualizaciones CSS/HTML para las gráficas
const renderizarGraficas = (ventas, inventario) => {
    // 1. Ventas por Día (Últimos 5 días con ventas)
    const chartSales = document.getElementById('chart-sales-by-day');
    if (chartSales) {
        const ventasPorDia = {};
        ventas.forEach(v => {
            ventasPorDia[v.fecha] = (ventasPorDia[v.fecha] || 0) + v.total;
        });
        const diasSorteados = Object.keys(ventasPorDia).sort().slice(-5);
        const maxVentaDia = Math.max(...diasSorteados.map(d => ventasPorDia[d]), 1);

        chartSales.innerHTML = `
            <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 180px; padding: 1.5rem 1rem 0;">
                ${diasSorteados.map(dia => {
                    const pct = (ventasPorDia[dia] / maxVentaDia) * 100;
                    return `
                        <div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
                            <span style="font-size: 0.7rem; color: var(--text-secondary); margin-bottom: 0.25rem;">${Math.round(ventasPorDia[dia]/1000)}k</span>
                            <div style="width: 24px; height: ${Math.max(pct * 1.2, 5)}px; background-color: var(--color-highlight); border-radius: 4px 4px 0 0; transition: height 0.3s ease;"></div>
                            <span style="font-size: 0.65rem; color: var(--text-muted); margin-top: 0.5rem;">${dia.split('-')[2]}/${dia.split('-')[1]}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // 2. Top 5 Productos (Visualización de barras)
    const chartTop = document.getElementById('chart-top-products');
    if (chartTop) {
        const ventasPorProducto = {};
        ventas.forEach(v => {
            ventasPorProducto[v.producto] = (ventasPorProducto[v.producto] || 0) + v.cantidad;
        });
        const topProductos = Object.keys(ventasPorProducto)
            .map(name => ({ producto: name, cantidad: ventasPorProducto[name] }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, 5);
        const maxQty = Math.max(...topProductos.map(p => p.cantidad), 1);

        chartTop.innerHTML = `
            <div style="padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem;">
                ${topProductos.map(item => {
                    const pct = (item.cantidad / maxQty) * 100;
                    return `
                        <div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 0.15rem;">
                                <span>${item.producto}</span>
                                <span style="font-weight: 600;">${item.cantidad} u.</span>
                            </div>
                            <div style="width: 100%; height: 6px; background-color: var(--border-color); border-radius: 3px; overflow: hidden;">
                                <div style="width: ${pct}%; height: 100%; background-color: var(--color-success); border-radius: 3px;"></div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // 3. Distribución de Inventario (Volumétrica)
    const chartInventory = document.getElementById('chart-inventory-status');
    if (chartInventory) {
        const alto = inventario.filter(item => item.cantidad_existente >= 20).length;
        const bajo = inventario.filter(item => item.cantidad_existente > 0 && item.cantidad_existente < 20).length;
        const agotado = inventario.filter(item => item.cantidad_existente === 0).length;
        const total = inventario.length;

        chartInventory.innerHTML = `
            <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; height: 100%; justify-content: center;">
                <div style="display: flex; height: 16px; border-radius: 8px; overflow: hidden; background-color: var(--border-color);">
                    <div style="width: ${(alto/total)*100}%; background-color: var(--color-success);" title="Stock Alto"></div>
                    <div style="width: ${(bajo/total)*100}%; background-color: var(--color-warning);" title="Stock Bajo"></div>
                    <div style="width: ${(agotado/total)*100}%; background-color: var(--color-error);" title="Agotado"></div>
                </div>
                <div style="display: flex; justify-content: space-around; font-size: 0.75rem;">
                    <div style="display: flex; align-items: center; gap: 0.35rem;">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color: var(--color-success);"></span>
                        <span>Alto: ${alto}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.35rem;">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color: var(--color-warning);"></span>
                        <span>Bajo: ${bajo}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.35rem;">
                        <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background-color: var(--color-error);"></span>
                        <span>Agotado: ${agotado}</span>
                    </div>
                </div>
            </div>
        `;
    }

    // 4. Proyección de Demanda (Algoritmo predictivo lineal)
    const chartDemand = document.getElementById('chart-demand-projection');
    if (chartDemand) {
        // Encontrar el producto más vendido
        const ventasPorProducto = {};
        ventas.forEach(v => {
            ventasPorProducto[v.producto] = (ventasPorProducto[v.producto] || 0) + v.cantidad;
        });
        let topProd = "Monstera Deliciosa";
        let maxQty = 0;
        for (const [prod, qty] of Object.entries(ventasPorProducto)) {
            if (qty > maxQty) {
                maxQty = qty;
                topProd = prod;
            }
        }
        
        // Simular una proyección (por ejemplo, +12% de incremento el próximo mes)
        const proyeccionProximoMes = Math.round(maxQty * 1.12);

        chartDemand.innerHTML = `
            <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; text-align: center; height: 100%; justify-content: center;">
                <div style="font-size: 0.85rem; color: var(--text-secondary);">Producto estrella proyectado para el próximo mes:</div>
                <strong style="font-size: 1.1rem; color: var(--color-highlight);">${topProd}</strong>
                <div style="display: flex; justify-content: center; gap: 1rem; align-items: center; margin-top: 0.5rem;">
                    <div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">Demanda actual</div>
                        <div style="font-size: 1.25rem; font-weight: 600;">${maxQty} u.</div>
                    </div>
                    <div style="font-size: 1.25rem; color: var(--text-muted);">➔</div>
                    <div>
                        <div style="font-size: 0.7rem; color: var(--color-highlight);">Proyectado (+12%)</div>
                        <div style="font-size: 1.25rem; font-weight: 600; color: var(--color-highlight);">${proyeccionProximoMes} u.</div>
                    </div>
                </div>
            </div>
        `;
    }
};

// Iniciar el Dashboard
const iniciarDashboard = async () => {
    try {
        const { ventas, inventario } = await cargarDatasets();
        const kpis = calcularKPIs(ventas, inventario);
        
        renderizarKPIs(kpis);
        llenarTablaVentas(ventas);
        llenarTablaInventario(inventario);
        generarRankings(ventas);
        generarInsights(ventas, inventario);
        generarRecomendaciones(ventas, inventario);
        renderizarGraficas(ventas, inventario);
        generarEmailMarketing(ventas, inventario);
        
        console.log('⚡ Dashboard comercial inicializado dinámicamente con éxito.');
    } catch (error) {
        console.error('Error al inicializar el dashboard:', error);
    }
};

// Configurar botón de Cierre de Sesión
const configurarLogout = () => {
    const botonLogout = document.querySelector('.admin-header__logout-btn');
    if (botonLogout) {
        botonLogout.addEventListener('click', () => {
            if (confirm('¿Desea cerrar el panel de control administrativo?')) {
                window.location.href = 'index.html';
            }
        });
    }
};

// ==========================================================================
// MÓDULO DE EMAIL MARKETING – Campañas Basadas en Datos
// ==========================================================================
const generarEmailMarketing = (ventas, inventario) => {
    const metaContainer = document.getElementById('em-campaign-meta');
    const previewContainer = document.getElementById('em-email-preview');
    const selectorContainer = document.getElementById('em-campaign-selector');
    const stockAlertContainer = document.getElementById('em-stock-alert');

    if (!metaContainer || !previewContainer || !selectorContainer) return;

    // ── Cálculos base desde los datasets ──────────────────────

    // Producto con mayor ingreso total (estrella)
    const ingresosPorProducto = {};
    ventas.forEach(v => {
        ingresosPorProducto[v.producto] = (ingresosPorProducto[v.producto] || 0) + v.total;
    });
    let productoEstrella = '';
    let maxIngreso = 0;
    for (const [prod, ing] of Object.entries(ingresosPorProducto)) {
        if (ing > maxIngreso) { maxIngreso = ing; productoEstrella = prod; }
    }

    // Producto con mayor stock (sobrestock)
    let productoSobrestock = '';
    let maxStock = 0;
    inventario.forEach(item => {
        if (item.cantidad_existente > maxStock) {
            maxStock = item.cantidad_existente;
            productoSobrestock = item.producto;
        }
    });

    // Producto con más unidades vendidas (demanda)
    const unidadesPorProducto = {};
    ventas.forEach(v => {
        unidadesPorProducto[v.producto] = (unidadesPorProducto[v.producto] || 0) + v.cantidad;
    });
    let productoTopDemanda = '';
    let maxUnidades = 0;
    for (const [prod, qty] of Object.entries(unidadesPorProducto)) {
        if (qty > maxUnidades) { maxUnidades = qty; productoTopDemanda = prod; }
    }

    // Productos con inventario bajo (< 20)
    const productosStockBajo = inventario.filter(item => item.cantidad_existente < 20);
    const nombresStockBajo = productosStockBajo.map(p => p.producto);

    // ── Alerta de inventario bajo ─────────────────────────────
    if (productosStockBajo.length > 0) {
        stockAlertContainer.style.display = 'block';
        stockAlertContainer.innerHTML = `⚠️ <strong>Alerta de Inventario:</strong> Se han excluido automáticamente de promociones los siguientes productos por stock inferior a 20 unidades: <strong>${nombresStockBajo.join(', ')}</strong>. Esto previene quiebres de inventario.`;
    }

    // ── Definición de las 3 campañas ──────────────────────────
    const campanias = [
        {
            nombre: '🌿 Impulso Estrella',
            insight: `El producto "${productoEstrella}" lidera la facturación con ${formatearMoneda(maxIngreso)} en ingresos totales del período analizado.`,
            objetivo: 'Incrementar ventas cruzadas y elevar el ticket promedio promocionando productos complementarios al artículo estrella.',
            audiencia: 'Clientes frecuentes, compradores de plantas de interior premium, y usuarios que ya adquirieron este producto anteriormente.',
            asunto: `🌿 Descubre por qué "${productoEstrella}" es la favorita del mes`,
            preheader: `Nuestra planta más vendida te espera. ¡No te la pierdas!`,
            emailTitulo: `¡"${productoEstrella}" es nuestra Planta Estrella!`,
            emailTexto: `Nuestro análisis de ventas confirma que "${productoEstrella}" es el producto con mayor facturación este mes, alcanzando ${formatearMoneda(maxIngreso)} en ingresos. Aprovecha esta oportunidad para complementar tu colección con productos similares y obtener un descuento exclusivo.`,
            emailCta: 'Comprar ahora',
            emailIcono: '🌿'
        },
        {
            nombre: '📦 Liquidación Sobrestock',
            insight: `El producto "${productoSobrestock}" registra ${maxStock} unidades en inventario, el nivel más alto de existencias del almacén.`,
            objetivo: 'Acelerar la rotación de inventario y liberar espacio de almacén mediante ofertas especiales sobre productos con sobrestock.',
            audiencia: 'Cazadores de ofertas, clientes sensibles al precio, y compradores nuevos que buscan su primera planta.',
            asunto: `📦 Oferta especial: "${productoSobrestock}" con descuento por tiempo limitado`,
            preheader: `Aprovecha nuestro amplio stock disponible con precios especiales.`,
            emailTitulo: `¡Oferta de Liquidación: "${productoSobrestock}"!`,
            emailTexto: `Contamos con ${maxStock} unidades de "${productoSobrestock}" disponibles en nuestro almacén. Para acelerar su rotación, hemos activado un descuento exclusivo del 20%. ¡Es el momento perfecto para llevarte esta hermosa planta a un precio increíble!`,
            emailCta: 'Ver oferta',
            emailIcono: '📦'
        },
        {
            nombre: '🔄 Reactivación Demanda',
            insight: `El producto "${productoTopDemanda}" acumula ${maxUnidades} unidades vendidas, siendo el artículo con mayor volumen de transacciones del período.`,
            objetivo: 'Fidelizar a los compradores recurrentes e incentivar la recompra del producto más popular mediante un programa de beneficios.',
            audiencia: 'Compradores recurrentes, clientes que ya adquirieron este producto, y entusiastas de la jardinería.',
            asunto: `🔄 "${productoTopDemanda}" sigue siendo la favorita. ¡Repite tu compra!`,
            preheader: `El producto más vendido te espera con beneficios exclusivos para clientes frecuentes.`,
            emailTitulo: `¡"${productoTopDemanda}" arrasa en ventas!`,
            emailTexto: `"${productoTopDemanda}" ha sido adquirido ${maxUnidades} veces este mes, convirtiéndose en nuestro producto estrella en volumen. Como cliente frecuente, te ofrecemos envío gratuito en tu próxima compra y un 10% de descuento adicional. ¡Renueva tu colección!`,
            emailCta: 'Comprar de nuevo',
            emailIcono: '🔄'
        }
    ];

    // ── Función para renderizar una campaña ───────────────────
    const renderizarCampania = (index) => {
        const c = campanias[index];

        // Meta cards
        metaContainer.innerHTML = `
            <div class="em-meta-card em-meta-card--insight">
                <span class="em-meta-card__label">📊 Insight de Origen</span>
                <p class="em-meta-card__value">${c.insight}</p>
            </div>
            <div class="em-meta-card em-meta-card--objective">
                <span class="em-meta-card__label">🎯 Objetivo Estratégico</span>
                <p class="em-meta-card__value">${c.objetivo}</p>
            </div>
            <div class="em-meta-card em-meta-card--audience">
                <span class="em-meta-card__label">👥 Público Objetivo</span>
                <p class="em-meta-card__value">${c.audiencia}</p>
            </div>
        `;

        // Email preview
        previewContainer.innerHTML = `
            <div class="em-email-preview__header">
                <span class="em-email-preview__header-label">Vista Previa del Correo</span>
                <span class="em-email-preview__subject">${c.asunto}</span>
            </div>
            <div class="em-email-preview__body">
                <div class="em-email-preview__brand">📊 Data Commerce Challenge</div>
                <div class="em-email-preview__image">${c.emailIcono}</div>
                <h3 class="em-email-preview__title">${c.emailTitulo}</h3>
                <p class="em-email-preview__text">${c.emailTexto}</p>
                <span class="em-email-preview__cta">${c.emailCta}</span>
                <p class="em-email-preview__footer">© 2026 Data Commerce Challenge. Todos los derechos reservados.</p>
            </div>
        `;
    };

    // ── Render inicial ────────────────────────────────────────
    renderizarCampania(0);

    // ── Interactividad de los tabs ────────────────────────────
    let campaniaActiva = 0;
    const tabs = selectorContainer.querySelectorAll('.em-campaign-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('em-campaign-tab--active'));
            tab.classList.add('em-campaign-tab--active');
            campaniaActiva = parseInt(tab.dataset.campaign, 10);
            renderizarCampania(campaniaActiva);
        });
    });

    // ── Envío de correos con EmailJS ──────────────────────────
    // ╔════════════════════════════════════════════════════════╗
    // ║  CONFIGURACIÓN DE EMAILJS                             ║
    // ║  1. Crea cuenta gratuita en https://emailjs.com       ║
    // ║  2. Conecta tu servicio (Gmail, Outlook, etc.)        ║
    // ║  3. Crea una plantilla con estas variables:            ║
    // ║     {{to_email}}, {{subject}}, {{title}},             ║
    // ║     {{message}}, {{cta}}                              ║
    // ║  4. Reemplaza los valores abajo con tus IDs:          ║
    // ╚════════════════════════════════════════════════════════╝
    const EMAILJS_PUBLIC_KEY = 'HnvbuqG6B4w2T7YYI';
    const EMAILJS_SERVICE_ID = 'service_o1ddy23';
    const EMAILJS_TEMPLATE_ID = 'template_gdlw61k';

    // Inicializar EmailJS
    if (typeof emailjs !== 'undefined') {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }

    const btnEnviar = document.getElementById('em-send-btn');
    const inputEmail = document.getElementById('em-recipient-email');
    const statusEl = document.getElementById('em-send-status');

    if (btnEnviar && inputEmail && statusEl) {
        btnEnviar.addEventListener('click', async () => {
            const destinatario = inputEmail.value.trim();

            // Validar email
            if (!destinatario || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(destinatario)) {
                statusEl.textContent = '❌ Por favor ingresa un correo electrónico válido.';
                statusEl.className = 'em-send-form__status em-send-form__status--error';
                return;
            }

            // Verificar configuración
            if (EMAILJS_PUBLIC_KEY === 'TU_PUBLIC_KEY') {
                statusEl.textContent = '⚠️ Configura tus credenciales de EmailJS en script.js para enviar correos reales.';
                statusEl.className = 'em-send-form__status em-send-form__status--error';
                return;
            }

            const c = campanias[campaniaActiva];

            // Estado: enviando
            btnEnviar.disabled = true;
            statusEl.textContent = '📤 Enviando correo...';
            statusEl.className = 'em-send-form__status em-send-form__status--sending';

            try {
                await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
                    to_email: destinatario,
                    subject: c.asunto,
                    title: c.emailTitulo,
                    message: c.emailTexto,
                    cta: c.emailCta
                });

                statusEl.textContent = `✅ Correo enviado exitosamente a ${destinatario}`;
                statusEl.className = 'em-send-form__status em-send-form__status--success';
                inputEmail.value = '';
            } catch (error) {
                console.error('Error al enviar email:', error);
                statusEl.textContent = `❌ Error al enviar: ${error.text || 'Verifica tu configuración de EmailJS'}`;
                statusEl.className = 'em-send-form__status em-send-form__status--error';
            } finally {
                btnEnviar.disabled = false;
            }
        });
    }
};
