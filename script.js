/**
 * Arquitectura JavaScript para Fred Motos - Cotizador a PDF.
 */

// ==========================================
// 1. ESTADO GLOBAL
// ==========================================
let productos = [];
let idContador = 1;

let configuracionDescuento = {
    tipo: 'ninguno',
    valor: 0
};

// ==========================================
// 2. ELEMENTOS DEL DOM
// ==========================================
const DOM = {
    motoModelo: document.getElementById('moto-modelo'),
    textoProductos: document.getElementById('texto-productos'),
    btnProcesar: document.getElementById('btn-procesar'),
    btnLimpiarTexto: document.getElementById('btn-limpiar-texto'),

    cuerpoTabla: document.getElementById('cuerpo-tabla'),
    btnAgregar: document.getElementById('btn-agregar'),
    mensajeVacio: document.getElementById('mensaje-vacio'),

    tipoDescuento: document.getElementById('tipo-descuento'),
    valorDescuento: document.getElementById('valor-descuento'),

    resumenSubtotal: document.getElementById('resumen-subtotal'),
    resumenDescuento: document.getElementById('resumen-descuento'),
    resumenTotal: document.getElementById('resumen-total'),
    filaDescuento: document.getElementById('fila-descuento'),
    labelDescuento: document.getElementById('label-descuento'),

    btnImprimirCompleto: document.getElementById('btn-imprimir-completo'),
    btnImprimirSinTotal: document.getElementById('btn-imprimir-sintotal'),
    fechaCotizacion: document.getElementById('cliente-fecha'),
    printMotoInfo: document.getElementById('print-moto-info'),
    printMotoText: document.getElementById('print-moto-text')
};

// ==========================================
// 3. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const hoy = new Date();
    DOM.fechaCotizacion.value = hoy.toISOString().split('T')[0];

    configurarEventos();
    actualizarVistaTabla();
});

// ==========================================
// 4. EVENTOS
// ==========================================
function configurarEventos() {
    DOM.btnProcesar.addEventListener('click', procesarTextoProductos);
    DOM.btnLimpiarTexto.addEventListener('click', () => { DOM.textoProductos.value = ''; });
    DOM.btnAgregar.addEventListener('click', () => agregarProducto("Nuevo Repuesto"));

    DOM.cuerpoTabla.addEventListener('input', manejarEdicionTabla);
    DOM.cuerpoTabla.addEventListener('change', manejarCambiosTabla);
    DOM.cuerpoTabla.addEventListener('click', manejarBotonesTabla);

    DOM.tipoDescuento.addEventListener('change', manejarCambioTipoDescuento);
    DOM.valorDescuento.addEventListener('input', manejarInputDescuento);
    DOM.valorDescuento.addEventListener('change', (e) => {
        if (configuracionDescuento.tipo === 'fijo') {
            const valorRedondeado = redondearMiles(limpiarNumeroMoneda(e.target.value));
            configuracionDescuento.valor = valorRedondeado;
            e.target.value = formatearMoneda(valorRedondeado);
            calcularTotales();
        }
    });

    DOM.btnImprimirCompleto.addEventListener('click', imprimirCompleto);
    DOM.btnImprimirSinTotal.addEventListener('click', imprimirSinTotal);
}

// ==========================================
// 5. LÓGICA DE NEGOCIO Y REDONDEO
// ==========================================
function redondearMiles(valor) {
    if (isNaN(valor) || valor === 0) return 0;
    return Math.round(valor / 1000) * 1000;
}

function procesarTextoProductos() {
    const texto = DOM.textoProductos.value;
    if (!texto.trim()) return;

    const nombresExtraidos = texto.split(/[\n,]+/)
        .map(nombre => nombre.trim())
        .filter(nombre => nombre !== "");

    nombresExtraidos.forEach(nombre => agregarProducto(nombre));
    DOM.textoProductos.value = '';
}

function agregarProducto(nombre) {
    productos.push({
        id: idContador++,
        nombre: nombre,
        cantidad: 1,
        precioOriginal: 0,
        precioGenerico: 0,
        tipo: 'original',
        aplicaDescuento: true
    });
    actualizarVistaTabla();
}

function eliminarProducto(id) {
    if (confirm("¿Quitar este repuesto?")) {
        productos = productos.filter(p => p.id !== id);
        actualizarVistaTabla();
    }
}

function actualizarProductoDesdeDOM(id, campo, valorCrudo, aplicarRedondeo = false) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;

    if (campo === 'nombre') producto.nombre = valorCrudo;
    if (campo === 'cantidad') producto.cantidad = parseInt(valorCrudo) || 1;
    if (campo === 'tipo') producto.tipo = valorCrudo;
    if (campo === 'aplicaDescuento') producto.aplicaDescuento = valorCrudo;

    if (campo === 'precioOriginal' || campo === 'precioGenerico') {
        let numero = limpiarNumeroMoneda(valorCrudo);
        if (aplicarRedondeo) numero = redondearMiles(numero);
        producto[campo] = numero;
    }

    actualizarFilaDOM(producto);
    calcularTotales();
}

// ==========================================
// 6. RENDERIZADO DEL DOM
// ==========================================
function actualizarVistaTabla() {
    DOM.cuerpoTabla.innerHTML = '';

    if (productos.length === 0) {
        DOM.mensajeVacio.style.display = 'block';
        DOM.cuerpoTabla.parentElement.style.display = 'none';
        calcularTotales();
        return;
    }

    DOM.mensajeVacio.style.display = 'none';
    DOM.cuerpoTabla.parentElement.style.display = 'table';

    productos.forEach((producto, index) => {
        const tr = document.createElement('tr');
        tr.dataset.id = producto.id;
        const precio = producto.tipo === 'original' ? producto.precioOriginal : producto.precioGenerico;

        // Se agregan "class='col-tipo'" y "class='col-subtotal'" a los td respectivos
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><input type="text" class="edit-nombre" value="${producto.nombre}"></td>
            <td><input type="number" class="edit-cantidad" value="${producto.cantidad}" min="1"></td>
            <td><input type="text" class="edit-precio-orig precio-input" value="${formatearMoneda(producto.precioOriginal)}"></td>
            <td><input type="text" class="edit-precio-gen precio-input" value="${formatearMoneda(producto.precioGenerico)}"></td>
            
            <td class="col-tipo">
                <select class="edit-tipo">
                    <option value="original" ${producto.tipo === 'original' ? 'selected' : ''}>Original</option>
                    <option value="generico" ${producto.tipo === 'generico' ? 'selected' : ''}>Genérico</option>
                </select>
            </td>
            
            <td class="cell-subtotal col-subtotal" id="subtotal-${producto.id}">${formatearMoneda(precio * producto.cantidad)}</td>
            
            <td class="no-print text-center">
                <input type="checkbox" class="edit-aplica-desc" title="¿Aplicar descuento?" ${producto.aplicaDescuento ? 'checked' : ''}>
            </td>
            
            <td class="no-print"><button class="btn btn-danger btn-eliminar">X</button></td>
        `;
        DOM.cuerpoTabla.appendChild(tr);
    });
    calcularTotales();
}

function actualizarFilaDOM(producto) {
    const precio = producto.tipo === 'original' ? producto.precioOriginal : producto.precioGenerico;
    const celda = document.getElementById(`subtotal-${producto.id}`);
    if (celda) celda.textContent = formatearMoneda(precio * producto.cantidad);
}

// ==========================================
// 7. EVENTOS DE LA TABLA
// ==========================================
function manejarEdicionTabla(e) {
    const target = e.target;
    const fila = target.closest('tr');
    if (!fila) return;
    const id = parseInt(fila.dataset.id);

    if (target.classList.contains('edit-nombre')) actualizarProductoDesdeDOM(id, 'nombre', target.value);
    if (target.classList.contains('edit-cantidad')) actualizarProductoDesdeDOM(id, 'cantidad', target.value);
    if (target.classList.contains('edit-tipo')) actualizarProductoDesdeDOM(id, 'tipo', target.value);

    if (target.classList.contains('precio-input')) {
        const valorLimpio = limpiarNumeroMoneda(target.value);
        if (target.classList.contains('edit-precio-orig')) actualizarProductoDesdeDOM(id, 'precioOriginal', valorLimpio, false);
        if (target.classList.contains('edit-precio-gen')) actualizarProductoDesdeDOM(id, 'precioGenerico', valorLimpio, false);
    }
}

function manejarCambiosTabla(e) {
    const target = e.target;
    const fila = target.closest('tr');
    if (!fila) return;
    const id = parseInt(fila.dataset.id);

    if (target.classList.contains('edit-aplica-desc')) {
        actualizarProductoDesdeDOM(id, 'aplicaDescuento', target.checked);
    }

    if (target.classList.contains('precio-input')) {
        const valorCrudo = target.value;
        if (target.classList.contains('edit-precio-orig')) {
            actualizarProductoDesdeDOM(id, 'precioOriginal', valorCrudo, true);
            const prod = productos.find(p => p.id === id);
            target.value = formatearMoneda(prod.precioOriginal);
        }
        if (target.classList.contains('edit-precio-gen')) {
            actualizarProductoDesdeDOM(id, 'precioGenerico', valorCrudo, true);
            const prod = productos.find(p => p.id === id);
            target.value = formatearMoneda(prod.precioGenerico);
        }
    }
}

function manejarBotonesTabla(e) {
    if (e.target.classList.contains('btn-eliminar')) {
        eliminarProducto(parseInt(e.target.closest('tr').dataset.id));
    }
}

// ==========================================
// 8. CÁLCULOS Y DESCUENTOS
// ==========================================
function manejarCambioTipoDescuento() {
    configuracionDescuento.tipo = DOM.tipoDescuento.value;
    if (configuracionDescuento.tipo === 'ninguno') {
        DOM.valorDescuento.disabled = true;
        DOM.valorDescuento.value = '';
        configuracionDescuento.valor = 0;
    } else {
        DOM.valorDescuento.disabled = false;
        DOM.valorDescuento.value = '';
    }
    calcularTotales();
}

function manejarInputDescuento(e) {
    if (configuracionDescuento.tipo === 'porcentaje') {
        let valor = parseFloat(e.target.value) || 0;
        configuracionDescuento.valor = valor > 100 ? 100 : valor;
    } else {
        configuracionDescuento.valor = limpiarNumeroMoneda(e.target.value);
    }
    calcularTotales();
}

function calcularTotales() {
    let subtotalGeneral = 0;
    let subtotalSujetoADescuento = 0;

    productos.forEach(p => {
        const precio = (p.tipo === 'original' ? p.precioOriginal : p.precioGenerico);
        const subtotalProducto = precio * p.cantidad;

        subtotalGeneral += subtotalProducto;

        if (p.aplicaDescuento) {
            subtotalSujetoADescuento += subtotalProducto;
        }
    });

    let descuento = 0;
    if (configuracionDescuento.tipo === 'porcentaje') {
        descuento = redondearMiles(subtotalSujetoADescuento * (configuracionDescuento.valor / 100));
        DOM.labelDescuento.textContent = `${configuracionDescuento.valor}%`;
    } else if (configuracionDescuento.tipo === 'fijo') {
        descuento = configuracionDescuento.valor;
        if (descuento > subtotalSujetoADescuento) descuento = subtotalSujetoADescuento;
        DOM.labelDescuento.textContent = 'Fijo';
    }

    DOM.resumenSubtotal.textContent = formatearMoneda(subtotalGeneral);
    if (descuento > 0) {
        DOM.filaDescuento.style.display = 'flex';
        DOM.resumenDescuento.textContent = `-${formatearMoneda(descuento)}`;
    } else {
        DOM.filaDescuento.style.display = 'none';
    }
    DOM.resumenTotal.textContent = formatearMoneda(subtotalGeneral - descuento);
}

function formatearMoneda(valor) {
    if (isNaN(valor) || valor === 0) return "$ 0";
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor).replace(/\s/g, ' ');
}

function limpiarNumeroMoneda(texto) {
    if (typeof texto === 'number') return texto;
    return parseInt(texto.replace(/[^0-9]/g, '')) || 0;
}

// ==========================================
// 9. IMPRESIÓN (PDF)
// ==========================================
function prepararDatosParaImprimir() {
    const motoValue = DOM.motoModelo.value.trim();
    if (motoValue) {
        DOM.printMotoText.textContent = motoValue;
        DOM.printMotoInfo.style.display = 'block';
    } else {
        DOM.printMotoInfo.style.display = 'none';
    }
}

function imprimirCompleto() {
    prepararDatosParaImprimir();
    document.body.classList.remove('print-sin-total');
    window.print();
}

function imprimirSinTotal() {
    prepararDatosParaImprimir();
    document.body.classList.add('print-sin-total');

    window.print();

    setTimeout(() => {
        document.body.classList.remove('print-sin-total');
    }, 500);
}